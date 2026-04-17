
-- ============================================
-- ZENIX BOOST - Schema inicial
-- ============================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.plan_type AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE public.user_status AS ENUM ('active', 'expiring', 'blocked');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.ad_status AS ENUM ('active', 'paused', 'expired');
CREATE TYPE public.ad_style AS ENUM ('classic', 'promotional', 'nature', '3d_realistic', '3d_blur', 'luxury', '4k_ultra');

-- ============================================
-- Profiles
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  current_plan plan_type,
  plan_expires_at TIMESTAMPTZ,
  status user_status NOT NULL DEFAULT 'blocked',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- User roles (separate table for security)
-- ============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================
-- Plans configuration (admin editable prices)
-- ============================================
CREATE TABLE public.plans (
  id plan_type PRIMARY KEY,
  name TEXT NOT NULL,
  price_mt INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  allowed_styles ad_style[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

INSERT INTO public.plans (id, name, price_mt, credits, duration_days, allowed_styles) VALUES
  ('daily',  'Diário',  15, 3,  1,  ARRAY['classic','promotional','nature']::ad_style[]),
  ('weekly', 'Semanal', 45, 15, 7,  ARRAY['classic','promotional','nature','3d_realistic','3d_blur']::ad_style[]),
  ('monthly','Mensal',  95, 60, 30, ARRAY['classic','promotional','nature','3d_realistic','3d_blur','luxury','4k_ultra']::ad_style[]);

-- ============================================
-- Payments (manual via WhatsApp + admin approval)
-- ============================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id plan_type NOT NULL REFERENCES public.plans(id),
  amount_mt INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'whatsapp',
  reference TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- ============================================
-- Ads
-- ============================================
CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  style ad_style NOT NULL,
  image_url TEXT,
  prompt TEXT,
  status ad_status NOT NULL DEFAULT 'active',
  views INTEGER NOT NULL DEFAULT 0,
  is_boosted BOOLEAN NOT NULL DEFAULT false,
  boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ads_user ON public.ads(user_id);
CREATE INDEX idx_ads_status ON public.ads(status);
CREATE INDEX idx_ads_boost ON public.ads(is_boosted) WHERE is_boosted = true;

-- ============================================
-- Credit transactions (audit log)
-- ============================================
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- plans (everyone can read, admins manage)
CREATE POLICY "Plans are viewable by all authenticated" ON public.plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage plans" ON public.plans
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- payments
CREATE POLICY "Users view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ads
CREATE POLICY "Active ads viewable by authenticated" ON public.ads
  FOR SELECT TO authenticated USING (status = 'active' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own ads" ON public.ads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ads" ON public.ads
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users delete own ads" ON public.ads
  FOR DELETE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- credit_transactions
CREATE POLICY "Users view own credit tx" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Triggers & helper functions
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update status based on plan / credits
CREATE OR REPLACE FUNCTION public.refresh_user_status(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _expires TIMESTAMPTZ;
  _credits INTEGER;
  _new_status user_status;
BEGIN
  SELECT plan_expires_at, credits INTO _expires, _credits
  FROM public.profiles WHERE user_id = _user_id;

  IF _expires IS NULL OR _expires < now() OR _credits <= 0 THEN
    _new_status := 'blocked';
  ELSIF _expires < now() + INTERVAL '2 days' THEN
    _new_status := 'expiring';
  ELSE
    _new_status := 'active';
  END IF;

  UPDATE public.profiles SET status = _new_status WHERE user_id = _user_id;
END;
$$;

-- Approve payment: credit user + extend plan
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _payment RECORD;
  _plan RECORD;
  _current_expires TIMESTAMPTZ;
  _base TIMESTAMPTZ;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve payments';
  END IF;

  SELECT * INTO _payment FROM public.payments WHERE id = _payment_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found or already processed'; END IF;

  SELECT * INTO _plan FROM public.plans WHERE id = _payment.plan_id;

  SELECT plan_expires_at INTO _current_expires FROM public.profiles WHERE user_id = _payment.user_id;
  _base := GREATEST(COALESCE(_current_expires, now()), now());

  UPDATE public.profiles SET
    credits = credits + _plan.credits,
    current_plan = _plan.id,
    plan_expires_at = _base + (_plan.duration_days || ' days')::INTERVAL
  WHERE user_id = _payment.user_id;

  UPDATE public.payments SET
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now()
  WHERE id = _payment_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (_payment.user_id, _plan.credits, 'Plano ' || _plan.name || ' aprovado');

  PERFORM public.refresh_user_status(_payment.user_id);
END;
$$;

-- Consume credit (called from edge function before generation)
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id UUID, _reason TEXT, _ad_id UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _credits INTEGER;
  _expires TIMESTAMPTZ;
BEGIN
  SELECT credits, plan_expires_at INTO _credits, _expires
  FROM public.profiles WHERE user_id = _user_id FOR UPDATE;

  IF _expires IS NULL OR _expires < now() THEN RETURN FALSE; END IF;
  IF _credits <= 0 THEN RETURN FALSE; END IF;

  UPDATE public.profiles SET credits = credits - 1 WHERE user_id = _user_id;
  INSERT INTO public.credit_transactions (user_id, amount, reason, ad_id)
  VALUES (_user_id, -1, _reason, _ad_id);

  PERFORM public.refresh_user_status(_user_id);
  RETURN TRUE;
END;
$$;
