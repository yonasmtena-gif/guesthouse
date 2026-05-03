-- Run this in Supabase SQL Editor if admin/owner posting says:
-- "new row violates row-level security policy"

drop policy if exists "Logged in users can post availability" on public.owner_availability;
create policy "Logged in users can post availability"
on public.owner_availability for insert
to authenticated
with check (true);

drop policy if exists "Logged in users can upload photos" on storage.objects;
create policy "Logged in users can upload photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'guesthouse');
