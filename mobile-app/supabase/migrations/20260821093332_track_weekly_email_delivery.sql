alter table public.weekly_signups
  add column if not exists welcome_status text not null default 'pending',
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists last_delivery_attempt_at timestamptz,
  add column if not exists last_delivery_error text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.weekly_signups
  drop constraint if exists weekly_signups_welcome_status_check;

alter table public.weekly_signups
  add constraint weekly_signups_welcome_status_check
  check (welcome_status in ('pending', 'sent', 'failed', 'not_configured'));
