-- LegalUp Pro — Prospección automática diaria
-- FASE 6A: persistencia, idempotencia, supresión y bloqueo de ejecución.
--
-- Diseño:
-- - Todo el acceso es server-side con service_role. RLS habilitado sin políticas
--   para anon/authenticated (deny por defecto).
-- - La ejecución diaria se identifica con run_key único (`scheduled:YYYY-MM-DD`
--   en America/Santiago). El claim usa un lock con vencimiento en la fila única
--   de settings, atómico y seguro entre instancias.
-- - Un prospecto puede recibir como máximo una campaña inicial: índice único
--   en prospecting_sends(prospect_id). Los reintentos operan sobre la misma fila.
-- - La deduplicación es doble: `dedupe_key` único en prospects y email
--   normalizado único cuando existe.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Configuración (fila única)
-- ---------------------------------------------------------------------------
create table if not exists public.prospecting_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  dry_run boolean not null default true,
  daily_target integer not null default 100 check (daily_target between 1 and 500),
  max_sends_per_run integer not null default 50 check (max_sends_per_run between 0 and 500),
  max_sends_per_day integer not null default 100 check (max_sends_per_day between 0 and 1000),
  schedule_time time not null default '10:00',
  timezone text not null default 'America/Santiago',
  sender_name text not null default 'Juan Guajardo | LegalUp',
  sender_email text not null default 'juan@legalup.cl',
  reply_to text not null default 'juan@legalup.cl',
  app_url text not null default 'https://legalup.cl/pro',
  lock_token uuid,
  lock_until timestamptz,
  last_run_at timestamptz,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.prospecting_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Ejecuciones
-- ---------------------------------------------------------------------------
create table if not exists public.prospecting_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text not null unique,
  trigger text not null check (trigger in ('scheduled', 'manual', 'cron', 'test')),
  mode text not null default 'dry_run' check (mode in ('dry_run', 'send', 'test')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed', 'skipped')),
  requested_by uuid,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  discovered integer not null default 0,
  inserted integer not null default 0,
  eligible integer not null default 0,
  sent integer not null default 0,
  delivered integer not null default 0,
  bounced integer not null default 0,
  complained integer not null default 0,
  failed integer not null default 0,
  skipped integer not null default 0,
  error text,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prospecting_runs_started_idx
  on public.prospecting_runs (started_at desc);
create index if not exists prospecting_runs_status_idx
  on public.prospecting_runs (status);

-- ---------------------------------------------------------------------------
-- Prospectos
-- ---------------------------------------------------------------------------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  email text,
  email_normalized text generated always as (lower(btrim(email))) stored,
  contact_name text,
  role text,
  firm_name text not null,
  website text,
  linkedin_url text,
  city text,
  specialties text[] not null default '{}'::text[],
  description text,
  source text not null,
  source_url text,
  discovered_at timestamptz not null default now(),
  validated_at timestamptz,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'invalid', 'unknown', 'no_email')),
  status text not null default 'new'
    check (status in ('new', 'validated', 'pending_contact', 'excluded', 'contacted', 'bounced', 'complained', 'unsubscribed', 'invalid', 'failed')),
  send_status text not null default 'not_sent'
    check (send_status in ('not_sent', 'queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped', 'simulated', 'unknown')),
  profile_id uuid references public.profiles(id) on delete set null,
  discovered_run_id uuid references public.prospecting_runs(id) on delete set null,
  last_contacted_at timestamptz,
  campaign_count integer not null default 0 check (campaign_count >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospects_email_or_contact_check
    check (email is not null or firm_name <> '')
);

create unique index if not exists prospects_email_normalized_key
  on public.prospects (email_normalized)
  where email_normalized is not null;
create index if not exists prospects_status_idx
  on public.prospects (status, discovered_at desc);
create index if not exists prospects_run_idx
  on public.prospects (discovered_run_id);
create index if not exists prospects_send_status_idx
  on public.prospects (send_status);

-- ---------------------------------------------------------------------------
-- Envíos individuales
-- ---------------------------------------------------------------------------
create table if not exists public.prospecting_sends (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.prospecting_runs(id) on delete cascade,
  prospect_id uuid not null references public.prospects(id) on delete cascade,
  to_email text not null,
  subject text not null,
  html text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'delivered', 'bounced', 'complained', 'failed', 'skipped', 'simulated', 'unknown')),
  provider_message_id text unique,
  idempotency_key text not null unique,
  attempt integer not null default 0 check (attempt >= 0),
  last_error text,
  last_error_transient boolean not null default false,
  sent_at timestamptz,
  delivered_at timestamptz,
  bounced_at timestamptz,
  complained_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una sola campaña inicial por prospecto, para siempre. Los reintentos se
-- hacen sobre esta misma fila (nunca crean una segunda).
create unique index if not exists prospecting_sends_prospect_unique
  on public.prospecting_sends (prospect_id);
create index if not exists prospecting_sends_run_idx
  on public.prospecting_sends (run_id);
create index if not exists prospecting_sends_status_idx
  on public.prospecting_sends (status, created_at desc);
create index if not exists prospecting_sends_sent_at_idx
  on public.prospecting_sends (sent_at desc);

