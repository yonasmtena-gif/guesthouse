-- Run this in Supabase SQL Editor.
-- Then create Auth users in Supabase Auth and insert their roles in public.profiles.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'owner')),
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_availability (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  property_name text not null,
  available_from date not null,
  available_to date not null,
  nightly_price numeric(12, 2) not null,
  status text not null check (status in ('Available', 'Booked', 'Maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id bigint generated always as identity primary key,
  guest_name text not null,
  guest_email text,
  property_name text not null,
  check_in date,
  check_out date,
  deposit_status text not null default 'Pending',
  booking_status text not null default 'Review',
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists owner_availability_touch_updated_at on public.owner_availability;
create trigger owner_availability_touch_updated_at
before update on public.owner_availability
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.owner_availability enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
on public.profiles for select
using (id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Admins manage profiles" on public.profiles;
create policy "Admins manage profiles"
on public.profiles for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Owners manage own availability" on public.owner_availability;
create policy "Owners manage own availability"
on public.owner_availability for all
using (owner_id = auth.uid() or public.current_user_role() = 'admin')
with check (owner_id = auth.uid() or public.current_user_role() = 'admin');

drop policy if exists "Public can read available units" on public.owner_availability;
create policy "Public can read available units"
on public.owner_availability for select
using (status = 'Available');

drop policy if exists "Admins manage bookings" on public.bookings;
create policy "Admins manage bookings"
on public.bookings for all
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

-- After creating users in Authentication, add rows like these with real user IDs:
-- insert into public.profiles (id, email, role, full_name)
-- values ('USER_UUID_FROM_AUTH', 'you@example.com', 'admin', 'Your Name');
--
-- insert into public.profiles (id, email, role, full_name)
-- values ('OWNER_UUID_FROM_AUTH', 'owner@example.com', 'owner', 'Owner Name');
