-- Run this in Supabase SQL Editor to support Available/Not Available,
-- one-button updates, delete, and owner/admin visibility.

alter table public.owner_availability
drop constraint if exists owner_availability_status_check;

alter table public.owner_availability
add constraint owner_availability_status_check
check (status in ('Available', 'Unavailable', 'Booked', 'Maintenance'));

drop policy if exists "Logged in users can post listings" on public.owner_availability;
drop policy if exists "Logged in users can post availability" on public.owner_availability;
drop policy if exists "Owners manage own availability" on public.owner_availability;
drop policy if exists "Public can read available units" on public.owner_availability;
drop policy if exists "Owner and admin can read availability" on public.owner_availability;
drop policy if exists "Owner and admin can post availability" on public.owner_availability;
drop policy if exists "Logged in users can update availability" on public.owner_availability;
drop policy if exists "Owner and admin can update availability" on public.owner_availability;
drop policy if exists "Logged in users can delete availability" on public.owner_availability;
drop policy if exists "Owner and admin can delete availability" on public.owner_availability;

create policy "Public can read available units"
on public.owner_availability
for select
to anon, authenticated
using (
  status = 'Available'
  or owner_id = (select auth.uid())
  or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
);

create policy "Logged in users can post listings"
on public.owner_availability
for insert
to authenticated
with check (
  status in ('Available', 'Unavailable', 'Booked', 'Maintenance')
  and (
    owner_id = (select auth.uid())
    or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
  )
);

create policy "Logged in users can update availability"
on public.owner_availability
for update
to authenticated
using (
  owner_id = (select auth.uid())
  or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
)
with check (
  status in ('Available', 'Unavailable', 'Booked', 'Maintenance')
  and (
    owner_id = (select auth.uid())
    or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
  )
);

create policy "Logged in users can delete availability"
on public.owner_availability
for delete
to authenticated
using (
  owner_id = (select auth.uid())
  or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
);

grant select on public.owner_availability to anon, authenticated;
grant insert, update, delete on public.owner_availability to authenticated;

notify pgrst, 'reload schema';
