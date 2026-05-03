-- Run this in Supabase SQL Editor to enable room picture uploads.

alter table public.owner_availability
add column if not exists image_url text;

alter table public.owner_availability
add column if not exists image_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can read property photos" on storage.objects;
create policy "Public can read property photos"
on storage.objects for select
using (bucket_id = 'property-photos');

drop policy if exists "Admins and owners can upload property photos" on storage.objects;
create policy "Admins and owners can upload property photos"
on storage.objects for insert
with check (
  bucket_id = 'property-photos'
  and (
    public.current_user_role() in ('admin', 'owner')
    or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
  )
);
