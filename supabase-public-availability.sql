-- Run this in Supabase SQL Editor so website visitors can see available units.
-- It only allows public reading of rows marked Available.

drop policy if exists "Public can read available units" on public.owner_availability;
create policy "Public can read available units"
on public.owner_availability for select
using (status = 'Available');
