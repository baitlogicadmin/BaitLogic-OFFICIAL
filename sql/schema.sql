create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  email text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  home_water text,
  interest text,
  source text not null default 'pwa',
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  water text not null,
  species text,
  report text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.catches (
  id uuid primary key default gen_random_uuid(),
  name text,
  species text not null,
  weight text,
  location text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx on public.reports(status, created_at desc);
create index if not exists catches_status_created_idx on public.catches(status, created_at desc);
create index if not exists waitlist_created_idx on public.waitlist_signups(created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where email = auth.email()
      and active = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.reports to anon, authenticated;
grant select, insert, update on public.catches to anon, authenticated;
grant select, insert on public.waitlist_signups to anon, authenticated;
grant select on public.admin_users to authenticated;

alter table public.admin_users enable row level security;
alter table public.waitlist_signups enable row level security;
alter table public.reports enable row level security;
alter table public.catches enable row level security;

drop policy if exists admin_users_select_self_or_admin on public.admin_users;
create policy admin_users_select_self_or_admin
on public.admin_users
for select
using (email = auth.email() or public.is_admin());

drop policy if exists signups_public_insert on public.waitlist_signups;
create policy signups_public_insert
on public.waitlist_signups
for insert
with check (true);

drop policy if exists signups_admin_read on public.waitlist_signups;
create policy signups_admin_read
on public.waitlist_signups
for select
using (public.is_admin());

drop policy if exists reports_public_read_approved on public.reports;
create policy reports_public_read_approved
on public.reports
for select
using (status = 'approved' or public.is_admin());

drop policy if exists reports_public_insert on public.reports;
create policy reports_public_insert
on public.reports
for insert
with check (status = 'pending');

drop policy if exists reports_admin_update on public.reports;
create policy reports_admin_update
on public.reports
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists catches_public_read_approved on public.catches;
create policy catches_public_read_approved
on public.catches
for select
using (status = 'approved' or public.is_admin());

drop policy if exists catches_public_insert on public.catches;
create policy catches_public_insert
on public.catches
for insert
with check (status = 'pending');

drop policy if exists catches_admin_update on public.catches;
create policy catches_admin_update
on public.catches
for update
using (public.is_admin())
with check (public.is_admin());

insert into public.admin_users(email)
values ('baitlogic@outlook.com')
on conflict (email) do nothing;

insert into public.reports(name, water, species, report, status, approved_at, created_at)
values
  ('Mike R.', 'Horseshoe Lake', 'Largemouth Bass', '5lb largemouth on a jig at Horseshoe Lake', 'approved', now(), now() - interval '2 hours'),
  ('Sarah T.', 'Carlyle Lake', 'Crappie', 'Crappie stacked at 12ft, Carlyle Lake brush piles', 'approved', now(), now() - interval '4 hours'),
  ('Dan W.', 'Mel Price', 'Channel Catfish', 'Channel cats hitting cut shad below Mel Price', 'approved', now(), now() - interval '6 hours')
on conflict do nothing;

insert into public.catches(name, species, weight, location, notes, status, approved_at, created_at)
values
  ('Local Angler', 'Largemouth Bass', '4lb 8oz', 'Rend Lake', 'Spinnerbait near grass edge', 'approved', now(), now() - interval '5 hours')
on conflict do nothing;
