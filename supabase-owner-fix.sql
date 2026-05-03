-- Run this in Supabase SQL Editor if the owner login says the profile is missing.
-- It connects the existing Auth user to the owner portal.

insert into public.profiles (id, email, role, full_name)
select id, email, 'owner', 'Owner'
from auth.users
where lower(email) = lower('yonastena100@gmail.com')
on conflict (id) do update
set role = 'owner',
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);
