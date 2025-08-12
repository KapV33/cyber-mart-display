-- Rename legacy categories and set up navigation categories
BEGIN;

-- Map old categories to new names
UPDATE public.shop_products SET "Category" = 'CVV' WHERE "Category" = 'cat1';
UPDATE public.shop_products SET "Category" = 'Accounts' WHERE "Category" = 'cat2';
UPDATE public.shop_products SET "Category" = 'Databases' WHERE "Category" = 'cat3';
UPDATE public.shop_products SET "Category" = 'Guides' WHERE "Category" = 'cat4';
UPDATE public.shop_products SET "Category" = 'Tools' WHERE "Category" = 'cat5';

-- Remove outdated default to avoid creating new rows with old values
ALTER TABLE public.shop_products ALTER COLUMN "Category" DROP DEFAULT;

-- Seed navigation categories in site_settings
INSERT INTO public.site_settings (key, value)
VALUES (
  'nav_categories',
  jsonb_build_object('list', jsonb_build_array('CVV','Accounts','Databases','Guides','Tools'))
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    updated_at = now();

COMMIT;