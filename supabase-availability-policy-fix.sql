-- Run this in Supabase SQL Editor if saving availability says:
-- "new row violates row-level security policy"

drop policy if exists "Owners manage own availability" on public.owner_availability;
create policy "Owners manage own availability"
on public.owner_availability for all
using (
  owner_id = auth.uid()
  or public.current_user_role() = 'admin'
  or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
)
with check (
  owner_id = auth.uid()
  or public.current_user_role() = 'admin'
  or lower(auth.jwt() ->> 'email') in ('yonasmtena@gmail.com', 'yonastena100@gmail.com')
);
