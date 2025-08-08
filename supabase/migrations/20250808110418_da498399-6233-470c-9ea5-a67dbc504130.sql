-- Harden functions by locking search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '';

CREATE OR REPLACE FUNCTION public.ensure_user_profile_and_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.profiles (id, username)
  SELECT uid, 'user_' || substr(uid::text,1,8)
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid);

  INSERT INTO public.user_wallets (user_id)
  SELECT uid
  WHERE NOT EXISTS (SELECT 1 FROM public.user_wallets WHERE user_id = uid);
END;
$$;