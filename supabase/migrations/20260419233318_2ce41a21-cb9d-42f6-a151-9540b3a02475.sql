-- 1. PACOTES DE CRÉDITOS
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  price_mt INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packages viewable by authenticated"
ON public.credit_packages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage packages"
ON public.credit_packages FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.credit_packages (id, name, credits, bonus_credits, price_mt, sort_order) VALUES
  ('pack_5', '5 Créditos', 5, 0, 10, 1),
  ('pack_10', '10 Créditos +1 Bónus', 10, 1, 20, 2),
  ('pack_20', '20 Créditos', 20, 0, 35, 3),
  ('pack_25', '25 Créditos', 25, 0, 40, 4)
ON CONFLICT (id) DO NOTHING;

-- 2. PAGAMENTOS: aceitar package_id
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS package_id TEXT REFERENCES public.credit_packages(id);
ALTER TABLE public.payments ALTER COLUMN plan_id DROP NOT NULL;

-- 3. NOVO TRIGGER: 2 créditos de boas-vindas + status active
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone, credits, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    2,
    'active'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (NEW.id, 2, 'Créditos de boas-vindas');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. STATUS SIMPLIFICADO (apenas créditos)
CREATE OR REPLACE FUNCTION public.refresh_user_status(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _credits INTEGER;
  _current_status user_status;
BEGIN
  SELECT credits, status INTO _credits, _current_status
  FROM public.profiles WHERE user_id = _user_id;

  -- Não mexer em status manualmente bloqueados
  IF _current_status = 'blocked' AND _credits > 0 THEN
    RETURN;
  END IF;

  IF _credits <= 0 THEN
    UPDATE public.profiles SET status = 'blocked' WHERE user_id = _user_id;
  ELSE
    UPDATE public.profiles SET status = 'active' WHERE user_id = _user_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_refresh_all_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bloquear quem tem 0 créditos (exceto se já bloqueado manualmente)
  UPDATE public.profiles SET status = 'blocked' WHERE credits <= 0 AND status != 'blocked';
  -- Não desbloquear automaticamente quem foi bloqueado pelo admin
END;
$$;

-- 5. CONSUME CREDIT: remover checagem de plan_expires_at
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id uuid, _reason text, _ad_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _credits INTEGER;
  _status user_status;
BEGIN
  SELECT credits, status INTO _credits, _status
  FROM public.profiles WHERE user_id = _user_id FOR UPDATE;

  IF _status = 'blocked' THEN RETURN FALSE; END IF;
  IF _credits <= 0 THEN RETURN FALSE; END IF;

  UPDATE public.profiles SET credits = credits - 1 WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, reason, ad_id)
  VALUES (_user_id, -1, _reason, _ad_id);

  PERFORM public.refresh_user_status(_user_id);
  RETURN TRUE;
END;
$$;

-- 6. APROVAR PAGAMENTO: pacote de créditos
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payment RECORD;
  _pkg RECORD;
  _total INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  SELECT * INTO _payment FROM public.payments WHERE id = _payment_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found or already processed'; END IF;

  IF _payment.package_id IS NOT NULL THEN
    SELECT * INTO _pkg FROM public.credit_packages WHERE id = _payment.package_id;
    _total := _pkg.credits + _pkg.bonus_credits;

    UPDATE public.profiles SET
      credits = credits + _total,
      status = CASE WHEN status = 'blocked' AND credits + _total > 0 THEN 'active' ELSE status END
    WHERE user_id = _payment.user_id;

    INSERT INTO public.credit_transactions (user_id, amount, reason)
    VALUES (_payment.user_id, _total, 'Pacote ' || _pkg.name || ' aprovado');
  ELSIF _payment.plan_id IS NOT NULL THEN
    -- compatibilidade legada
    DECLARE _plan RECORD; BEGIN
      SELECT * INTO _plan FROM public.plans WHERE id = _payment.plan_id;
      UPDATE public.profiles SET
        credits = credits + _plan.credits,
        current_plan = _plan.id,
        plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), now()) + (_plan.duration_days || ' days')::INTERVAL,
        status = 'active'
      WHERE user_id = _payment.user_id;
    END;
  END IF;

  UPDATE public.payments SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = _payment_id;

  PERFORM public.refresh_user_status(_payment.user_id);
END;
$$;

-- 7. AÇÕES ADMIN: ajustar créditos, bloquear, desbloquear
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(_user_id uuid, _delta integer, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  UPDATE public.profiles
  SET credits = GREATEST(0, credits + _delta)
  WHERE user_id = _user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (_user_id, _delta, COALESCE(_reason, 'Ajuste admin'));

  PERFORM public.refresh_user_status(_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(_user_id uuid, _status user_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  UPDATE public.profiles SET status = _status WHERE user_id = _user_id;
END;
$$;

-- 8. RESET HARD: apaga tudo, inclusive admin
CREATE OR REPLACE FUNCTION public.admin_reset_hard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  DELETE FROM public.credit_transactions;
  DELETE FROM public.auto_boost_settings;
  DELETE FROM public.ads;
  DELETE FROM public.payments;
  DELETE FROM public.profiles;
  DELETE FROM public.user_roles;
  DELETE FROM auth.users;
END;
$$;

-- 9. IDIOMA NA TABELA ADS
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';
ALTER TABLE public.auto_boost_settings ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';