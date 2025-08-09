-- Harden and normalize core security-definer functions (idempotent)

-- has_role: stable, security definer, locked search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- update_updated_at_column: trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- ensure_user_profile_and_wallet: creates profile and wallet for current user
CREATE OR REPLACE FUNCTION public.ensure_user_profile_and_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;

-- increment_purchase_counter: simple counter bump
CREATE OR REPLACE FUNCTION public.increment_purchase_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  UPDATE public.purchase_counter 
  SET current_count = current_count + 1,
      last_updated = now()
  WHERE id = (SELECT id FROM public.purchase_counter ORDER BY created_at DESC LIMIT 1);
END;
$function$;

-- create_user_wallet: trigger helper on new profile/user
CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- update_wallet_balance: transaction + balance update
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id uuid,
  p_amount numeric,
  p_transaction_type text,
  p_description text DEFAULT NULL::text,
  p_transaction_hash text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  transaction_id UUID;
BEGIN
  -- Insert transaction record
  INSERT INTO public.transactions (user_id, type, amount, description, transaction_hash, status)
  VALUES (p_user_id, p_transaction_type, p_amount, p_description, p_transaction_hash, 'completed')
  RETURNING id INTO transaction_id;
  
  -- Update wallet balance
  UPDATE public.user_wallets 
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN transaction_id;
END;
$function$;