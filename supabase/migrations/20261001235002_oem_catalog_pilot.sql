-- Independent pilot: public Data API access is disabled for anon/authenticated.
create table public.oem_factories (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  name text not null,
  source_url text not null,
  expected_ads integer check (expected_ads >= 0),
  crawl_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);
create table public.oem_lines (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.oem_factories(id),
  name text not null,
  source_url text not null unique
);
create table public.oem_ads (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.oem_factories(id),
  source_url text not null unique,
  title text not null,
  model text,
  currency text,
  price_min numeric,
  price_max numeric,
  moq text,
  dimensions_mm jsonb,
  packing_mm jsonb,
  images jsonb not null default '[]',
  attributes jsonb not null default '{}',
  raw_jsonld jsonb not null default '[]',
  content_hash text not null,
  collected_at timestamptz not null default now()
);
create index oem_ads_factory_model on public.oem_ads(factory_id, model);
create table public.oem_ad_lines (
  ad_id uuid not null references public.oem_ads(id),
  line_id uuid not null references public.oem_lines(id),
  primary key(ad_id,line_id)
);
create table public.oem_pages (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.oem_factories(id),
  url text not null unique,
  kind text not null check (kind in ('listing','product')),
  state text not null default 'queued' check (state in ('queued','running','done','error')),
  attempts integer not null default 0,
  priority integer not null default 100,
  available_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  http_status integer,
  error text,
  created_at timestamptz not null default now()
);
create index oem_pages_pending on public.oem_pages(state, available_at, priority);
create table public.oem_page_lines (
  page_id uuid not null references public.oem_pages(id),
  line_id uuid not null references public.oem_lines(id),
  primary key(page_id,line_id)
);
alter table public.oem_factories enable row level security;
alter table public.oem_lines enable row level security;
alter table public.oem_ads enable row level security;
alter table public.oem_ad_lines enable row level security;
alter table public.oem_pages enable row level security;
alter table public.oem_page_lines enable row level security;
revoke all on public.oem_factories, public.oem_lines, public.oem_ads,
  public.oem_ad_lines, public.oem_pages, public.oem_page_lines from anon, authenticated;
grant all on public.oem_factories, public.oem_lines, public.oem_ads,
  public.oem_ad_lines, public.oem_pages, public.oem_page_lines to service_role;

create function public.oem_claim_page() returns setof public.oem_pages
language plpgsql security invoker set search_path = '' as $$
begin
  update public.oem_pages set state='error', error='Execução interrompida após o limite de tentativas.'
  where state='running' and attempts >= 3 and started_at < now()-interval '10 minutes';
  return query update public.oem_pages set state='running', attempts=attempts+1, started_at=now(), error=null
  where id = (
    select p.id from public.oem_pages p join public.oem_factories f on f.id=p.factory_id
    where f.crawl_enabled and p.attempts < 3 and p.available_at <= now()
      and (p.state in ('queued','error') or (p.state='running' and p.started_at < now()-interval '10 minutes'))
    order by p.priority, p.created_at
    for update of p skip locked limit 1
  ) returning *;
end;
$$;
revoke all on function public.oem_claim_page() from public, anon, authenticated;
grant execute on function public.oem_claim_page() to service_role;

create function public.oem_factory_summary() returns table (
  id uuid, domain text, name text, source_url text, expected_ads integer,
  crawl_enabled boolean, ads bigint, skus bigint, queued bigint, running bigint, done bigint, errors bigint
) language sql security invoker set search_path = '' as $$
  select f.id,f.domain,f.name,f.source_url,f.expected_ads,f.crawl_enabled,
    (select count(*) from public.oem_ads a where a.factory_id=f.id),
    (select count(distinct a.model) from public.oem_ads a where a.factory_id=f.id and a.model is not null),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.state='queued'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.state='running'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.state='done'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.state='error')
  from public.oem_factories f order by f.name;
$$;
revoke all on function public.oem_factory_summary() from public, anon, authenticated;
grant execute on function public.oem_factory_summary() to service_role;
