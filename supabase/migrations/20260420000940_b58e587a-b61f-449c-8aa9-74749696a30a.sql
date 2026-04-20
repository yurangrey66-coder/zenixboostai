-- Garante que yurangrey66@gmail.com tenha sempre role admin
-- 1. Atribuir role admin ao usuário existente (se já existir)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'yurangrey66@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Garantir que o profile exista e esteja ativo com créditos
INSERT INTO public.profiles (user_id, status, credits, full_name)
SELECT id, 'active'::public.user_status, 999999, 'Admin'
FROM auth.users
WHERE email = 'yurangrey66@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET status = 'active'::public.user_status,
    credits = GREATEST(public.profiles.credits, 999999);

-- 3. Atualizar trigger handle_new_user para promover automaticamente esse email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
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
    CASE WHEN NEW.email = 'yurangrey66@gmail.com' THEN 999999 ELSE 2 END,
    'active'::public.user_status
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Role padrão
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Promover admin se for o email mestre
  IF NEW.email = 'yurangrey66@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;