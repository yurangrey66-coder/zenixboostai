DO $$
DECLARE
  _uid uuid;
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'yurangrey66@gmail.com';
  IF _uid IS NOT NULL THEN
    DELETE FROM public.credit_transactions WHERE user_id = _uid;
    DELETE FROM public.auto_boost_settings WHERE user_id = _uid;
    DELETE FROM public.payments WHERE user_id = _uid OR approved_by = _uid;
    DELETE FROM public.ads WHERE user_id = _uid;
    DELETE FROM public.user_roles WHERE user_id = _uid;
    DELETE FROM public.profiles WHERE user_id = _uid;
    DELETE FROM auth.users WHERE id = _uid;
  END IF;
END $$;