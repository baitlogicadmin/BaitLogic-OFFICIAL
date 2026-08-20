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

create or replace function public.claim_baitlogic_submission_slot(
  p_fingerprint text,
  p_kind text
)
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

  if recent_count >= submission_limit then
    return false;
  end if;

  insert into public.submission_rate_limits (fingerprint, kind)
  values (p_fingerprint, p_kind);
  return true;
end;
$$;

revoke all on function public.claim_baitlogic_submission_slot(text, text) from public, anon, authenticated;
grant execute on function public.claim_baitlogic_submission_slot(text, text) to service_role;

drop policy if exists "public can submit area-only field checks" on public.field_checks;
drop policy if exists "public can join weekly email" on public.weekly_signups;
revoke insert on table public.field_checks from anon, authenticated;
revoke insert on table public.weekly_signups from anon, authenticated;

alter table public.weekly_signups
  add column if not exists status text not null default 'subscribed',
  add column if not exists last_sent_at timestamptz,
  add column if not exists unsubscribed_at timestamptz;

alter table public.weekly_signups
  drop constraint if exists weekly_signups_status_check;

alter table public.weekly_signups
  add constraint weekly_signups_status_check check (status in ('subscribed', 'unsubscribed'));

update public.weekly_signups set email = lower(email);
create unique index if not exists weekly_signups_email_lower_key on public.weekly_signups (lower(email));
