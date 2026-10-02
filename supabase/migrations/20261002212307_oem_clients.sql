create table public.oem_clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  cnpj text not null check (cnpj ~ '^[0-9]{14}$'),
  legal_name text not null check (length(trim(legal_name)) > 0),
  trade_name text, email text, phone text, contact_name text,
  street text, number text, complement text, district text,
  city text, state text, postal_code text,
  registration_status text, main_activity text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create unique index oem_clients_active_cnpj on public.oem_clients(owner_id,cnpj) where archived_at is null;
alter table public.oem_clients enable row level security;
revoke all on public.oem_clients from anon, authenticated;
grant select, insert, update on public.oem_clients to service_role;
-- Access is mediated by the authenticated operator API; every query filters owner_id.
