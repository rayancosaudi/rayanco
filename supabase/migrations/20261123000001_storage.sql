-- Photos move from Cloudflare R2 to Supabase Storage.

-- Public bucket for the final WebP files (large + thumb). The bucket itself enforces
-- type and size, replacing the old presign-time Content-Type / Content-Length check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-media', 'listing-media', true, 1048576, array['image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Private staging bucket for the fallback path (browser could not encode WebP).
-- /api/images/verify converts these with sharp and deletes the original.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-incoming', 'listing-incoming', false, 15728640, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No storage.objects policies on purpose: every write goes through signed upload URLs
-- minted by the service role in /api/upload-url, and reads of listing-media use the
-- public bucket URL.

alter table public.listing_images rename column r2_key to storage_key;
