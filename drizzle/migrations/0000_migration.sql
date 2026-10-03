
create type public.plan_code as enum ('free','personal','pro','team');
create type public.input_type as enum ('message','email','url','screenshot','qr');
create type public.risk_level as enum ('low','medium','high','critical');
create type public.signal_severity as enum ('low','medium','high');
create type public.threat_category as enum ('phishing','brand_impersonation','account_takeover','payment_scam','fake_support','job_scam','investment_scam','delivery_scam','government_impersonation','qr_phishing','suspicious_attachment','social_engineering','credential_harvesting','ai_manipulation');

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

-- profiles
create table public.profiles (
  id uuid primary key,
  full_name text,
  avatar_url text,
  plan_code public.plan_code not null default 'free',
  monthly_analysis_limit int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();

-- analyses
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  input_type public.input_type not null,
  title text not null,
  raw_input_text text,
  normalized_input_hash text,
  sender_label text,
  claimed_brand text,
  source_url text,
  screenshot_storage_path text,
  risk_score int not null check (risk_score between 0 and 100),
  risk_level public.risk_level not null,
  confidence int not null check (confidence between 0 and 100),
  summary text not null,
  claimed_identity text,
  observed_indicators jsonb not null default '[]'::jsonb,
  uncertainty_notes jsonb not null default '[]'::jsonb,
  safe_to_proceed boolean not null default false,
  is_saved boolean not null default false,
  provider text not null,
  model text not null,
  analysis_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index analyses_user_created on public.analyses(user_id, created_at desc);
grant select, delete on public.analyses to authenticated;
grant update (title, is_saved) on public.analyses to authenticated;
grant all on public.analyses to service_role;
alter table public.analyses enable row level security;
create policy "own analyses read" on public.analyses for select to authenticated using (user_id = auth.uid());
create policy "own analyses update" on public.analyses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own analyses delete" on public.analyses for delete to authenticated using (user_id = auth.uid());
create trigger analyses_updated before update on public.analyses for each row execute function public.set_updated_at();

create or replace function public.owns_analysis(_analysis_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.analyses where id = _analysis_id and user_id = auth.uid())
$$;

create table public.analysis_categories (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  category public.threat_category not null,
  created_at timestamptz not null default now()
);
create table public.analysis_signals (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  title text not null,
  severity public.signal_severity not null,
  evidence text not null default '',
  explanation text not null default '',
  created_at timestamptz not null default now()
);
create table public.analysis_actions (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  action_text text not null,
  action_type text not null default 'recommended',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table public.verification_steps (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  step_text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.analysis_categories, public.analysis_signals, public.analysis_actions, public.verification_steps to authenticated;
grant all on public.analysis_categories, public.analysis_signals, public.analysis_actions, public.verification_steps to service_role;
alter table public.analysis_categories enable row level security;
alter table public.analysis_signals enable row level security;
alter table public.analysis_actions enable row level security;
alter table public.verification_steps enable row level security;
create policy "own cats" on public.analysis_categories for select to authenticated using (public.owns_analysis(analysis_id));
create policy "own signals" on public.analysis_signals for select to authenticated using (public.owns_analysis(analysis_id));
create policy "own actions" on public.analysis_actions for select to authenticated using (public.owns_analysis(analysis_id));
create policy "own steps" on public.verification_steps for select to authenticated using (public.owns_analysis(analysis_id));
create index on public.analysis_categories(analysis_id);
create index on public.analysis_signals(analysis_id);
create index on public.analysis_actions(analysis_id);
create index on public.verification_steps(analysis_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  analysis_id uuid not null references public.analyses(id) on delete cascade,
  report_title text not null,
  generated_at timestamptz not null default now(),
  storage_path text
);
grant select, insert, delete on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "own reports read" on public.reports for select to authenticated using (user_id = auth.uid());
create policy "own reports insert" on public.reports for insert to authenticated with check (user_id = auth.uid() and public.owns_analysis(analysis_id));
create policy "own reports delete" on public.reports for delete to authenticated using (user_id = auth.uid());

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_type text not null,
  analysis_id uuid references public.analyses(id) on delete set null,
  units int not null default 1,
  created_at timestamptz not null default now()
);
create index usage_user_created on public.usage_events(user_id, created_at desc);
grant select on public.usage_events to authenticated;
grant all on public.usage_events to service_role;
alter table public.usage_events enable row level security;
create policy "own usage read" on public.usage_events for select to authenticated using (user_id = auth.uid());

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  plan_code public.plan_code not null default 'free',
  status text not null default 'active',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz not null default date_trunc('month', now()),
  current_period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "own sub read" on public.subscriptions for select to authenticated using (user_id = auth.uid());
create trigger subs_updated before update on public.subscriptions for each row execute function public.set_updated_at();

create table public.data_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  history_enabled boolean not null default true,
  retention_days int check (retention_days is null or retention_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.data_preferences to authenticated;
grant update (history_enabled, retention_days) on public.data_preferences to authenticated;
grant all on public.data_preferences to service_role;
alter table public.data_preferences enable row level security;
create policy "own prefs read" on public.data_preferences for select to authenticated using (user_id = auth.uid());
create policy "own prefs update" on public.data_preferences for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger prefs_updated before update on public.data_preferences for each row execute function public.set_updated_at();

create table public.security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event_type text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.security_events to authenticated;
grant all on public.security_events to service_role;
alter table public.security_events enable row level security;
create policy "own sec read" on public.security_events for select to authenticated using (user_id = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url');
  insert into public.subscriptions (user_id) values (new.id);
  insert into public.data_preferences (user_id) values (new.id);
  insert into public.security_events (user_id, event_type) values (new.id, 'account_created');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
