-- Roles and role helpers
create type if not exists public.app_role as enum ('admin','moderator','user');

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- RLS for user_roles
create policy if not exists "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy if not exists "Admins can manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Products for shop categories
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('cat1','cat2','cat3','cat4','cat5','cat6','cat7')),
  head1 text,
  head2 text,
  head3 text,
  head4 text,
  head5 text,
  head6 text,
  head7 text,
  head8 text,
  head9 text,
  price numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shop_products enable row level security;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists trg_shop_products_updated_at
before update on public.shop_products
for each row execute function public.update_updated_at_column();

create policy if not exists "Anyone can view shop products"
  on public.shop_products for select using (true);

create policy if not exists "Admins can modify shop products"
  on public.shop_products for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index if not exists idx_shop_products_category on public.shop_products(category);

-- Support tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tickets enable row level security;

create trigger if not exists trg_tickets_updated_at
before update on public.tickets
for each row execute function public.update_updated_at_column();

create policy if not exists "Users can create their tickets"
  on public.tickets for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can view their tickets"
  on public.tickets for select
  using (auth.uid() = user_id);

create policy if not exists "Users can update their open tickets"
  on public.tickets for update
  using (auth.uid() = user_id);

create policy if not exists "Admins can view all tickets"
  on public.tickets for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy if not exists "Admins can update all tickets"
  on public.tickets for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Site settings
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create trigger if not exists trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.update_updated_at_column();

create policy if not exists "Anyone can view site settings"
  on public.site_settings for select using (true);

create policy if not exists "Admins can upsert settings"
  on public.site_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- NOWPayments invoice tracking
create table if not exists public.nowpayments_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  order_id text not null,
  payment_id text,
  invoice_url text,
  pay_currency text,
  pay_amount numeric,
  price_amount numeric,
  price_currency text default 'usd',
  status text not null default 'pending',
  bonus_applied numeric default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nowpayments_invoices enable row level security;

create trigger if not exists trg_nowp_updated_at
before update on public.nowpayments_invoices
for each row execute function public.update_updated_at_column();

create policy if not exists "Users can insert their own invoices"
  on public.nowpayments_invoices for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can view their own invoices"
  on public.nowpayments_invoices for select
  using (auth.uid() = user_id);

create policy if not exists "Admins can view all invoices"
  on public.nowpayments_invoices for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Helper: ensure user has profile & wallet without touching auth schema
create or replace function public.ensure_user_profile_and_wallet()
returns void
language plpgsql
security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, username)
  select uid, 'user_' || substr(uid::text,1,8)
  where not exists (select 1 from public.profiles where id = uid);

  insert into public.user_wallets (user_id)
  select uid
  where not exists (select 1 from public.user_wallets where user_id = uid);
end;
$$;