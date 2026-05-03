-- Emergency fix if posting still says:
-- "new row violates row-level security policy"
--
-- This disables RLS only for the availability listing table so logged-in admin/owner
-- posting works immediately. Use this while the app is still private/prototype.

alter table public.owner_availability disable row level security;

drop policy if exists "Logged in users can upload photos" on storage.objects;
create policy "Logged in users can upload photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'guesthouse');

drop policy if exists "Public can read property photos" on storage.objects;
create policy "Public can read property photos"
on storage.objects for select
using (bucket_id = 'guesthouse');
