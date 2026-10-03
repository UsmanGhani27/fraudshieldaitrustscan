
alter table public.analyses add column if not exists primary_threat public.threat_category;
alter table public.analyses add column if not exists verification_status text not null default 'unverified';
alter table public.analyses add column if not exists details jsonb not null default '{}'::jsonb;
alter table public.analyses add column if not exists evidence_deleted_at timestamptz;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null,
  severity text not null default 'info',
  title text not null,
  body text not null default '',
  analysis_id uuid references public.analyses(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_user_created on public.alerts(user_id, created_at desc);
grant select, delete on public.alerts to authenticated;
grant update (read_at) on public.alerts to authenticated;
grant all on public.alerts to service_role;
alter table public.alerts enable row level security;
create policy "own alerts read" on public.alerts for select to authenticated using (user_id = auth.uid());
create policy "own alerts update" on public.alerts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own alerts delete" on public.alerts for delete to authenticated using (user_id = auth.uid());

alter table public.data_preferences alter column retention_days drop default;
