alter table public.oem_ads add column deleted_at timestamptz;
alter table public.oem_product_media add column deleted_at timestamptz;
alter table public.oem_pages add column deleted_at timestamptz;
grant update on public.oem_product_media to service_role;
create or replace function public.oem_claim_page() returns setof public.oem_pages
language plpgsql security invoker set search_path = '' as $$
begin
  update public.oem_pages set state='error', error='Execução interrompida após o limite de tentativas.'
  where deleted_at is null and state='running' and attempts >= 3 and started_at < now()-interval '10 minutes';
  return query update public.oem_pages set state='running', attempts=attempts+1, started_at=now(), error=null
  where id = (
    select p.id from public.oem_pages p join public.oem_factories f on f.id=p.factory_id
    where p.deleted_at is null and f.crawl_enabled and p.attempts < 3 and p.available_at <= now()
      and (p.state in ('queued','error') or (p.state='running' and p.started_at < now()-interval '10 minutes'))
    order by p.priority, p.created_at
    for update of p skip locked limit 1
  ) returning *;
end;
$$;
revoke all on function public.oem_claim_page() from public, anon, authenticated;
grant execute on function public.oem_claim_page() to service_role;

create or replace function public.oem_factory_summary() returns table (
  id uuid, domain text, name text, source_url text, expected_ads integer,
  crawl_enabled boolean, ads bigint, skus bigint, queued bigint, running bigint, done bigint, errors bigint
) language sql security invoker set search_path = '' as $$
  select f.id,f.domain,f.name,f.source_url,f.expected_ads,f.crawl_enabled,
    (select count(*) from public.oem_ads a where a.factory_id=f.id and a.deleted_at is null),
    (select count(distinct a.model) from public.oem_ads a where a.factory_id=f.id and a.deleted_at is null and a.model is not null),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='queued'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='running'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='done'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='error')
  from public.oem_factories f order by f.name;
$$;
revoke all on function public.oem_factory_summary() from public, anon, authenticated;
grant execute on function public.oem_factory_summary() to service_role;
