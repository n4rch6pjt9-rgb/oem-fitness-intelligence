-- Accept explicit supplier usage declarations in the three previously omitted fields.
create or replace function public.oem_sync_usage_evidence() returns trigger
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
    where s->>'field' in ('application','appliance','use_class','usage','intended_use','use','function','serie')
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


-- Rebuild derived evidence only; source attributes, images, IDs and measures stay intact.
update public.oem_ads a set attributes=a.attributes where exists (select 1 from jsonb_array_elements(coalesce(a.attributes#>'{extraction,specifications}','[]')) s where s->>'field' in ('use','function','serie'));
