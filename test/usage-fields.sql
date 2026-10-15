-- Run inside BEGIN / ROLLBACK after the usage-fields migration.
do $$
declare f uuid; a uuid; field_name text; category text; n integer;
begin
 insert into public.oem_factories(domain,name,source_url) values('usage-fields-fixture.test','Synthetic fixture','https://usage-fields-fixture.test') returning id into f;
 foreach field_name in array array['use','function','serie','type'] loop
  foreach category in array array['Commercial Gym Use','Light Commercial','Not for commercial use'] loop
   insert into public.oem_ads(factory_id,source_url,title,model,content_hash,attributes)
    values(f,'https://usage-fields-fixture.test/'||field_name||'/'||replace(category,' ','-'),'Equipment','FIX'||field_name||replace(category,' ',''),'fixture',jsonb_build_object('extraction',jsonb_build_object('specifications',jsonb_build_array(jsonb_build_object('field',field_name,'value',category,'source_section','Basic Info.'))))) returning id into a;
   select count(*) into n from public.oem_usage_evidence where ad_id=a and is_current;
   if category='Not for commercial use' then if n<>0 then raise exception 'Negation classified';end if;
   else
    if n<>1 then raise exception 'Missing usage';end if;
    if not exists(select 1 from public.oem_usage_evidence e join public.oem_sku_usages u on u.id=e.usage_id where e.ad_id=a and e.field=field_name and e.value=category and e.source_section='Basic Info.' and u.usage_class=case when category='Light Commercial' then 'light_commercial' else 'commercial' end) then raise exception 'Incorrect usage/evidence';end if;
   end if;
  end loop;
 end loop;
 insert into public.oem_ads(factory_id,source_url,title,model,content_hash,attributes) values(f,'https://usage-fields-fixture.test/cert','Equipment','CERT1','fixture','{"extraction":{"specifications":[{"field":"declared_certifications","value":"Commercial CE ISO SGS","source_section":"Basic Info."},{"field":"serie","value":"TN","source_section":"Basic Info."}]}}') returning id into a;
 if exists(select 1 from public.oem_usage_evidence where ad_id=a and is_current) then raise exception 'Certificates/series codes classified';end if;
end;
$$;
select 'usage fields contract passed' as test;
