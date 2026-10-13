-- Curated buyer-facing assets only. Uploads are mediated by the operator server.
create table public.oem_product_media (
  id uuid primary key,
  ad_id uuid not null references public.oem_ads(id),
  category text not null check (category in ('photo','dimensions','construction','colors','accessories','video')),
  caption text not null check (length(caption) between 1 and 160),
  object_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp','video/mp4')),
  byte_size bigint not null check (byte_size between 1 and 52428800),
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index oem_product_media_ad on public.oem_product_media(ad_id, created_at, id);
alter table public.oem_product_media enable row level security;
revoke all on public.oem_product_media from anon, authenticated;
grant select, insert, delete on public.oem_product_media to service_role;

-- Public URLs remain usable in exported PDFs; no client write policy is granted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('oem-product-media', 'oem-product-media', true, 52428800,
  array['image/jpeg','image/png','image/webp','video/mp4']);
