-- Run after the migration, inside BEGIN / ROLLBACK. Synthetic fixtures only.
do $$
declare f uuid; f2 uuid; a uuid; b uuid; c uuid; sku uuid; usage uuid;
  payload jsonb; rejected boolean; original jsonb; n integer;
begin
  insert into public.oem_factories(domain,name,source_url) values('hierarchy-fixture.test','Synthetic test','https://hierarchy-fixture.test') returning id into f;
  insert into public.oem_factories(domain,name,source_url) values('hierarchy-other.test','Synthetic test 2','https://hierarchy-other.test') returning id into f2;
  insert into public.oem_ads(factory_id,source_url,title,model,content_hash,attributes)
    values(f,'https://hierarchy-fixture.test/a','Commercial press','TN 114','fixture',
      '{"extraction":{"specifications":[{"field":"configuration","value":"Heavy frame","source_section":"Product Description / table"}]}}') returning id,sku_id into a,sku;
  insert into public.oem_ads(factory_id,source_url,title,model,content_hash)
    values(f,'https://hierarchy-fixture.test/b','Light Commercial press','tn114','fixture') returning id into b;
  if (select sku_id from public.oem_ads where id=b) <> sku then raise exception 'Duplicate SKU'; end if;
  if (select count(*) from public.oem_skus where factory_id=f) <> 1 then raise exception 'SKU count'; end if;
  if (select count(*) from public.oem_sku_usages where sku_id=sku) <> 2 then raise exception 'Usage categories conflated'; end if;
  if (select count(*) from public.oem_sku_variants where sku_id=sku) <> 0 then raise exception 'Invented variants'; end if;
  payload := public.oem_catalog_skus(f);
  if (payload->>'total')::integer <> 1 or jsonb_array_length(payload#>'{items,0,advertisements}')<>2 then raise exception 'Pagination duplicates SKU or loses advertisements'; end if;
  if payload#>>'{items,0,hierarchy,family}' <> 'TN' then raise exception 'TN family'; end if;
  if jsonb_array_length(payload#>'{items,0,hierarchy,usages}') <> 2 then raise exception 'Missing usage evidence'; end if;
  if (public.oem_catalog_skus(f,1,'TN114')->>'total')::integer<>1 then raise exception 'SKU search'; end if;
  insert into public.oem_ads(factory_id,source_url,title,model,content_hash)
    values(f2,'https://hierarchy-other.test/a','Commercial press','TN114','fixture') returning id into c;
  if (select sku_id from public.oem_ads where id=c)=sku then raise exception 'Cross-factory identity'; end if;
  select id into usage from public.oem_sku_usages where sku_id=sku and usage_class='commercial';
  rejected := false;
  begin
    insert into public.oem_sku_variants(sku_id,usage_id,name,evidence_ad_id,evidence_field,source_section,source_value)
      values(sku,usage,'Invented frame',a,'configuration','Product Description / table','Invented frame');
  exception when raise_exception then rejected:=true;
  end;
  if not rejected then raise exception 'Accepted unproven variant'; end if;
  insert into public.oem_sku_variants(sku_id,usage_id,name,evidence_ad_id,evidence_field,source_section,source_value)
    values(sku,usage,'Heavy frame',a,'configuration','Product Description / table','Heavy frame');
  if jsonb_array_length(public.oem_sku_hierarchy(sku)#>'{usages,0,variants}')<>1 then raise exception 'Proven variant missing'; end if;
  update public.oem_ads set deleted_at=now() where id=a;
  if jsonb_array_length(public.oem_sku_hierarchy(sku)->'usages')<>1 then raise exception 'Archived evidence visible'; end if;
  update public.oem_ads set deleted_at=null where id=a;
  update public.oem_ads set title='Home press',attributes='{}' where id=a;
  if jsonb_array_length(public.oem_sku_hierarchy(sku)->'usages')<>1 then raise exception 'Stale usage retained'; end if;
  if not exists(select 1 from public.oem_ad_revisions where ad_id=a and snapshot->>'title'='Commercial press') then raise exception 'Original source snapshot lost'; end if;
  if not exists(select 1 from public.oem_usage_evidence where ad_id=a and not is_current) then raise exception 'Evidence history lost'; end if;
  if (select count(*) from public.oem_sku_variants where sku_id=sku)<>1 then raise exception 'Variant history deleted'; end if;
  insert into public.oem_ads(factory_id,source_url,title,model,content_hash)
    values(f,'https://hierarchy-fixture.test/no-model-1','Home equipment',null,'fixture'),
          (f,'https://hierarchy-fixture.test/no-model-2','Home equipment',null,'fixture');
  if (public.oem_catalog_skus(f)->>'total')::integer<>3 then raise exception 'Unknown models collapsed'; end if;
  insert into public.oem_ads(factory_id,source_url,title,model,content_hash)
    select f,'https://hierarchy-fixture.test/page-'||i,'Home equipment','TEST'||i,'fixture' from generate_series(1,26) i;
  payload := public.oem_catalog_skus(f,2);
  if (payload->>'total')::integer<>29 or jsonb_array_length(payload->'items')<>5 then raise exception 'Pagination total'; end if;
  for n in 1..2 loop
    update public.oem_ads set model=model where factory_id=f;
  end loop;
  if (select count(*) from public.oem_skus where factory_id=f)<>27 then raise exception 'Backfill not idempotent'; end if;
  if exists(select 1 from pg_class where oid in ('public.oem_families'::regclass,'public.oem_skus'::regclass,'public.oem_sku_usages'::regclass,'public.oem_usage_evidence'::regclass,'public.oem_sku_variants'::regclass) and not relrowsecurity) then raise exception 'RLS disabled'; end if;
  if has_table_privilege('anon','public.oem_skus','SELECT') or has_table_privilege('authenticated','public.oem_skus','SELECT') or has_function_privilege('anon','public.oem_catalog_skus(uuid,integer,text,uuid,boolean)','EXECUTE') then raise exception 'Public privileges'; end if;
  if not has_table_privilege('service_role','public.oem_skus','SELECT,INSERT,UPDATE') then raise exception 'Missing service access'; end if;
end;
$$;
select 'catalog hierarchy contract passed' as test;
