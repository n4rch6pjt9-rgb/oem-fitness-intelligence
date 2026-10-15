-- Additive: advertisements, URLs, media, raw evidence and IDs are retained.
-- Families are a documented code grouping (model prefix), not proof of a
-- manufacturer's technical series. oem_lines remain source/navigation groups.
create function public.oem_model_key(value text) returns text
language sql immutable strict set search_path = '' as $$
  select nullif(upper(regexp_replace(btrim(value), '\s+', '', 'g')), '');
$$;

create table public.oem_families (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.oem_factories(id),
  code text not null check(code ~ '^[A-Z]+$'),
  basis text not null default 'model_prefix' check(basis='model_prefix'),
  unique(factory_id,code), unique(id,factory_id)
);
create table public.oem_skus (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.oem_factories(id),
  family_id uuid,
  model_key text not null check(model_key<>'' and model_key is not distinct from public.oem_model_key(model_key)),
  unique(factory_id,model_key), unique(id,factory_id),
  foreign key(family_id,factory_id) references public.oem_families(id,factory_id)
);
alter table public.oem_ads add column sku_id uuid;
alter table public.oem_ads add constraint oem_ads_sku_factory_fk foreign key(sku_id,factory_id) references public.oem_skus(id,factory_id);
alter table public.oem_ads add constraint oem_ads_id_sku_unique unique(id,sku_id);
create index oem_ads_sku on public.oem_ads(sku_id);
create index oem_skus_family on public.oem_skus(family_id);
create table public.oem_sku_usages (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.oem_skus(id),
  usage_class text not null check(usage_class in ('commercial','light_commercial')),
  unique(sku_id,usage_class), unique(id,sku_id)
);
create table public.oem_usage_evidence (
  id uuid primary key default gen_random_uuid(),
  usage_id uuid not null references public.oem_sku_usages(id),
  ad_id uuid not null references public.oem_ads(id),
  field text not null, value text not null, source_section text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique(usage_id,ad_id,field,value,source_section)
);
create index oem_usage_evidence_ad on public.oem_usage_evidence(ad_id);
create table public.oem_sku_variants (
  id uuid primary key default gen_random_uuid(),
  sku_id uuid not null references public.oem_skus(id),
  usage_id uuid not null,
  name text not null check(btrim(name)<>''),
  name_key text generated always as (lower(btrim(name))) stored,
  evidence_ad_id uuid not null,
  evidence_field text not null check(evidence_field in ('variant','configuration','model_version')),
  source_section text not null check(btrim(source_section)<>''),
  source_value text not null check(btrim(source_value)<>''),
  unique(usage_id,name_key),
  foreign key(usage_id,sku_id) references public.oem_sku_usages(id,sku_id),
  foreign key(evidence_ad_id,sku_id) references public.oem_ads(id,sku_id)
);

