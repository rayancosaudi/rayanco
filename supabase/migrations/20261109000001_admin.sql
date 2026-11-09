-- Rayanco: admin support (CLAUDE.md §7 build step 6).
-- Slugs are generated in the database so the client never has to make (or can't fake) one.
--  * on insert: slug = {title}-{year}-{ref}
--  * on update: regenerated from title/year while the listing has never been public;
--    once published the slug is frozen (changing it would need a redirect, which the
--    existing listings_redirects trigger handles if the owner ever edits it by hand).

create function private.slugify(t text) returns text
language sql immutable set search_path = '' as $$
  select trim(both '-' from regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create function private.listing_slug(p_title text, p_year int, p_ref text) returns text
language sql immutable set search_path = '' as $$
  select concat_ws('-',
    nullif(left(private.slugify(p_title), 80), ''),
    p_year::text,
    private.slugify(p_ref));
$$;

create function private.listings_set_slug() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.slug is null or new.slug = '' then
      new.slug := private.listing_slug(new.title_en, new.year, new.ref_code);
    end if;
  elsif old.published_at is null
    and new.slug is not distinct from old.slug
    and (new.title_en is distinct from old.title_en or new.year is distinct from old.year) then
    new.slug := private.listing_slug(new.title_en, new.year, new.ref_code);
  end if;
  -- trim() can leave a trailing '-' if the title was cut at 80 chars mid-separator.
  new.slug := trim(both '-' from regexp_replace(new.slug, '-+', '-', 'g'));
  return new;
end;
$$;

create trigger listings_set_slug
  before insert or update on public.listings
  for each row execute function private.listings_set_slug();

-- Staff must not be able to change who created a listing or its ref code.
create function private.listings_guard_immutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.ref_code := old.ref_code;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;

create trigger listings_guard_immutable
  before update on public.listings
  for each row execute function private.listings_guard_immutable();