-- ---------------------------------------------------------------------------
-- Lista de supresión persistente
-- ---------------------------------------------------------------------------
create table if not exists public.prospecting_suppressions (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null unique,
  reason text not null
    check (reason in ('unsubscribe', 'bounce', 'complaint', 'manual', 'invalid', 'registered')),
  source text,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists prospecting_suppressions_created_idx
  on public.prospecting_suppressions (created_at desc);

-- ---------------------------------------------------------------------------
-- Eventos del proveedor (Resend), idempotentes por id de Svix
-- ---------------------------------------------------------------------------
create table if not exists public.prospecting_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  event_type text not null,
  provider_message_id text,
  email_normalized text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists prospecting_events_message_idx
  on public.prospecting_events (provider_message_id);

-- ---------------------------------------------------------------------------
-- Claim atómico de ejecución.
-- Devuelve claimed=false si ya existe el run_key o si hay un lock vigente.
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_claim_run(
  p_run_key text,
  p_trigger text,
  p_mode text,
  p_actor uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_token uuid;
  v_run public.prospecting_runs;
begin
  if p_trigger not in ('scheduled', 'manual', 'cron', 'test') then
    return jsonb_build_object('claimed', false, 'reason', 'invalid_trigger');
  end if;
  if p_mode not in ('dry_run', 'send', 'test') then
    return jsonb_build_object('claimed', false, 'reason', 'invalid_mode');
  end if;

  update public.prospecting_settings
     set lock_token = gen_random_uuid(),
         lock_until = now() + interval '2 hours',
         updated_at = now()
   where id = 1
     and (lock_until is null or lock_until < now())
  returning lock_token into v_lock_token;

  if v_lock_token is null then
    return jsonb_build_object('claimed', false, 'reason', 'locked');
  end if;

  insert into public.prospecting_runs (run_key, trigger, mode, status, requested_by)
  values (p_run_key, p_trigger, p_mode, 'running', p_actor)
  on conflict (run_key) do update
     set status = 'running',
         trigger = excluded.trigger,
         mode = excluded.mode,
         requested_by = excluded.requested_by,
         started_at = now(),
         finished_at = null,
         error = null,
         summary = coalesce(public.prospecting_runs.summary, '{}'::jsonb)
                   || jsonb_build_object('retried_at', now())
   where public.prospecting_runs.status in ('failed', 'skipped')
  returning * into v_run;

  if v_run.id is null then
    update public.prospecting_settings
       set lock_token = null, lock_until = null, updated_at = now()
     where id = 1 and lock_token = v_lock_token;
    return jsonb_build_object('claimed', false, 'reason', 'already_exists');
  end if;

  update public.prospecting_settings
     set last_run_at = now(), updated_by = p_actor, updated_at = now()
   where id = 1;

  return jsonb_build_object(
    'claimed', true,
    'lock_token', v_lock_token,
    'run', to_jsonb(v_run)
  );
end;
$$;

revoke all on function public.prospecting_claim_run(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.prospecting_claim_run(text, text, text, uuid) to service_role;

create or replace function public.prospecting_release_lock(p_lock_token uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.prospecting_settings
     set lock_token = null,
         lock_until = null,
         updated_at = now()
   where id = 1
     and lock_token = p_lock_token;
$$;

revoke all on function public.prospecting_release_lock(uuid) from public, anon, authenticated;
grant execute on function public.prospecting_release_lock(uuid) to service_role;

-- Marca runs atascados (proceso caído) para que el scheduler pueda recuperar.
create or replace function public.prospecting_recover_stale_runs(p_timezone text default 'America/Santiago')
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.prospecting_runs
     set status = 'failed',
         finished_at = now(),
         error = coalesce(error, 'stale_run_recovered'),
         summary = summary || jsonb_build_object('recovered_at', now(), 'reason', 'stale_run')
   where status = 'running'
     and started_at < now() - interval '2 hours';
  get diagnostics v_count = row_count;

  update public.prospecting_sends
     set status = 'failed',
         last_error = coalesce(last_error, 'stale_sending_recovered'),
         last_error_transient = true,
         updated_at = now()
   where status = 'sending'
     and updated_at < now() - interval '2 hours';

  update public.prospecting_sends
     set status = 'failed',
         last_error = coalesce(last_error, 'stale_queued_recovered'),
         last_error_transient = true,
         updated_at = now()
   where status = 'queued'
     and created_at < now() - interval '10 minutes';

  update public.prospecting_settings
     set lock_token = null, lock_until = null, updated_at = now()
   where id = 1
     and (lock_until is null or lock_until < now());

  return v_count;
end;
$$;

revoke all on function public.prospecting_recover_stale_runs(text) from public, anon, authenticated;
grant execute on function public.prospecting_recover_stale_runs(text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS: deny por defecto a anon/authenticated. service_role bypassa RLS.
-- El panel administrativo consume estos datos vía backend con service_role.
-- ---------------------------------------------------------------------------
alter table public.prospecting_settings enable row level security;
alter table public.prospecting_runs enable row level security;
alter table public.prospects enable row level security;
alter table public.prospecting_sends enable row level security;
alter table public.prospecting_suppressions enable row level security;
alter table public.prospecting_events enable row level security;

revoke all on public.prospecting_settings from anon, authenticated;
revoke all on public.prospecting_runs from anon, authenticated;
revoke all on public.prospects from anon, authenticated;
revoke all on public.prospecting_sends from anon, authenticated;
revoke all on public.prospecting_suppressions from anon, authenticated;
revoke all on public.prospecting_events from anon, authenticated;

grant all on public.prospecting_settings to service_role;
grant all on public.prospecting_runs to service_role;
grant all on public.prospects to service_role;
grant all on public.prospecting_sends to service_role;
grant all on public.prospecting_suppressions to service_role;
grant all on public.prospecting_events to service_role;

comment on table public.prospects is
  'Prospectos de LegalUp Pro descubiertos desde fuentes públicas. Acceso solo service_role.';
comment on table public.prospecting_sends is
  'Envío único por prospecto. idempotency_key y provider_message_id evitan duplicados.';
comment on table public.prospecting_suppressions is
  'Lista de supresión persistente (bajas, rebotes, quejas). Nunca se contacta un email presente aquí.';
