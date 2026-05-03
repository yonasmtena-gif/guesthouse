-- Run this in Supabase SQL Editor to enable the Admin Host feature.

create table if not exists public.host_applications (
  id bigint generated always as identity primary key,
  host_name text not null,
  host_email text,
  host_phone text,
  property_name text not null,
  host_status text not null default 'New' check (host_status in ('New', 'Contacted', 'Approved', 'Rejected')),
  created_at timestamptz not null default now()
);

alter table public.host_applications enable row level security;

drop policy if exists "Admins manage host applications" on public.host_applications;
create policy "Admins manage host applications"
on public.host_applications for all
using (public.current_user_role() = 'admin' or lower(auth.jwt() ->> 'email') = 'yonasmtena@gmail.com')
with check (public.current_user_role() = 'admin' or lower(auth.jwt() ->> 'email') = 'yonasmtena@gmail.com');
