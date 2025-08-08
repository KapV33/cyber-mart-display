-- Ensure enum type exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
  END IF;
END$$;

-- user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- RLS for user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- shop_products table
CREATE TABLE IF NOT EXISTS public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('cat1','cat2','cat3','cat4','cat5','cat6','cat7')),
  head1 text,
  head2 text,
  head3 text,
  head4 text,
  head5 text,
  head6 text,
  head7 text,
  head8 text,
  head9 text,
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- updated_at trigger function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- triggers
DROP TRIGGER IF EXISTS trg_shop_products_updated_at ON public.shop_products;
CREATE TRIGGER trg_shop_products_updated_at
BEFORE UPDATE ON public.shop_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- policies for shop_products
DROP POLICY IF EXISTS "Anyone can view shop products" ON public.shop_products;
CREATE POLICY "Anyone can view shop products"
  ON public.shop_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can modify shop products" ON public.shop_products;
CREATE POLICY "Admins can modify shop products"
  ON public.shop_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_shop_products_category ON public.shop_products(category);

-- tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_tickets_updated_at ON public.tickets;
CREATE TRIGGER trg_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can create their tickets" ON public.tickets;
CREATE POLICY "Users can create their tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their tickets" ON public.tickets;
CREATE POLICY "Users can view their tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their open tickets" ON public.tickets;
CREATE POLICY "Users can update their open tickets"
  ON public.tickets FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
CREATE POLICY "Admins can view all tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;
CREATE POLICY "Admins can update all tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trg_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can upsert settings" ON public.site_settings;
CREATE POLICY "Admins can upsert settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- NOWPayments invoice tracking
CREATE TABLE IF NOT EXISTS public.nowpayments_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  payment_id text,
  invoice_url text,
  pay_currency text,
  pay_amount numeric,
  price_amount numeric,
  price_currency text DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending',
  bonus_applied numeric DEFAULT 0,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nowpayments_invoices ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_nowp_updated_at ON public.nowpayments_invoices;
CREATE TRIGGER trg_nowp_updated_at
BEFORE UPDATE ON public.nowpayments_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Users can insert their own invoices" ON public.nowpayments_invoices;
CREATE POLICY "Users can insert their own invoices"
  ON public.nowpayments_invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.nowpayments_invoices;
CREATE POLICY "Users can view their own invoices"
  ON public.nowpayments_invoices FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all invoices" ON public.nowpayments_invoices;
CREATE POLICY "Admins can view all invoices"
  ON public.nowpayments_invoices FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC to ensure profile & wallet exist
CREATE OR REPLACE FUNCTION public.ensure_user_profile_and_wallet()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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