-- Run this in Supabase SQL Editor to save Airbnb-style listing details.

alter table public.owner_availability
add column if not exists location text;

alter table public.owner_availability
add column if not exists bedrooms integer;

alter table public.owner_availability
add column if not exists max_guests integer;

alter table public.owner_availability
add column if not exists features text[] not null default '{}';

alter table public.owner_availability
drop constraint if exists owner_availability_status_check;

alter table public.owner_availability
add constraint owner_availability_status_check
check (status in ('Available', 'Unavailable', 'Booked', 'Maintenance'));

grant select on public.owner_availability to anon, authenticated;
grant insert, update, delete on public.owner_availability to authenticated;

notify pgrst, 'reload schema';
