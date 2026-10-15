-- Preserve source evidence before any ingestion path overwrites an existing ad.
create table public.oem_ad_revisions (
  id uuid primary key default gen_random_uuid(),
  ad_id uuid not null references public.oem_ads(id),
  snapshot jsonb not null,
  snapshot_hash text generated always as (md5(snapshot::text)) stored,
  preserved_at timestamptz not null default now(),
  unique(ad_id,snapshot_hash)
);
alter table public.oem_ad_revisions enable row level security;
revoke all on public.oem_ad_revisions from public,anon,authenticated;
grant select,insert on public.oem_ad_revisions to service_role;

create function public.oem_preserve_ad_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare source jsonb;
begin
  if tg_op='INSERT' then source:=to_jsonb(new)-'sku_id';
  elsif (to_jsonb(old)-'sku_id') is distinct from (to_jsonb(new)-'sku_id') then source:=to_jsonb(old)-'sku_id';
  else return new;
  end if;
  insert into public.oem_ad_revisions(ad_id,snapshot) values(new.id,source) on conflict(ad_id,snapshot_hash) do nothing;
  return new;
end;
$$;
create trigger oem_ads_preserve_revision after insert or update on public.oem_ads for each row execute function public.oem_preserve_ad_revision();
insert into public.oem_ad_revisions(ad_id,snapshot) select id,to_jsonb(a)-'sku_id' from public.oem_ads a;
revoke all on function public.oem_preserve_ad_revision() from public,anon,authenticated;
grant execute on function public.oem_preserve_ad_revision() to service_role;
