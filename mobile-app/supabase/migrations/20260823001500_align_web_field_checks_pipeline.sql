alter table public.field_checks add column if not exists display_name text not null default 'Community member';

alter table public.field_checks drop constraint if exists field_checks_category_check;
alter table public.field_checks add constraint field_checks_category_check check (
  category in ('Water','Wildlife','Habitat','Access','Fishing','Something Cool','Something Strange','Trail','Weather','Conservation')
);

insert into public.field_checks (
  client_id,
  category,
  note,
  place,
  display_name,
  location_precision,
  moderation_status,
  created_at,
  updated_at
)
select
  'legacy-report-' || id::text,
  case
    when category in ('Water','Wildlife','Habitat','Access','Fishing','Something Cool','Something Strange','Trail','Weather','Conservation') then category
    else 'Something Strange'
  end,
  left(report, 500),
  left(coalesce(nullif(water,''),'Local area'),120),
  left(coalesce(nullif(name,''),'Community member'),60),
  'area_only',
  'pending',
  coalesce(created_at, now()),
  now()
from public.reports
where id is not null
on conflict (client_id) do nothing;
