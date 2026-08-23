-- BaitLogic production schema reference.
-- Public writes stay closed; submit-baitlogic-signal validates and rate-limits writes with service_role.
-- Uses explicit grants because new Supabase projects no longer expose public tables automatically.

create table if not exists public.field_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid() references auth.users(id) on delete cascade,
  client_id text not null unique,
  category text not null check (category in ('Water', 'Wildlife', 'Habitat', 'Access', 'Fishing', 'Something Cool', 'Something Strange', 'Trail', 'Weather', 'Conservation')),
  note text not null check (char_length(note) between 2 and 500),
  place text not null check (char_length(place) between 2 and 120),
  display_name text not null default 'Community member',
  location_precision text not null default 'area_only' check (location_precision = 'area_only'),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.field_checks enable row level security;
revoke all on table public.field_checks from anon, authenticated;
grant select on table public.field_checks to anon, authenticated;
grant select, insert, update, delete on table public.field_checks to service_role;

create index field_checks_owner_id_idx on public.field_checks (owner_id);
create index field_checks_approved_created_at_idx
on public.field_checks (created_at desc)
where moderation_status = 'approved';

create policy "public can read approved field checks"
on public.field_checks for select
to anon, authenticated
using (
  moderation_status = 'approved'
  or owner_id = (select auth.uid())
);

create table if not exists public.weekly_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  source text not null default 'baitlogic_app',
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  last_sent_at timestamptz,
  unsubscribed_at timestamptz
);

alter table public.weekly_signups enable row level security;
revoke all on table public.weekly_signups from anon, authenticated;
grant select, insert, update, delete on table public.weekly_signups to service_role;

create unique index if not exists weekly_signups_email_lower_key on public.weekly_signups (lower(email));

create table if not exists public.submission_rate_limits (
  id bigint generated always as identity primary key,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('field_checks', 'weekly_signup')),
  created_at timestamptz not null default now()
);

alter table public.submission_rate_limits enable row level security;
revoke all on table public.submission_rate_limits from public, anon, authenticated;
revoke all on sequence public.submission_rate_limits_id_seq from public, anon, authenticated;
grant select, insert, delete on table public.submission_rate_limits to service_role;
grant usage, select on sequence public.submission_rate_limits_id_seq to service_role;

create index if not exists submission_rate_limits_window_idx
on public.submission_rate_limits (fingerprint, kind, created_at desc);

create or replace function public.claim_baitlogic_submission_slot(p_fingerprint text, p_kind text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  recent_count integer;
  submission_limit integer;
begin
  if p_fingerprint !~ '^[0-9a-f]{64}$' or p_kind not in ('field_checks', 'weekly_signup') then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_fingerprint || ':' || p_kind, 0));
  delete from public.submission_rate_limits where created_at < now() - interval '24 hours';
  submission_limit := case when p_kind = 'field_checks' then 12 else 4 end;

  select count(*) into recent_count
  from public.submission_rate_limits
  where fingerprint = p_fingerprint
    and kind = p_kind
    and created_at >= now() - interval '1 hour';

  if recent_count >= submission_limit then return false; end if;
  insert into public.submission_rate_limits (fingerprint, kind) values (p_fingerprint, p_kind);
  return true;
end;
$$;

revoke all on function public.claim_baitlogic_submission_slot(text, text) from public, anon, authenticated;
grant execute on function public.claim_baitlogic_submission_slot(text, text) to service_role;
