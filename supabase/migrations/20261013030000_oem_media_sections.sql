alter table public.oem_product_media drop constraint oem_product_media_category_check;
alter table public.oem_product_media add constraint oem_product_media_category_check
  check (category in ('photo','dimensions','construction','colors','accessories','details','description','delivery','video'));
