// Operator-reviewed DML for the bounded capture pilot, not a public ingestion API.
// Values are encoded as UTF-8 hex so captured text cannot terminate the SQL body.
export function alibabaPilotSql(bundle) {
  if(bundle?.ad?.attributes?.source_provider!=='alibaba')throw new Error('Expected a validated Alibaba capture.');
  const payload=Buffer.from(JSON.stringify(bundle),'utf8').toString('hex');
  return `do $alibaba$
declare p jsonb := convert_from(decode('${payload}','hex'),'UTF8')::jsonb;
factory uuid; existing public.oem_ads%rowtype; original jsonb; after_rows jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]') into original from public.oem_ads a where a.source_url<>p#>>'{ad,source_url}';
 select id into factory from public.oem_factories where domain=p#>>'{factory,domain}';
 if factory is null then
  if exists(select 1 from public.oem_factories where lower(name)=lower(p#>>'{factory,name}')) then raise exception 'Same supplier name under another source; manual identity review required'; end if;
  insert into public.oem_factories(domain,name,source_url,crawl_enabled) values(p#>>'{factory,domain}',p#>>'{factory,name}',p#>>'{factory,source_url}',false) returning id into factory;
 end if;
 if exists(select 1 from public.oem_factories where id=factory and (crawl_enabled or name<>p#>>'{factory,name}')) then raise exception 'Existing supplier state differs'; end if;
 select * into existing from public.oem_ads where source_url=p#>>'{ad,source_url}';
 if found then
  if existing.factory_id<>factory or existing.content_hash<>p#>>'{ad,content_hash}' then raise exception 'Existing capture differs; no overwrite allowed in pilot'; end if;
 else
  insert into public.oem_ads(factory_id,source_url,title,model,currency,price_min,price_max,moq,dimensions_mm,packing_mm,images,attributes,raw_jsonld,content_hash,collected_at)
  values(factory,p#>>'{ad,source_url}',p#>>'{ad,title}',p#>>'{ad,model}',p#>>'{ad,currency}',(p#>>'{ad,price_min}')::numeric,(p#>>'{ad,price_max}')::numeric,p#>>'{ad,moq}',p#>'{ad,dimensions_mm}',null,p#>'{ad,images}',p#>'{ad,attributes}',p#>'{ad,raw_jsonld}',p#>>'{ad,content_hash}',(p#>>'{ad,collected_at}')::timestamptz);
 end if;
 select coalesce(jsonb_agg(to_jsonb(a) order by a.id),'[]') into after_rows from public.oem_ads a where a.source_url<>p#>>'{ad,source_url}';
 if original is distinct from after_rows then raise exception 'Unrelated ads changed; rolling back'; end if;
 if (select count(*) from public.oem_ads where source_url=p#>>'{ad,source_url}')<>1 then raise exception 'Unexpected source count'; end if;
end $alibaba$;`;
}
