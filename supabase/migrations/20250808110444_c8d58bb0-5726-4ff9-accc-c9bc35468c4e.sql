-- Harden existing functions with immutable search_path
CREATE OR REPLACE FUNCTION public.increment_purchase_counter()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public.purchase_counter 
  SET current_count = current_count + 1,
      last_updated = now()
  WHERE id = (SELECT id FROM public.purchase_counter ORDER BY created_at DESC LIMIT 1);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_user_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_wallet_balance(p_user_id uuid, p_amount numeric, p_transaction_type text, p_description text DEFAULT NULL::text, p_transaction_hash text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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