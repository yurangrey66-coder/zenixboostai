-- 1. Promover admin pelo email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'yurangrey66@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Tabela auto_boost_settings
CREATE TABLE IF NOT EXISTS public.auto_boost_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  preferred_style ad_style NOT NULL DEFAULT 'promotional',
  base_theme TEXT NOT NULL DEFAULT 'Produto em destaque',
  last_run_at TIMESTAMPTZ,
  total_generated INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auto_boost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own auto boost" ON public.auto_boost_settings
FOR ALL USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_auto_boost_updated_at
BEFORE UPDATE ON public.auto_boost_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Função global de refresh (IA Admin automática)
CREATE OR REPLACE FUNCTION public.auto_refresh_all_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET status = 'blocked'
  WHERE plan_expires_at IS NULL OR plan_expires_at < now() OR credits <= 0;

  UPDATE public.profiles SET status = 'expiring'
  WHERE plan_expires_at IS NOT NULL
    AND plan_expires_at >= now()
    AND plan_expires_at < now() + INTERVAL '2 days'
    AND credits > 0;

  UPDATE public.profiles SET status = 'active'
  WHERE plan_expires_at >= now() + INTERVAL '2 days' AND credits > 0;
END;
$$;

-- 4. Habilitar extensions e cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. Cron 5 min: IA Admin
SELECT cron.unschedule('zenix-admin-refresh') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zenix-admin-refresh');
SELECT cron.schedule(
  'zenix-admin-refresh',
  '*/5 * * * *',
  $$ SELECT public.auto_refresh_all_statuses(); $$
);

-- 6. Cron 1 hora: AUTO BOOST runner (chama edge function)
SELECT cron.unschedule('zenix-auto-boost') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'zenix-auto-boost');
SELECT cron.schedule(
  'zenix-auto-boost',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jltipylfxmthuxsybltt.supabase.co/functions/v1/auto-boost-runner',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsdGlweWxmeG10aHV4c3libHR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NTM1MzQsImV4cCI6MjA5MjAyOTUzNH0.V8oqV6q0wXbpnHse4Kd6N-nLkhfyfLCsQyzXRhUyVI0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);