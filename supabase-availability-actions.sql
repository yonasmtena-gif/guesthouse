-- Run this in Supabase SQL Editor to support Unavailable, update, and delete.

alter table public.owner_availability
drop constraint if exists owner_availability_status_check;

alter table public.owner_availability
add constraint owner_availability_status_check
check (status in ('Available', 'Unavailable', 'Booked', 'Maintenance'));

drop policy if exists "Logged in users can post listings" on public.owner_availability;
create policy "Logged in users can post listings"
on public.owner_availability
for insert
to authenticated
with check (status in ('Available', 'Unavailable', 'Booked', 'Maintenance'));

drop policy if exists "Logged in users can update availability" on public.owner_availability;
create policy "Logged in users can update availability"
on public.owner_availability
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Logged in users can delete availability" on public.owner_availability;
create policy "Logged in users can delete availability"
on public.owner_availability
for delete
to authenticated
using (true);

grant update, delete on public.owner_availability to authenticated;

notify pgrst, 'reload schema';