create function public.oem_assign_sku() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare key text; family_code text; family uuid;
begin
  key := public.oem_model_key(new.model);
  -- Conflicting model evidence cannot acquire an automatic canonical identity.
  if exists(select 1 from jsonb_array_elements(coalesce(new.attributes#>'{extraction,conflicts}','[]')) c
    where c->>'field'='model' and exists(select 1 from jsonb_array_elements(c->'values') v where public.oem_model_key(v->>'value') is distinct from key)) then
    key := null;
  end if;
  new.sku_id := null;
  if key is null then return new; end if;
  family_code := substring(key from '^([A-Z]+)[0-9][A-Z0-9-]*$');
  if family_code is not null then
    insert into public.oem_families(factory_id,code) values(new.factory_id,family_code)
    on conflict(factory_id,code) do update set code=excluded.code returning id into family;
  end if;
  insert into public.oem_skus(factory_id,family_id,model_key) values(new.factory_id,family,key)
  on conflict(factory_id,model_key) do update set model_key=excluded.model_key returning id into new.sku_id;
  return new;
end;
$$;

create function public.oem_sync_usage_evidence() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare r record; class text; usage uuid; text_value text; remaining text; light boolean;
begin
  update public.oem_usage_evidence set is_current=false where ad_id=new.id and is_current;
  if new.sku_id is null then return new; end if;
  for r in
    select 'title' as field, coalesce(new.attributes#>>'{extraction,product,title}',new.title) as value, 'Overview / title' as section
    union all
    select s->>'field',s->>'value',s->>'source_section'
    from jsonb_array_elements(coalesce(new.attributes#>'{extraction,specifications}','[]')) s
    where s->>'field' in ('application','appliance','use_class','usage','intended_use')
  loop
    text_value := lower(r.value);
    if text_value is null or nullif(btrim(r.section),'') is null or text_value ~ '\m(not|no|non|except|unsuitable|não)\M' then continue; end if;
    light := text_value ~ '\mlight[[:space:]-]+commercial\M|\mcomercial[[:space:]]+leve\M';
    remaining := regexp_replace(text_value,'\mlight[[:space:]-]+commercial\M|\mcomercial[[:space:]]+leve\M','','g');
    foreach class in array array['light_commercial','commercial'] loop
      if (class='light_commercial' and not light) or (class='commercial' and remaining !~ '\m(commercial|comercial)\M') then continue; end if;
      insert into public.oem_sku_usages(sku_id,usage_class) values(new.sku_id,class)
      on conflict(sku_id,usage_class) do update set usage_class=excluded.usage_class returning id into usage;
      insert into public.oem_usage_evidence(usage_id,ad_id,field,value,source_section) values(usage,new.id,r.field,r.value,r.section)
      on conflict(usage_id,ad_id,field,value,source_section) do update set is_current=true;
    end loop;
  end loop;
  return new;
end;
$$;

create function public.oem_validate_variant() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.name <> new.source_value or not exists (
    select 1 from public.oem_ads a
    cross join lateral jsonb_array_elements(coalesce(a.attributes#>'{extraction,specifications}','[]')) s
    where a.id=new.evidence_ad_id and a.sku_id=new.sku_id and a.deleted_at is null
      and s->>'field'=new.evidence_field and s->>'value'=new.source_value and s->>'source_section'=new.source_section
  ) or not exists(select 1 from public.oem_usage_evidence e where e.usage_id=new.usage_id and e.ad_id=new.evidence_ad_id and e.is_current) then
    raise exception 'Variant requires an explicit configuration declaration and usage evidence from the same advertisement';
  end if;
  return new;
end;
$$;
create trigger oem_ads_assign_sku before insert or update of model,factory_id,attributes,sku_id on public.oem_ads for each row execute function public.oem_assign_sku();
create trigger oem_ads_sync_usage after insert or update of model,factory_id,attributes,title on public.oem_ads for each row execute function public.oem_sync_usage_evidence();
create trigger oem_variant_evidence before insert or update on public.oem_sku_variants for each row execute function public.oem_validate_variant();

-- Backfill derived links only. No source attributes or selected measures change.
update public.oem_ads set model=model;

alter table public.oem_families enable row level security;
alter table public.oem_skus enable row level security;
alter table public.oem_sku_usages enable row level security;
alter table public.oem_usage_evidence enable row level security;
alter table public.oem_sku_variants enable row level security;
revoke all on public.oem_families,public.oem_skus,public.oem_sku_usages,public.oem_usage_evidence,public.oem_sku_variants from public,anon,authenticated;
grant all on public.oem_families,public.oem_skus,public.oem_sku_usages,public.oem_usage_evidence,public.oem_sku_variants to service_role;
revoke all on function public.oem_assign_sku(),public.oem_sync_usage_evidence(),public.oem_validate_variant(),public.oem_model_key(text) from public,anon,authenticated;
grant execute on function public.oem_assign_sku(),public.oem_sync_usage_evidence(),public.oem_validate_variant(),public.oem_model_key(text) to service_role;

create function public.oem_sku_hierarchy(target uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('sku_id',s.id,'model',s.model_key,'family',f.code,'family_basis',f.basis,
    'usages',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'usage_class',u.usage_class,
      'evidence',(select jsonb_agg(jsonb_build_object('ad_id',e.ad_id,'field',e.field,'value',e.value,'source_section',e.source_section))
        from public.oem_usage_evidence e join public.oem_ads a on a.id=e.ad_id where e.usage_id=u.id and e.is_current and a.deleted_at is null),
      'variants',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'evidence_ad_id',v.evidence_ad_id,'source_section',v.source_section,'source_value',v.source_value))
        from public.oem_sku_variants v join public.oem_ads a on a.id=v.evidence_ad_id
        where v.usage_id=u.id and a.deleted_at is null and exists(
          select 1 from jsonb_array_elements(coalesce(a.attributes#>'{extraction,specifications}','[]')) r
          where r->>'field'=v.evidence_field and r->>'value'=v.source_value and r->>'source_section'=v.source_section)
          and exists(select 1 from public.oem_usage_evidence e where e.usage_id=u.id and e.ad_id=a.id and e.is_current)), '[]')) order by u.usage_class)
      from public.oem_sku_usages u where u.sku_id=s.id and exists(
        select 1 from public.oem_usage_evidence e join public.oem_ads a on a.id=e.ad_id
        where e.usage_id=u.id and e.is_current and a.deleted_at is null)), '[]'))
  from public.oem_skus s left join public.oem_families f on f.id=s.family_id where s.id=target;
$$;

create function public.oem_catalog_skus(target_factory uuid, page_number integer default 1,
  search_text text default '', target_line uuid default null, archived boolean default false) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if page_number < 1 or page_number > 100000 or length(search_text)>120 then raise exception 'Invalid pagination/search'; end if;
  with eligible as (
    select a.* from public.oem_ads a where a.factory_id=target_factory and (a.deleted_at is not null)=archived
      and (search_text='' or strpos(lower(a.title),lower(search_text))>0 or strpos(lower(coalesce(a.model,'')),lower(search_text))>0)
      and (target_line is null or exists(select 1 from public.oem_ad_lines l where l.ad_id=a.id and l.line_id=target_line))
  ), grouped as (
    select distinct on (coalesce(sku_id,id)) * from eligible order by coalesce(sku_id,id),collected_at desc,id
  ), paged as (
    select * from grouped order by public.oem_model_key(model) nulls last,title,id offset (page_number-1)*24 limit 24
  )
  select jsonb_build_object('total',(select count(*) from grouped),'page',page_number,'size',24,
    'items',coalesce((select jsonb_agg(to_jsonb(p) || jsonb_build_object('hierarchy',public.oem_sku_hierarchy(p.sku_id),
      'advertisements',(select jsonb_agg(jsonb_build_object('id',a.id,'source_url',a.source_url,'title',a.title) order by a.id)
        from public.oem_ads a where a.factory_id=p.factory_id and coalesce(a.sku_id,a.id)=coalesce(p.sku_id,p.id) and (a.deleted_at is not null)=archived))
      order by public.oem_model_key(p.model) nulls last,p.title,p.id) from paged p),'[]')) into result;
  return result;
end;
$$;
revoke all on function public.oem_sku_hierarchy(uuid),public.oem_catalog_skus(uuid,integer,text,uuid,boolean) from public,anon,authenticated;
grant execute on function public.oem_sku_hierarchy(uuid),public.oem_catalog_skus(uuid,integer,text,uuid,boolean) to service_role;

create or replace function public.oem_factory_summary() returns table (
  id uuid, domain text, name text, source_url text, expected_ads integer,
  crawl_enabled boolean, ads bigint, skus bigint, queued bigint, running bigint, done bigint, errors bigint
) language sql security invoker set search_path = '' as $$
  select f.id,f.domain,f.name,f.source_url,f.expected_ads,f.crawl_enabled,
    (select count(*) from public.oem_ads a where a.factory_id=f.id and a.deleted_at is null),
    (select count(distinct a.sku_id) from public.oem_ads a where a.factory_id=f.id and a.deleted_at is null and a.sku_id is not null),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='queued'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='running'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='done'),
    (select count(*) from public.oem_pages p where p.factory_id=f.id and p.deleted_at is null and p.state='error')
  from public.oem_factories f order by f.name;
$$;
revoke all on function public.oem_factory_summary() from public, anon, authenticated;
grant execute on function public.oem_factory_summary() to service_role;
