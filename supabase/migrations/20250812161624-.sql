-- Secure access to sensitive data in shop_products
BEGIN;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- Remove overly permissive public-read policy
DROP POLICY IF EXISTS "Anyone can view shop products" ON public.shop_products;

-- Allow only authenticated users to read products
CREATE POLICY "Authenticated users can view shop products"
ON public.shop_products
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

COMMIT;