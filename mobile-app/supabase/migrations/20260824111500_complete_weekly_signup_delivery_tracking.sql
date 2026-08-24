alter table public.weekly_signups
  add column if not exists name text,
  add column if not exists welcome_sent_at timestamptz,
  add column if not exists welcome_message_id text,
  add column if not exists welcome_error text,
  add column if not exists admin_notified_at timestamptz,
  add column if not exists admin_message_id text,
  add column if not exists admin_error text;

comment on column public.weekly_signups.name is
  'Optional subscriber display name captured by BaitLogic signup forms.';

comment on column public.weekly_signups.admin_notified_at is
  'Timestamp when BaitLogic admin notification email was successfully accepted by the email provider.';
