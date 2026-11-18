-- Bloque 3 / Fase 1: guard del ledger de prospección.
-- Aplicar y CONFIRMAR esta migración antes del backfill.
-- Deja prospecting_settings.ledger_ready=false y no habilita claims.

-- LegalUp Pro — Bloque 3 v2.2
-- Ledger diario, asociación de webhooks y recuperación.
-- Migración aditiva. No borra datos operacionales.
-- v2.2 corrige cinco hallazgos de la revisión de v2.1:
--   1. los eventos históricos asociados ejecutan efectos reales;
--   2. bounce/complaint sin email usa el destinatario inequívoco del send;
--   3. las asociaciones ambiguas quedan en needs_review sin efectos;
--   4. se documenta y conserva la semántica real de daily_target;
--   5. el ledger histórico se migra con cutoff y baseline explícitos.
-- Además separa la asociación evento-intento y evita que eventos tardíos
-- de un intento anterior sobrescriban el estado de un intento posterior.
--
-- CANDIDATO DE HARDENING (no aplicar): guard de migración, cronología,
-- baseline sending, triggers de preservación, PII en ingestión, locks y
-- contrato de workers. Ver informe de auditoría para límites y pruebas.

-- ---------------------------------------------------------------------------
-- 0. Preflight
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.prospecting_settings') is null
     or to_regclass('public.prospecting_runs') is null
     or to_regclass('public.prospecting_sends') is null
     or to_regclass('public.prospects') is null
     or to_regclass('public.prospecting_suppressions') is null
     or to_regclass('public.prospecting_events') is null then
    raise exception 'prospecting_base_tables_missing';
  end if;

  -- Si la tabla ya existe (por ejemplo, v2.1 aplicada), se conserva y se le
  -- añaden los índices de v2.2. No se reconstruye ni se borra el ledger.
  if exists (
    select 1
    from public.prospecting_sends
    where nullif(btrim(provider_message_id), '') is not null
    group by nullif(btrim(provider_message_id), '')
    having count(*) > 1
  ) then
    raise exception 'prospecting_sends_duplicate_provider_message_id';
  end if;

  if to_regclass('public.prospecting_send_attempts') is not null then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'prospecting_send_attempts'
        and column_name = 'metadata'
    ) or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'prospecting_send_attempts'
        and column_name = 'campaign_counted_at'
    ) or not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'prospecting_send_attempts'
        and column_name = 'provider_message_id'
    ) then
      raise exception 'prospecting_send_attempts_incompatible';
    end if;

    if exists (
      select 1
      from public.prospecting_send_attempts
      where nullif(btrim(provider_message_id), '') is not null
      group by nullif(btrim(provider_message_id), '')
      having count(*) > 1
    ) then
      raise exception 'prospecting_send_attempts_duplicate_provider_message_id';
    end if;
  end if;
end;
$$;

-- Verificación real de pgcrypto/HMAC. El vector conocido detecta tanto una
-- extensión ausente como un stub que no implemente HMAC-SHA256.
do $$
declare
  v_hmac_name text;
  v_actual text;
begin
  select format('%I.%I', n.nspname, p.proname)
  into v_hmac_name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where p.proname = 'hmac'
    and p.pronargs = 3
    and p.prorettype = 'bytea'::regtype
    and p.proargtypes[0] = 'bytea'::regtype
    and p.proargtypes[1] = 'bytea'::regtype
    and p.proargtypes[2] = 'text'::regtype
    and n.nspname in ('public', 'extensions')
  order by (n.nspname = 'extensions') desc
  limit 1;

  if v_hmac_name is null then
    raise exception 'pgcrypto_hmac_missing';
  end if;

  execute format('select encode(%s($1, $2, $3), ''hex'')', v_hmac_name)
  into v_actual
  using '\x64617461'::bytea, '\x6b6579'::bytea, 'sha256';

  if v_actual <> '5031fe3d989c6d1537a013fa6e739da23463fdaec3b70137d828e36ace221bd0' then
    raise exception 'pgcrypto_hmac_self_test_failed';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 0.b Guard de migración del ledger
-- ---------------------------------------------------------------------------
-- El lock es de sesión, no de transacción: debe sobrevivir a un fallo para que
-- los claims sigan bloqueados hasta que un operador revise y desbloquee. El
-- guard persistente es ledger_ready=false; recovery_pending() también consulta
-- pg_locks para cubrir el caso de un runner que haga rollback de la transacción.
create or replace function public.prospecting_ledger_migration_lock()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if public.prospecting_ledger_migration_active() then
    raise exception 'prospecting_ledger_migration_in_progress';
  end if;
  -- try_* evita esperar si otra sesión tomó el lock entre la comprobación y
  -- la adquisición; el runner debe fallar rápido y reintentar manualmente.
  if not pg_try_advisory_lock(424242, 1) then
    raise exception 'prospecting_ledger_migration_in_progress';
  end if;
end;
$$;

create or replace function public.prospecting_ledger_migration_unlock()
returns boolean
language sql
security invoker
set search_path = public, pg_temp
as $$
  select pg_advisory_unlock(424242, 1);
$$;

create or replace function public.prospecting_ledger_migration_active()
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from pg_locks
    where locktype = 'advisory'
      and classid = 424242
      and objid = 1
      and objsubid = 2
      and granted
  );
$$;

revoke all on function public.prospecting_ledger_migration_lock() from public, anon, authenticated;
revoke all on function public.prospecting_ledger_migration_unlock() from public, anon, authenticated;
revoke all on function public.prospecting_ledger_migration_active() from public, anon, authenticated;
grant execute on function public.prospecting_ledger_migration_lock() to service_role;
grant execute on function public.prospecting_ledger_migration_unlock() to service_role;
grant execute on function public.prospecting_ledger_migration_active() to service_role;

-- ---------------------------------------------------------------------------
-- 1. Settings y eventos: estado de migración y asociación
-- ---------------------------------------------------------------------------
alter table public.prospecting_settings
  add column if not exists ledger_ready boolean not null default false,
  add column if not exists ledger_recovery_at timestamptz,
  add column if not exists ledger_cutoff_at timestamptz,
  add column if not exists recipient_hash_key bytea,
  add column if not exists events_v2_backfilled_at timestamptz;

-- Guard persistente. Aplicar esta migración, confirmar el resultado con
--   select ledger_ready from public.prospecting_settings where id = 1;
-- y sólo después aplicar el backfill en una migración separada. El lock de
-- sesión queda disponible para operaciones manuales, pero la garantía de
-- seguridad es el flag persistente ledger_ready=false.

do $$
begin
  update public.prospecting_settings
  set recipient_hash_key = coalesce(
      recipient_hash_key,
      sha256(convert_to(
        gen_random_uuid()::text || clock_timestamp()::text || random()::text,
        'UTF8'
      ))
    ),
    ledger_ready = false,
    ledger_recovery_at = null,
    events_v2_backfilled_at = null,
    -- No usar coalesce: un cutoff heredado de v2.1 no es válido para este
    -- rebuild. El primer día exacto empieza en la siguiente medianoche local.
    ledger_cutoff_at = (
      date_trunc('day', now() at time zone timezone)
      + interval '1 day'
    ) at time zone timezone,
    updated_at = now()
  where id = 1;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;
end;
$$;


alter table public.prospecting_settings
  alter column recipient_hash_key set not null;

alter table public.prospecting_settings
  drop constraint if exists prospecting_settings_recipient_hash_key_check;
alter table public.prospecting_settings
  add constraint prospecting_settings_recipient_hash_key_check
  check (octet_length(recipient_hash_key) = 32);

comment on column public.prospecting_settings.ledger_ready is
  'false bloquea claims hasta que la migración/recuperación haya dejado el ledger consistente.';
comment on column public.prospecting_settings.ledger_recovery_at is
  'Última recuperación completa del ledger. Auditoría; no sustituye la comprobación de pendientes.';
comment on column public.prospecting_settings.ledger_cutoff_at is
  'Inicio del primer día local con ledger exacto. Antes de este instante los claims se bloquean; los días previos usan baseline histórico, no reconstrucción exacta.';
comment on column public.prospecting_settings.recipient_hash_key is
  'Clave HMAC-SHA256 de 32 bytes para recipient_hash. No exponer a anon/authenticated.';
comment on column public.prospecting_settings.daily_target is
  'Tope diario de elegibles y de envíos planificados. engine.mjs lo aplica junto con max_sends_per_day mediante Math.min; el SQL replica esa semántica con least().';

alter table public.prospecting_events
  add column if not exists association_status text not null default 'pending',
  add column if not exists matched_send_id uuid,
  add column if not exists processed_at timestamptz,
  add column if not exists process_attempts integer not null default 0
    check (process_attempts >= 0),
  add column if not exists last_process_error text,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists suppression_applied_at timestamptz,
  add column if not exists association_evaluated_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.prospecting_events
  drop constraint if exists prospecting_events_association_status_check;
alter table public.prospecting_events
  add constraint prospecting_events_association_status_check
  check (association_status in (
    'pending', 'matched', 'unmatched', 'ignored', 'expired',
    'needs_review', 'suppressed'
  ));

create index if not exists prospecting_events_pending_idx
  on public.prospecting_events (association_status, next_attempt_at)
  where processed_at is null;

comment on column public.prospecting_events.association_status is
  'pending/unmatched: evento aún asociable. needs_review: histórico sin resolución automática; no se reprocesa. suppressed: rebote/queja sin send pero con supresión efectiva. matched/ignored/expired/suppressed: procesado.';
comment on column public.prospecting_events.association_evaluated_at is
  'Marca de evaluación por v2.2. Permite reprocesar una sola vez eventos que v2.1 marcó processed sin aplicar efectos, y evita reprocesar needs_review en reruns.';

-- ---------------------------------------------------------------------------
-- 2. Ledger de intentos
-- ---------------------------------------------------------------------------
create table if not exists public.prospecting_send_attempts (
  id uuid primary key default gen_random_uuid(),
  send_id uuid not null,
  run_id uuid not null,
  prospect_id uuid not null,
  attempt_no integer not null check (attempt_no >= 1),
  day_key date not null,
  timezone text not null check (btrim(timezone) <> ''),
  state text not null default 'reserved'
    check (state in ('reserved', 'consumed', 'released')),
  provider_contacted boolean not null default false,
  campaign_counted_at timestamptz,
  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  consume_reason text,
  release_reason text,
  provider_message_id text,
  recipient_hash text,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospecting_send_attempts_consumed_check
    check (state <> 'consumed' or consumed_at is not null),
  constraint prospecting_send_attempts_released_check
    check (state <> 'released' or released_at is not null)
);

-- Normaliza ids heredados antes de crear el índice único de v2.2.
update public.prospecting_send_attempts
set provider_message_id = nullif(btrim(provider_message_id), ''),
    updated_at = now()
where provider_message_id is not null
  and provider_message_id is distinct from nullif(btrim(provider_message_id), '');

create unique index if not exists prospecting_send_attempts_send_attempt_key
  on public.prospecting_send_attempts (send_id, attempt_no);

create unique index if not exists prospecting_send_attempts_one_reserved_key
  on public.prospecting_send_attempts (send_id)
  where state = 'reserved';

create index if not exists prospecting_send_attempts_day_state_idx
  on public.prospecting_send_attempts (day_key, state);

create index if not exists prospecting_send_attempts_run_day_idx
  on public.prospecting_send_attempts (run_id, day_key);

create index if not exists prospecting_send_attempts_prospect_idx
  on public.prospecting_send_attempts (prospect_id);

create unique index if not exists prospecting_send_attempts_message_key
  on public.prospecting_send_attempts (provider_message_id)
  where provider_message_id is not null;

create unique index if not exists prospecting_send_attempts_baseline_key
  on public.prospecting_send_attempts (send_id)
  where (metadata ->> 'ledger_baseline') = 'true';

create index if not exists prospecting_send_attempts_reserved_idx
  on public.prospecting_send_attempts (reserved_at)
  where state = 'reserved';

comment on table public.prospecting_send_attempts is
  'Ledger de reservas/consumo diario. Sin FK a sends/runs ni ON DELETE CASCADE: el cupo sobrevive al archivo o borrado operacional. Las filas con metadata.ledger_baseline=true son un baseline histórico explícito, no una reconstrucción exacta de cada intento.';

-- ---------------------------------------------------------------------------
-- 3. Helpers
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_send_status_rank(p_status text)
returns integer
language sql
immutable
as $$
  select case p_status
    when 'queued' then 0
    when 'sending' then 1
    when 'skipped' then 1
    when 'failed' then 2
    when 'unknown' then 3
    when 'sent' then 4
    when 'delivered' then 5
    when 'bounced' then 6
    when 'complained' then 7
    else -1
  end;
$$;

create or replace function public.prospecting_sanitize_text(p_text text)
returns text
language sql
immutable
as $$
  select nullif(
    left(
      regexp_replace(
        regexp_replace(coalesce(p_text, ''), '[[:space:]]+', ' ', 'g'),
        '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
        '[email]',
        'g'
      ),
      2000
    ),
    ''
  );
$$;

create or replace function public.prospecting_sanitize_json(
  p_value jsonb,
  p_depth integer default 0
)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_key text;
  v_value jsonb;
  v_item jsonb;
  v_object jsonb := '{}'::jsonb;
  v_array jsonb := '[]'::jsonb;
begin
  if p_value is null then
    return null;
  end if;

  if p_depth >= 8 then
    return to_jsonb('[truncated]'::text);
  end if;

  case jsonb_typeof(p_value)
    when 'object' then
      for v_key, v_value in
        select key, value from jsonb_each(p_value)
      loop
        if lower(v_key) in (
          'email', 'to', 'from', 'recipient', 'recipient_email',
          'recipientemail', 'to_email', 'from_email', 'subject', 'html',
          'text', 'body', 'reply_to', 'reply-to', 'headers', 'cc', 'bcc'
        ) then
          continue;
        end if;

        v_object := v_object || jsonb_build_object(
          v_key,
          public.prospecting_sanitize_json(v_value, p_depth + 1)
        );
      end loop;
      return v_object;

    when 'array' then
      for v_item in
        select value from jsonb_array_elements(p_value)
      loop
        v_array := v_array || jsonb_build_array(
          public.prospecting_sanitize_json(v_item, p_depth + 1)
        );
      end loop;
      return v_array;

    when 'string' then
      return to_jsonb(public.prospecting_sanitize_text(p_value #>> '{}'));

    else
      return p_value;
  end case;
end;
$$;

create or replace function public.prospecting_sanitize_payload(p_payload jsonb)
returns jsonb
language sql
immutable
as $$
  select public.prospecting_sanitize_json(
    coalesce(p_payload, '{}'::jsonb),
    0
  );
$$;

-- Timestamp original del evento, con received_at como respaldo. No se usa la
-- hora de migración para efectos históricos. El clamp a p_now evita fechas
-- futuras por relojes desincronizados.
create or replace function public.prospecting_event_effective_at(
  p_payload jsonb,
  p_received_at timestamptz,
  p_now timestamptz
)
returns timestamptz
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_text text;
  v_at timestamptz;
begin
  v_text := nullif(btrim(coalesce(
    p_payload ->> 'created_at',
    p_payload -> 'data' ->> 'created_at',
    p_payload ->> 'timestamp',
    p_payload -> 'data' ->> 'timestamp',
    ''
  )), '');

  if v_text is not null then
    begin
      v_at := v_text::timestamptz;
    exception when others then
      v_at := null;
    end;
  end if;

  v_at := coalesce(v_at, p_received_at, p_now);
  if p_now is not null and v_at > p_now then
    v_at := p_now;
  end if;
  return v_at;
end;
$$;

revoke all on function public.prospecting_event_effective_at(jsonb, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.prospecting_event_effective_at(jsonb, timestamptz, timestamptz)
  to service_role;

-- Sanitiza también inserciones/updates directos del runtime actual. No sustituye
-- el contrato de ingestión futura, pero evita que payload crudo quede en claro.
create or replace function public.prospecting_events_sanitize_row()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.payload := public.prospecting_sanitize_payload(coalesce(new.payload, '{}'::jsonb));
  new.last_process_error := public.prospecting_sanitize_text(new.last_process_error);
  new.email_normalized := nullif(lower(btrim(coalesce(new.email_normalized, ''))), '');
  return new;
end;
$$;

drop trigger if exists prospecting_events_sanitize_row_trg on public.prospecting_events;
create trigger prospecting_events_sanitize_row_trg
before insert or update of payload, email_normalized, last_process_error
on public.prospecting_events
for each row execute function public.prospecting_events_sanitize_row();

-- Protección de estados para cualquier writer, incluido el runtime actual.
-- No impide que failed->sending (reintento) ocurra; impide degradar terminales.
create or replace function public.prospecting_sends_preserve_status()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.status in ('sent', 'delivered', 'bounced', 'complained')
     and public.prospecting_send_status_rank(new.status)
         < public.prospecting_send_status_rank(old.status) then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists prospecting_sends_preserve_status_trg on public.prospecting_sends;
create trigger prospecting_sends_preserve_status_trg
before update of status
on public.prospecting_sends
for each row execute function public.prospecting_sends_preserve_status();

create or replace function public.prospecting_prospects_preserve_status()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.status = 'unsubscribed'
     and new.status in ('new', 'validated', 'pending_contact', 'contacted', 'bounced', 'failed') then
    new.status := old.status;
  elsif old.status = 'complained'
     and new.status in ('new', 'validated', 'pending_contact', 'contacted', 'bounced', 'failed') then
    new.status := old.status;
  elsif old.status = 'bounced'
     and new.status in ('new', 'validated', 'pending_contact', 'contacted', 'failed') then
    new.status := old.status;
  end if;

  if old.send_status in ('sent', 'delivered', 'bounced', 'complained')
     and public.prospecting_send_status_rank(new.send_status)
         < public.prospecting_send_status_rank(old.send_status) then
    new.send_status := old.send_status;
  end if;
  return new;
end;
$$;

drop trigger if exists prospecting_prospects_preserve_status_trg on public.prospects;
create trigger prospecting_prospects_preserve_status_trg
before update of status, send_status
on public.prospects
for each row execute function public.prospecting_prospects_preserve_status();

create or replace function public.prospecting_recipient_hash(p_email text)
returns text
language plpgsql
security invoker
set search_path = extensions, public, pg_temp
as $$
declare
  v_key bytea;
begin
  if p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  select recipient_hash_key into v_key
  from public.prospecting_settings
  where id = 1;

  if v_key is null then
    raise exception 'recipient_hash_key_missing';
  end if;

  return encode(
    hmac(convert_to(lower(btrim(p_email)), 'UTF8'), v_key, 'sha256'),
    'hex'
  );
end;
$$;

create or replace function public.prospecting_recovery_pending(p_now timestamptz default null)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with clock as (
    select coalesce(p_now, now()) as at
  )
  select
    exists (
      select 1
      from public.prospecting_settings
      where id = 1
        and ledger_ready = false
    )
    or public.prospecting_ledger_migration_active()
    or exists (
      select 1
      from public.prospecting_settings
      where id = 1
        and ledger_cutoff_at is not null
        and (select at from clock) < ledger_cutoff_at
    )
    or exists (
      select 1
      from public.prospecting_sends
      where status = 'sending'
        and updated_at < (select at from clock) - interval '2 hours'
    )
    or exists (
      select 1
      from public.prospecting_sends
      where status = 'failed'
        and last_error = 'stale_sending_recovered'
    )
    or exists (
      select 1
      from public.prospecting_send_attempts
      where state = 'reserved'
        and reserved_at < (select at from clock) - interval '2 hours'
    );
$$;

create or replace function public.prospecting_event_needs_review(
  p_event_id uuid,
  p_reason text,
  p_send_id uuid default null,
  p_suppression_applied_at timestamptz default null,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_reason text := coalesce(
    public.prospecting_sanitize_text(p_reason),
    'needs_review'
  );
begin
  update public.prospecting_events
  set association_status = 'needs_review',
      matched_send_id = p_send_id,
      processed_at = null,
      process_attempts = process_attempts + 1,
      next_attempt_at = v_now,
      last_process_error = v_reason,
      suppression_applied_at = case
        when p_suppression_applied_at is not null then p_suppression_applied_at
        else suppression_applied_at
      end,
      association_evaluated_at = v_now,
      updated_at = v_now
  where id = p_event_id;

  return jsonb_build_object(
    'processed', false,
    'needs_review', true,
    'event_id', p_event_id,
    'send_id', p_send_id,
    'reason', v_reason
  );
end;
$$;

create or replace function public.prospecting_suppression_reason_rank(p_reason text)
returns integer
language sql
immutable
as $$
  select case p_reason
    when 'manual' then 50
    when 'registered' then 50
    when 'complaint' then 40
    when 'invalid' then 30
    when 'unsubscribe' then 20
    when 'bounce' then 10
    else 0
  end;
$$;

create or replace function public.prospecting_suppressions_preserve_reason()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if public.prospecting_suppression_reason_rank(new.reason)
     < public.prospecting_suppression_reason_rank(old.reason) then
    new.reason := old.reason;
    new.source := old.source;
    new.note := old.note;
  end if;
  return new;
end;
$$;

drop trigger if exists prospecting_suppressions_preserve_reason_trg
  on public.prospecting_suppressions;
create trigger prospecting_suppressions_preserve_reason_trg
before update of reason, source, note
on public.prospecting_suppressions
for each row execute function public.prospecting_suppressions_preserve_reason();

create or replace function public.prospecting_apply_suppression(
  p_email text,
  p_reason text,
  p_source text default 'system',
  p_note text default null,
  p_created_by uuid default null,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_id uuid;
  v_reason text;
  v_previous_reason text;
  v_applied boolean := false;
  v_now timestamptz := coalesce(p_now, now());
begin
  if v_email is null then
    return jsonb_build_object('applied', false, 'reason', 'email_missing');
  end if;

  if public.prospecting_suppression_reason_rank(p_reason) <= 0 then
    raise exception 'invalid_suppression_reason';
  end if;

  select reason into v_previous_reason
  from public.prospecting_suppressions
  where email_normalized = v_email
  for update;

  insert into public.prospecting_suppressions (
    email_normalized,
    reason,
    source,
    note,
    created_by,
    created_at
  )
  values (
    v_email,
    p_reason,
    left(coalesce(p_source, 'system'), 200),
    left(public.prospecting_sanitize_text(p_note), 1000),
    p_created_by,
    v_now
  )
  on conflict (email_normalized) do update
  set reason = excluded.reason,
      source = excluded.source,
      note = excluded.note
  where public.prospecting_suppression_reason_rank(excluded.reason)
      > public.prospecting_suppression_reason_rank(public.prospecting_suppressions.reason)
  returning id, reason into v_id, v_reason;

  if v_id is not null then
    v_applied := true;
  else
    select id, reason into v_id, v_reason
    from public.prospecting_suppressions
    where email_normalized = v_email;
  end if;

  return jsonb_build_object(
    'applied', v_applied,
    'id', v_id,
    'reason', v_reason,
    'previous_reason', v_previous_reason
  );
end;
$$;

create or replace function public.prospecting_upsert_suppression(
  p_email text,
  p_reason text,
  p_source text default 'system',
  p_note text default null,
  p_created_by uuid default null,
  p_now timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  v_result := public.prospecting_apply_suppression(
    p_email, p_reason, p_source, p_note, p_created_by, p_now
  );

  return nullif(v_result ->> 'id', '')::uuid;
end;
$$;

-- CONTRATO DE CAPACIDAD (autoridad usada por el runtime de Fase 2):
--   * Autoridad única: prospecting_send_attempts, contando state reserved+consumed.
--   * Un attempt = un contacto potencial con el proveedor; los reintentos son
--     attempts nuevos y consumen cupo también.
--   * day_key se asigna al reservar en la timezone de settings y se revalida
--     inmediatamente antes de llamar al proveedor. Si cruza medianoche, se
--     mueve al nuevo day_key y se vuelve a comprobar el límite; si no cabe, se
--     libera el attempt y el send falla.
--   * limit = least(daily_target, max_sends_per_day). max_sends_per_run aplica
--     por run y también cuenta reserved+consumed.
--   * daily_target es objetivo de elegibles/planificación, no una autoridad
--     separada: nunca puede superar el límite duro anterior.
-- El runtime de Fase 2 usa este ledger como única autoridad de cupos; los
-- contadores de sends no se usan para planificar.
create or replace function public.prospecting_get_capacity(
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_settings public.prospecting_settings%rowtype;
  v_now timestamptz := coalesce(p_now, now());
  v_day date;
  v_limit integer;
  v_used bigint;
begin
  select * into v_settings
  from public.prospecting_settings
  where id = 1;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;

  v_day := (v_now at time zone v_settings.timezone)::date;
  v_limit := least(v_settings.daily_target, v_settings.max_sends_per_day);

  select count(*) into v_used
  from public.prospecting_send_attempts
  where day_key = v_day
    and state in ('reserved', 'consumed');

  return jsonb_build_object(
    'day_key', v_day,
    'timezone', v_settings.timezone,
    'daily_target', v_settings.daily_target,
    'max_sends_per_day', v_settings.max_sends_per_day,
    'max_sends_per_run', v_settings.max_sends_per_run,
    'limit', v_limit,
    'used', v_used,
    'remaining', greatest(v_limit - v_used, 0),
    'ledger_ready', v_settings.ledger_ready,
    'ledger_cutoff_at', v_settings.ledger_cutoff_at,
    'recovery_required', public.prospecting_recovery_pending(v_now)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Claim
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_claim_send_attempt(
  p_send_id uuid,
  p_run_id uuid default null,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_settings public.prospecting_settings%rowtype;
  v_send public.prospecting_sends%rowtype;
  v_prospect public.prospects%rowtype;
  v_attempt public.prospecting_send_attempts%rowtype;
  v_now timestamptz := coalesce(p_now, now());
  v_run_id uuid;
  v_day date;
  v_limit integer;
  v_used bigint;
  v_run_used bigint;
  v_attempt_no integer;
begin
  select * into v_settings
  from public.prospecting_settings
  where id = 1
  for update;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;

  if not v_settings.ledger_ready then
    return jsonb_build_object('claimed', false, 'reason', 'recovery_required', 'detail', 'ledger_not_ready');
  end if;

  if public.prospecting_recovery_pending(v_now) then
    return jsonb_build_object('claimed', false, 'reason', 'recovery_required', 'detail', 'pending_recovery');
  end if;

  select run_id into v_run_id
  from public.prospecting_sends
  where id = p_send_id;

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'send_not_found');
  end if;

  if p_run_id is not null and v_run_id <> p_run_id then
    return jsonb_build_object('claimed', false, 'reason', 'run_mismatch');
  end if;

  perform 1
  from public.prospecting_runs
  where id = v_run_id
  for key share;

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'run_not_found');
  end if;

  select * into v_send
  from public.prospecting_sends
  where id = p_send_id
  for update;

  if not found then
    return jsonb_build_object('claimed', false, 'reason', 'send_not_found');
  end if;

  if v_send.status not in ('queued', 'failed') then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'send_not_claimable',
      'status', v_send.status
    );
  end if;

  if v_send.status = 'failed' and not v_send.last_error_transient then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'send_not_retryable',
      'last_error', v_send.last_error
    );
  end if;

  if v_send.attempt >= 3 then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'attempts_exhausted',
      'attempt', v_send.attempt
    );
  end if;

  if exists (
    select 1
    from public.prospecting_send_attempts
    where send_id = v_send.id
      and state = 'reserved'
  ) then
    return jsonb_build_object('claimed', false, 'reason', 'already_reserved');
  end if;

  v_day := (v_now at time zone v_settings.timezone)::date;
  v_limit := least(v_settings.daily_target, v_settings.max_sends_per_day);

  select count(*) into v_used
  from public.prospecting_send_attempts
  where day_key = v_day
    and state in ('reserved', 'consumed');

  if v_used >= v_limit then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'day_full',
      'day_key', v_day,
      'limit', v_limit,
      'used', v_used
    );
  end if;

  select count(*) into v_run_used
  from public.prospecting_send_attempts
  where run_id = v_send.run_id
    and state in ('reserved', 'consumed');

  if v_run_used >= v_settings.max_sends_per_run then
    return jsonb_build_object(
      'claimed', false,
      'reason', 'run_limit_reached',
      'limit', v_settings.max_sends_per_run,
      'used', v_run_used
    );
  end if;

  select coalesce(max(attempt_no), 0) + 1
  into v_attempt_no
  from public.prospecting_send_attempts
  where send_id = v_send.id;

  insert into public.prospecting_send_attempts (
    send_id,
    run_id,
    prospect_id,
    attempt_no,
    day_key,
    timezone,
    state,
    provider_contacted,
    reserved_at,
    recipient_hash,
    metadata
  )
  values (
    v_send.id,
    v_send.run_id,
    v_send.prospect_id,
    v_attempt_no,
    v_day,
    v_settings.timezone,
    'reserved',
    false,
    v_now,
    public.prospecting_recipient_hash(v_send.to_email),
    jsonb_build_object('send_attempt_before', v_send.attempt)
  )
  returning * into v_attempt;

  update public.prospecting_sends
  set status = 'sending',
      updated_at = v_now
  where id = v_send.id;

  select * into v_prospect
  from public.prospects
  where id = v_send.prospect_id
  for update;

  if not found then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'prospect_missing',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'skipped',
        last_error = 'prospect_missing',
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    return jsonb_build_object('claimed', false, 'reason', 'prospect_missing');
  end if;

  if v_prospect.status in (
    'unsubscribed', 'bounced', 'complained', 'excluded',
    'invalid', 'failed', 'contacted'
  ) then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'prospect_blocked',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'skipped',
        last_error = 'prospect_blocked',
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = 'skipped',
        updated_at = v_now
    where id = v_prospect.id
      and status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded');

    return jsonb_build_object('claimed', false, 'reason', 'prospect_blocked');
  end if;

  if exists (
    select 1
    from public.prospecting_suppressions
    where email_normalized = lower(btrim(v_send.to_email))
  ) then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'suppressed',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'skipped',
        last_error = 'suppressed',
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = 'skipped',
        updated_at = v_now
    where id = v_prospect.id
      and status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded');

    return jsonb_build_object('claimed', false, 'reason', 'suppressed');
  end if;

  return jsonb_build_object(
    'claimed', true,
    'attempt', to_jsonb(v_attempt),
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt_no,
    'day_key', v_day,
    'limit', v_limit,
    'used', v_used,
    'remaining', greatest(v_limit - v_used - 1, 0)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Revalidación de día
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_revalidate_attempt_day(
  p_attempt_id uuid,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_settings public.prospecting_settings%rowtype;
  v_send public.prospecting_sends%rowtype;
  v_attempt public.prospecting_send_attempts%rowtype;
  v_prospect public.prospects%rowtype;
  v_send_id uuid;
  v_run_id uuid;
  v_now timestamptz := coalesce(p_now, now());
  v_day date;
  v_limit integer;
  v_used bigint;
  v_run_used bigint;
begin
  select send_id into v_send_id
  from public.prospecting_send_attempts
  where id = p_attempt_id;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'attempt_not_found');
  end if;

  select * into v_settings
  from public.prospecting_settings
  where id = 1
  for update;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;

  select run_id into v_run_id
  from public.prospecting_send_attempts
  where id = p_attempt_id;

  perform 1
  from public.prospecting_runs
  where id = v_run_id
  for key share;

  select * into v_send
  from public.prospecting_sends
  where id = v_send_id
  for update;

  select * into v_attempt
  from public.prospecting_send_attempts
  where id = p_attempt_id
  for update;

  if v_attempt.state <> 'reserved' then
    return jsonb_build_object(
      'valid', false,
      'reason', 'attempt_not_reserved',
      'state', v_attempt.state
    );
  end if;

  if v_send.id is null then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'send_missing',
        updated_at = v_now
    where id = v_attempt.id;

    return jsonb_build_object('valid', false, 'reason', 'send_missing');
  end if;

  if v_send.status <> 'sending' then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'send_not_sending',
        updated_at = v_now
    where id = v_attempt.id;

    return jsonb_build_object(
      'valid', false,
      'reason', 'send_not_sending',
      'status', v_send.status
    );
  end if;

  select * into v_prospect
  from public.prospects
  where id = v_send.prospect_id
  for update;

  if not found then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'prospect_missing',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'skipped',
        last_error = 'prospect_missing',
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    return jsonb_build_object('valid', false, 'reason', 'prospect_missing');
  end if;

  if v_prospect.status in (
    'unsubscribed', 'bounced', 'complained', 'excluded',
    'invalid', 'failed', 'contacted'
  ) then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'prospect_blocked',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'skipped',
        last_error = 'prospect_blocked',
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = 'skipped',
        updated_at = v_now
    where id = v_prospect.id
      and status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded');

    return jsonb_build_object(
      'valid', false,
      'reason', 'prospect_blocked',
      'status', v_prospect.status
    );
  end if;

  if exists (
    select 1
    from public.prospecting_suppressions
    where email_normalized = lower(btrim(v_send.to_email))
  ) then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'suppressed',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'skipped',
        last_error = 'suppressed',
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = 'skipped',
        updated_at = v_now
    where id = v_prospect.id
      and status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded');

    return jsonb_build_object('valid', false, 'reason', 'suppressed');
  end if;

  v_day := (v_now at time zone v_settings.timezone)::date;

  if v_day = v_attempt.day_key then
    return jsonb_build_object(
      'valid', true,
      'rolled_over', false,
      'day_key', v_day,
      'attempt_id', v_attempt.id
    );
  end if;

  v_limit := least(v_settings.daily_target, v_settings.max_sends_per_day);

  select count(*) into v_used
  from public.prospecting_send_attempts
  where day_key = v_day
    and state in ('reserved', 'consumed');

  if v_used >= v_limit then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'day_rollover_limit',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'failed',
        last_error = 'day_rollover_limit',
        last_error_transient = true,
        updated_at = v_now
    where id = v_send.id;

    return jsonb_build_object(
      'valid', false,
      'reason', 'day_full',
      'rolled_over', true,
      'day_key', v_day,
      'limit', v_limit,
      'used', v_used
    );
  end if;

  select count(*) into v_run_used
  from public.prospecting_send_attempts
  where run_id = v_send.run_id
    and state in ('reserved', 'consumed');

  if v_run_used >= v_settings.max_sends_per_run then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = 'run_rollover_limit',
        updated_at = v_now
    where id = v_attempt.id;

    update public.prospecting_sends
    set status = 'failed',
        last_error = 'run_rollover_limit',
        last_error_transient = true,
        updated_at = v_now
    where id = v_send.id;

    return jsonb_build_object(
      'valid', false,
      'reason', 'run_limit_reached',
      'rolled_over', true,
      'limit', v_settings.max_sends_per_run,
      'used', v_run_used
    );
  end if;

  update public.prospecting_send_attempts
  set day_key = v_day,
      timezone = v_settings.timezone,
      metadata = metadata || jsonb_build_object(
        'rolled_from', v_attempt.day_key,
        'rolled_at', v_now
      ),
      updated_at = v_now
  where id = v_attempt.id;

  return jsonb_build_object(
    'valid', true,
    'rolled_over', true,
    'day_key', v_day,
    'attempt_id', v_attempt.id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Finalize
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_finalize_send_attempt(
  p_attempt_id uuid,
  p_outcome text,
  p_provider_message_id text default null,
  p_error text default null,
  p_transient boolean default false,
  p_definitive_rejection boolean default false,
  p_provider_contacted boolean default true,
  p_release_reason text default null,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_send public.prospecting_sends%rowtype;
  v_attempt public.prospecting_send_attempts%rowtype;
  v_prospect public.prospects%rowtype;
  v_send_id uuid;
  v_now timestamptz := coalesce(p_now, now());
  v_increment integer := 0;
  v_attempt_count integer;
  v_terminal boolean := false;
  v_new_send_status text;
  v_error text := public.prospecting_sanitize_text(p_error);
begin
  if p_outcome is null
     or p_outcome not in ('sent', 'unknown', 'failed', 'released') then
    raise exception 'invalid_outcome';
  end if;

  if p_outcome = 'sent'
     and (p_provider_message_id is null or btrim(p_provider_message_id) = '') then
    raise exception 'provider_message_id_required';
  end if;

  if p_outcome in ('sent', 'unknown', 'failed') and not p_provider_contacted then
    raise exception 'provider_contacted_required';
  end if;

  if p_outcome = 'released' then
    if p_release_reason is null or btrim(p_release_reason) = '' then
      raise exception 'release_reason_required';
    end if;

    if p_provider_contacted and not p_definitive_rejection then
      raise exception 'release_requires_definitive_rejection';
    end if;
  end if;

  select send_id into v_send_id
  from public.prospecting_send_attempts
  where id = p_attempt_id;

  if not found then
    return jsonb_build_object('finalized', false, 'reason', 'attempt_not_found');
  end if;

  select * into v_send
  from public.prospecting_sends
  where id = v_send_id
  for update;

  if not found then
    return jsonb_build_object('finalized', false, 'reason', 'send_not_found');
  end if;

  select * into v_attempt
  from public.prospecting_send_attempts
  where id = p_attempt_id
  for update;

  if v_attempt.state <> 'reserved' then
    return jsonb_build_object(
      'finalized', false,
      'reason', 'attempt_not_reserved',
      'state', v_attempt.state
    );
  end if;

  if p_provider_contacted and not v_attempt.provider_contacted then
    v_increment := 1;
  end if;

  v_attempt_count := v_send.attempt + v_increment;

  if p_outcome = 'released' then
    v_terminal := (not p_transient)
      or v_attempt_count >= 3;

    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = left(p_release_reason, 500),
        provider_contacted = provider_contacted or p_provider_contacted,
        provider_message_id = coalesce(provider_message_id, nullif(btrim(p_provider_message_id), '')),
        last_error = coalesce(v_error, last_error),
        updated_at = v_now
    where id = v_attempt.id;

    v_new_send_status := v_send.status;
    if public.prospecting_send_status_rank('failed')
       >= public.prospecting_send_status_rank(v_send.status) then
      v_new_send_status := 'failed';
    end if;

    update public.prospecting_sends
    set status = v_new_send_status,
        attempt = v_attempt_count,
        last_error = left(coalesce(v_error, p_release_reason), 2000),
        last_error_transient = p_transient,
        updated_at = v_now
    where id = v_send.id;
  else
    update public.prospecting_send_attempts
    set state = 'consumed',
        consumed_at = v_now,
        consume_reason = p_outcome,
        provider_contacted = provider_contacted or p_provider_contacted,
        provider_message_id = coalesce(provider_message_id, nullif(btrim(p_provider_message_id), '')),
        last_error = coalesce(v_error, last_error),
        updated_at = v_now
    where id = v_attempt.id;

    if p_outcome = 'sent' then
      v_terminal := true;
      v_new_send_status := v_send.status;
      if public.prospecting_send_status_rank('sent')
         >= public.prospecting_send_status_rank(v_send.status) then
        v_new_send_status := 'sent';
      end if;

      update public.prospecting_sends
      set status = v_new_send_status,
          provider_message_id = btrim(p_provider_message_id),
          attempt = v_attempt_count,
          sent_at = coalesce(sent_at, v_now),
          last_error = null,
          last_error_transient = false,
          updated_at = v_now
      where id = v_send.id;
    elsif p_outcome = 'unknown' then
      v_terminal := true;
      v_new_send_status := v_send.status;
      if public.prospecting_send_status_rank('unknown')
         >= public.prospecting_send_status_rank(v_send.status) then
        v_new_send_status := 'unknown';
      end if;

      update public.prospecting_sends
      set status = v_new_send_status,
          attempt = v_attempt_count,
          last_error = left(coalesce(v_error, 'unknown'), 2000),
          last_error_transient = false,
          updated_at = v_now
      where id = v_send.id;
    else
      v_terminal := true;
      v_new_send_status := v_send.status;
      if public.prospecting_send_status_rank('failed')
         >= public.prospecting_send_status_rank(v_send.status) then
        v_new_send_status := 'failed';
      end if;

      update public.prospecting_sends
      set status = v_new_send_status,
          attempt = v_attempt_count,
          last_error = left(coalesce(v_error, 'failed'), 2000),
          last_error_transient = false,
          updated_at = v_now
      where id = v_send.id;
    end if;
  end if;

  select * into v_prospect
  from public.prospects
  where id = v_send.prospect_id
  for update;

  if v_prospect.id is not null then
    if p_outcome = 'sent' then
      if v_attempt.campaign_counted_at is null then
        update public.prospects
        set status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'contacted'
              else status
            end,
            send_status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'sent'
              else send_status
            end,
            last_contacted_at = coalesce(last_contacted_at, v_now),
            campaign_count = campaign_count + 1,
            updated_at = v_now
        where id = v_prospect.id;

        update public.prospecting_send_attempts
        set campaign_counted_at = v_now
        where id = v_attempt.id;
      else
        update public.prospects
        set status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'contacted'
              else status
            end,
            send_status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'sent'
              else send_status
            end,
            last_contacted_at = coalesce(last_contacted_at, v_now),
            updated_at = v_now
        where id = v_prospect.id;
      end if;
    elsif p_outcome = 'unknown' then
      update public.prospects
      set send_status = case
            when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
              then 'unknown'
            else send_status
          end,
          updated_at = v_now
      where id = v_prospect.id;
    elsif p_outcome in ('failed', 'released') then
      if v_terminal then
        update public.prospects
        set status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'failed'
              else status
            end,
            send_status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'failed'
              else send_status
            end,
            updated_at = v_now
        where id = v_prospect.id;
      else
        update public.prospects
        set send_status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'failed'
              else send_status
            end,
            updated_at = v_now
        where id = v_prospect.id;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'finalized', true,
    'outcome', p_outcome,
    'terminal', v_terminal,
    'attempt_id', v_attempt.id,
    'send_id', v_send.id,
    'attempt_count', v_attempt_count
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Eventos del proveedor
-- ---------------------------------------------------------------------------
-- Elimina la firma v2.1 de dos argumentos para que no quede una sobrecarga
-- antigua que pueda ser elegida por llamadas con dos argumentos.
drop function if exists public.prospecting_apply_provider_event(uuid, timestamptz);

create or replace function public.prospecting_apply_provider_event(
  p_event_id uuid,
  p_now timestamptz default null,
  p_historical boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event public.prospecting_events%rowtype;
  v_settings public.prospecting_settings%rowtype;
  v_send public.prospecting_sends%rowtype;
  v_attempt public.prospecting_send_attempts%rowtype;
  v_prospect public.prospects%rowtype;
  v_now timestamptz := coalesce(p_now, now());
  v_status text;
  v_email text;
  v_message_id text;
  v_candidate_ids uuid[];
  v_candidate_count integer;
  v_attempt_ids uuid[];
  v_max_attempt_no integer;
  v_apply boolean;
  v_rank_current integer;
  v_rank_next integer;
  v_increment integer := 0;
  v_attempt_count integer;
  v_was_contacted boolean := false;
  v_was_counted boolean := false;
  v_fallback boolean := false;
  v_is_baseline boolean := false;
  v_day date;
  v_next_attempt timestamptz;
  v_error text;
  v_suppression jsonb;
  v_suppression_id uuid;
  v_suppression_applied boolean := false;
  v_suppression_email text;
  v_effect_at timestamptz;
  v_sent_at timestamptz;
begin
  select * into v_event
  from public.prospecting_events
  where id = p_event_id
  for update;

  if not found then
    return jsonb_build_object('processed', false, 'reason', 'event_not_found');
  end if;

  v_effect_at := case
    when p_historical then public.prospecting_event_effective_at(
      v_event.payload,
      v_event.received_at,
      v_now
    )
    else v_now
  end;

  -- v2.1 podía marcar processed sin aplicar efectos. En modo histórico se
  -- permite una única reevaluación de esos eventos; los eventos ya evaluados
  -- por v2.2 siguen siendo duplicados.
  if v_event.processed_at is not null
     and not (p_historical and v_event.association_evaluated_at is null) then
    return jsonb_build_object(
      'processed', true,
      'duplicate', true,
      'event_id', v_event.id,
      'status', v_event.event_type
    );
  end if;

  v_status := case v_event.event_type
    when 'email.sent' then 'sent'
    when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'sent'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.failed' then 'failed'
    else null
  end;

  if v_status is null then
    update public.prospecting_events
    set association_status = 'ignored',
        matched_send_id = null,
        processed_at = v_now,
        process_attempts = process_attempts + 1,
        next_attempt_at = v_now,
        last_process_error = null,
        association_evaluated_at = v_now,
        updated_at = v_now
    where id = v_event.id;

    return jsonb_build_object(
      'processed', true,
      'ignored', true,
      'event_id', v_event.id
    );
  end if;

  v_email := nullif(lower(btrim(coalesce(v_event.email_normalized, ''))), '');
  v_message_id := nullif(btrim(v_event.provider_message_id), '');

  select * into v_settings
  from public.prospecting_settings
  where id = 1
  for update;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;

  -- 1) Asociación fuerte y única por provider_message_id.
  if v_message_id is not null then
    select array_agg(id order by id)
    into v_candidate_ids
    from (
      select s.id
      from public.prospecting_sends s
      where nullif(btrim(s.provider_message_id), '') = v_message_id
      order by s.id
      for update
    ) candidates;

    v_candidate_count := coalesce(array_length(v_candidate_ids, 1), 0);

    if v_candidate_count > 1 then
      return public.prospecting_event_needs_review(
        v_event.id,
        'ambiguous_provider_message_id',
        null,
        null,
        v_now
      );
    elsif v_candidate_count = 1 then
      select * into v_send
      from public.prospecting_sends
      where id = v_candidate_ids[1];
    end if;
  end if;

  -- 1.b) Un evento puede pertenecer a un intento anterior cuyo
  -- provider_message_id ya no es el del send (porque hubo retry). El ledger
  -- conserva cada intento, así que se busca globalmente por intento antes de
  -- caer al fallback por email.
  if v_message_id is not null then
    -- Orden global de locks: send -> attempt. Primero se identifica el
    -- candidato sin bloquearlo, luego se bloquea su send y sólo después el
    -- attempt. Así no se invierte el orden de finalize/recover.
    select array_agg(a.id order by a.id)
    into v_attempt_ids
    from public.prospecting_send_attempts a
    where nullif(btrim(a.provider_message_id), '') = v_message_id;

    v_candidate_count := coalesce(array_length(v_attempt_ids, 1), 0);

    if v_candidate_count > 1 then
      return public.prospecting_event_needs_review(
        v_event.id,
        'ambiguous_attempt_provider_message_id',
        null,
        null,
        v_now
      );
    elsif v_candidate_count = 1 then
      select * into v_attempt
      from public.prospecting_send_attempts
      where id = v_attempt_ids[1];

      if not found then
        return public.prospecting_event_needs_review(
          v_event.id,
          'attempt_disappeared_during_association',
          null,
          null,
          v_now
        );
      end if;

      if v_send.id is null then
        select * into v_send
        from public.prospecting_sends
        where id = v_attempt.send_id
        for update;

        if not found then
          return public.prospecting_event_needs_review(
            v_event.id,
            'attempt_send_missing',
            null,
            null,
            v_now
          );
        end if;
      elsif v_send.id <> v_attempt.send_id then
        return public.prospecting_event_needs_review(
          v_event.id,
          'ambiguous_send_attempt_association',
          null,
          null,
          v_now
        );
      end if;

      select * into v_attempt
      from public.prospecting_send_attempts
      where id = v_attempt_ids[1]
      for update;

      if v_attempt.send_id <> v_send.id then
        return public.prospecting_event_needs_review(
          v_event.id,
          'ambiguous_send_attempt_association',
          null,
          null,
          v_now
        );
      end if;
    end if;
  end if;

  -- 2) Fallback por email: sólo si hay exactamente un send candidato.
  -- Si el evento trae provider_message_id, el candidato debe tener ese id o
  -- no tener id todavía; nunca se asocia a un id distinto.
  if v_send.id is null and v_email is not null then
    select array_agg(id order by id)
    into v_candidate_ids
    from (
      select s.id
      from public.prospecting_sends s
      where lower(btrim(s.to_email)) = v_email
        and (
          v_message_id is null
          or nullif(btrim(s.provider_message_id), '') is null
          or nullif(btrim(s.provider_message_id), '') = v_message_id
        )
      order by s.id
      for update
    ) candidates;

    v_candidate_count := coalesce(array_length(v_candidate_ids, 1), 0);

    if v_candidate_count > 1 then
      return public.prospecting_event_needs_review(
        v_event.id,
        'ambiguous_email_association',
        null,
        null,
        v_now
      );
    elsif v_candidate_count = 1 then
      select * into v_send
      from public.prospecting_sends
      where id = v_candidate_ids[1];
    end if;
  end if;

  -- 3) Sin send asociado.
  if v_send.id is null then
    -- La supresión sólo puede aplicarse si el destinatario es verificable.
    -- Nunca se infiere desde datos no asociados.
    if v_status in ('bounced', 'complained') and v_email is not null then
      v_suppression := public.prospecting_apply_suppression(
        v_email,
        case when v_status = 'bounced' then 'bounce' else 'complaint' end,
        'resend_webhook',
        case
          when v_status = 'bounced' then 'Rebote reportado por Resend'
          else 'Queja de spam reportada por Resend'
        end,
        null,
        v_now
      );
      v_suppression_id := nullif(v_suppression ->> 'id', '')::uuid;
      v_suppression_applied := coalesce((v_suppression ->> 'applied')::boolean, false);
    end if;

    if p_historical then
      if v_status in ('bounced', 'complained') and v_suppression_id is not null then
        update public.prospecting_events
        set association_status = 'suppressed',
            matched_send_id = null,
            processed_at = v_now,
            process_attempts = process_attempts + 1,
            next_attempt_at = v_now,
            last_process_error = case
              when v_suppression_applied then 'historical_suppression_applied'
              else 'historical_suppression_preexisting'
            end,
            suppression_applied_at = case
              when v_suppression_applied then v_now
              else suppression_applied_at
            end,
            association_evaluated_at = v_now,
            updated_at = v_now
        where id = v_event.id;

        return jsonb_build_object(
          'processed', true,
          'matched', false,
          'suppressed', true,
          'historical', true,
          'event_id', v_event.id,
          'status', v_status
        );
      end if;

      return public.prospecting_event_needs_review(
        v_event.id,
        case
          when v_status in ('bounced', 'complained') and v_email is null
            then 'recipient_unresolved'
          else 'historical_event_unresolved'
        end,
        null,
        case when v_suppression_applied then v_now else null end,
        v_now
      );
    end if;

    -- Un bounce/complaint sin destinatario verificable no puede suprimir ni
    -- asociarse por email: se preserva para revisión humana.
    if v_email is null and v_status in ('bounced', 'complained') then
      return public.prospecting_event_needs_review(
        v_event.id,
        'recipient_unresolved',
        null,
        null,
        v_now
      );
    end if;

    if v_email is null and v_message_id is null then
      return public.prospecting_event_needs_review(
        v_event.id,
        'recipient_unresolved',
        null,
        null,
        v_now
      );
    end if;

    v_next_attempt := v_now + case
      when v_event.process_attempts + 1 <= 5 then interval '1 minute'
      when v_event.process_attempts + 1 <= 10 then interval '5 minutes'
      when v_event.process_attempts + 1 <= 15 then interval '30 minutes'
      else interval '2 hours'
    end;

    update public.prospecting_events
    set association_status = 'unmatched',
        matched_send_id = null,
        process_attempts = process_attempts + 1,
        next_attempt_at = v_next_attempt,
        last_process_error = 'send_not_found',
        suppression_applied_at = case
          when v_suppression_applied then v_now
          else suppression_applied_at
        end,
        association_evaluated_at = v_now,
        updated_at = v_now
    where id = v_event.id;

    return jsonb_build_object(
      'processed', false,
      'matched', false,
      'deferred', true,
      'reason', 'send_not_found',
      'event_id', v_event.id,
      'retry_at', v_next_attempt
    );
  end if;

  -- 4) Asociación a un intento. Primero por provider_message_id; si no,
  -- sólo se acepta cuando el send tiene exactamente un intento.
  if v_message_id is not null then
    select array_agg(id order by id)
    into v_attempt_ids
    from (
      select a.id
      from public.prospecting_send_attempts a
      where a.send_id = v_send.id
        and nullif(btrim(a.provider_message_id), '') = v_message_id
      order by a.id
      for update
    ) candidates;

    v_candidate_count := coalesce(array_length(v_attempt_ids, 1), 0);

    if v_candidate_count > 1 then
      return public.prospecting_event_needs_review(
        v_event.id,
        'ambiguous_attempt_association',
        v_send.id,
        null,
        v_now
      );
    elsif v_candidate_count = 1 then
      select * into v_attempt
      from public.prospecting_send_attempts
      where id = v_attempt_ids[1];
    end if;
  end if;

  if v_attempt.id is null then
    select array_agg(id order by id)
    into v_attempt_ids
    from (
      select a.id
      from public.prospecting_send_attempts a
      where a.send_id = v_send.id
      order by a.attempt_no, a.id
      for update
    ) candidates;

    v_candidate_count := coalesce(array_length(v_attempt_ids, 1), 0);

    if v_candidate_count > 1 then
      return public.prospecting_event_needs_review(
        v_event.id,
        'ambiguous_attempt_association',
        v_send.id,
        null,
        v_now
      );
    elsif v_candidate_count = 1 then
      select * into v_attempt
      from public.prospecting_send_attempts
      where id = v_attempt_ids[1];
    end if;
  end if;

  -- El baseline histórico no representa cada intento. Si el send tuvo más de
  -- un intento y el evento no trae el provider_message_id del baseline, no se
  -- puede atribuir con certeza.
  if v_attempt.id is not null then
    v_is_baseline := coalesce(
      (v_attempt.metadata ->> 'ledger_baseline')::boolean,
      false
    );

    if v_is_baseline
       and not (
         v_message_id is not null
         and nullif(btrim(v_attempt.provider_message_id), '') = v_message_id
       )
       and greatest(coalesce(v_send.attempt, 0), 1) > 1 then
      return public.prospecting_event_needs_review(
        v_event.id,
        'baseline_attempt_ambiguous',
        v_send.id,
        null,
        v_now
      );
    end if;
  end if;

  if v_attempt.id is null then
    -- Fallback sólo para un send sin ninguna fila de ledger. Se marca como
    -- baseline si es histórico; no se presenta como intento reconstruido.
    v_fallback := true;
    v_day := (
      coalesce(
        v_send.sent_at,
        v_send.delivered_at,
        v_send.bounced_at,
        v_send.complained_at,
        v_send.updated_at,
        v_send.created_at,
        v_now
      )
      at time zone v_settings.timezone
    )::date;

    insert into public.prospecting_send_attempts (
      send_id,
      run_id,
      prospect_id,
      attempt_no,
      day_key,
      timezone,
      state,
      provider_contacted,
      campaign_counted_at,
      reserved_at,
      consumed_at,
      consume_reason,
      provider_message_id,
      recipient_hash,
      metadata
    )
    values (
      v_send.id,
      v_send.run_id,
      v_send.prospect_id,
      greatest(coalesce(v_send.attempt, 0), 1),
      v_day,
      v_settings.timezone,
      'consumed',
      true,
      case
        when v_send.status in ('sent', 'delivered', 'bounced', 'complained')
          then coalesce(
            v_send.sent_at,
            v_send.delivered_at,
            v_send.bounced_at,
            v_send.complained_at,
            v_send.updated_at,
            v_send.created_at,
            v_now
          )
        else null
      end,
      coalesce(v_send.created_at, v_now),
      v_now,
      'webhook_fallback',
      v_message_id,
      public.prospecting_recipient_hash(v_send.to_email),
      jsonb_build_object(
        'webhook_fallback', true,
        'historical', p_historical,
        'ledger_baseline', p_historical
      )
    )
    returning * into v_attempt;

    v_is_baseline := p_historical;
    v_was_contacted := true;
    v_was_counted := v_attempt.campaign_counted_at is not null;
    v_attempt_count := v_attempt.attempt_no;
  else
    v_was_contacted := v_attempt.provider_contacted;
    v_was_counted := v_attempt.campaign_counted_at is not null;

    if v_message_id is not null
       and nullif(btrim(v_attempt.provider_message_id), '') is null then
      update public.prospecting_send_attempts
      set provider_message_id = v_message_id,
          updated_at = v_now
      where id = v_attempt.id
        and provider_message_id is null
      returning * into v_attempt;
    end if;

    if v_attempt.state <> 'consumed' then
      update public.prospecting_send_attempts
      set state = 'consumed',
          consumed_at = coalesce(consumed_at, v_now),
          consume_reason = coalesce(consume_reason, v_event.event_type),
          provider_contacted = true,
          provider_message_id = coalesce(
            nullif(btrim(provider_message_id), ''),
            v_message_id
          ),
          updated_at = v_now
      where id = v_attempt.id
      returning * into v_attempt;

      if not v_was_contacted then
        v_increment := case when v_is_baseline then 0 else 1 end;
      end if;
    elsif not v_was_contacted then
      update public.prospecting_send_attempts
      set provider_contacted = true,
          provider_message_id = coalesce(
            nullif(btrim(provider_message_id), ''),
            v_message_id
          ),
          updated_at = v_now
      where id = v_attempt.id
      returning * into v_attempt;

      v_increment := case when v_is_baseline then 0 else 1 end;
    end if;

    v_attempt_count := greatest(
      coalesce(v_send.attempt, 0) + v_increment,
      v_attempt.attempt_no,
      case when v_attempt.provider_contacted then 1 else 0 end
    );
  end if;

  -- 5) Evento tardío de un intento anterior: no puede sobrescribir el send
  -- actual ni la contabilidad. La supresión de bounce/complaint sí se aplica
  -- porque es un efecto de seguridad independiente del estado del send.
  select coalesce(max(attempt_no), 0)
  into v_max_attempt_no
  from public.prospecting_send_attempts
  where send_id = v_send.id;

  if v_attempt.attempt_no < v_max_attempt_no then
    if v_status in ('bounced', 'complained') then
      v_suppression_email := nullif(
        lower(btrim(coalesce(v_send.to_email, v_email, ''))),
        ''
      );

      if v_suppression_email is not null then
        v_suppression := public.prospecting_apply_suppression(
          v_suppression_email,
          case when v_status = 'bounced' then 'bounce' else 'complaint' end,
          'resend_webhook',
          case
            when v_status = 'bounced' then 'Rebote de intento anterior reportado por Resend'
            else 'Queja de intento anterior reportada por Resend'
          end,
          null,
          v_now
        );
        v_suppression_applied := coalesce((v_suppression ->> 'applied')::boolean, false);
      end if;
    end if;

    return public.prospecting_event_needs_review(
      v_event.id,
      'stale_attempt_event',
      v_send.id,
      case when v_suppression_applied then v_now else null end,
      v_now
    );
  end if;

  select * into v_prospect
  from public.prospects
  where id = v_send.prospect_id
  for update;

  v_rank_current := public.prospecting_send_status_rank(v_send.status);
  v_rank_next := public.prospecting_send_status_rank(v_status);
  v_apply := v_rank_next >= v_rank_current;
  v_error := public.prospecting_sanitize_text(v_event.payload -> 'data' ->> 'error');

  -- Un email.sent tardío nunca puede quedar después de un terminal conocido.
  -- Si no hay timestamp original fiable, se usa el terminal como cota superior
  -- conservadora; no se inventa una hora de envío anterior.
  v_sent_at := v_effect_at;
  if v_send.delivered_at is not null and v_sent_at > v_send.delivered_at then
    v_sent_at := v_send.delivered_at;
  end if;
  if v_send.bounced_at is not null and v_sent_at > v_send.bounced_at then
    v_sent_at := v_send.bounced_at;
  end if;
  if v_send.complained_at is not null and v_sent_at > v_send.complained_at then
    v_sent_at := v_send.complained_at;
  end if;

  update public.prospecting_sends
  set status = case when v_apply then v_status else status end,
      attempt = v_attempt_count,
      provider_message_id = coalesce(
        provider_message_id,
        v_message_id
      ),
      sent_at = case
        when v_status = 'sent' and sent_at is null
          then v_sent_at
        else sent_at
      end,
      delivered_at = case
        when v_status = 'delivered' and v_apply and delivered_at is null
          then v_effect_at
        else delivered_at
      end,
      bounced_at = case
        when v_status = 'bounced' and v_apply and bounced_at is null
          then v_effect_at
        else bounced_at
      end,
      complained_at = case
        when v_status = 'complained' and v_apply and complained_at is null
          then v_effect_at
        else complained_at
      end,
      last_error = case
        when v_status in ('sent', 'delivered') and v_apply then null
        when v_status = 'failed' and v_apply
          then coalesce(v_error, 'webhook_failed')
        else last_error
      end,
      last_error_transient = case
        when v_status in ('sent', 'delivered', 'bounced', 'complained') and v_apply then false
        when v_status = 'failed' and v_apply then false
        else last_error_transient
      end,
      updated_at = v_now
  where id = v_send.id;

  if v_prospect.id is not null then
    if v_apply then
      if v_status = 'bounced' then
        update public.prospects
        set status = case
              when status not in ('unsubscribed', 'complained') then 'bounced'
              else status
            end,
            send_status = case
              when status not in ('unsubscribed', 'complained') then 'bounced'
              else send_status
            end,
            updated_at = v_now
        where id = v_prospect.id;
      elsif v_status = 'complained' then
        update public.prospects
        set status = case
              when status <> 'unsubscribed' then 'complained'
              else status
            end,
            send_status = case
              when status <> 'unsubscribed' then 'complained'
              else send_status
            end,
            updated_at = v_now
        where id = v_prospect.id;
      elsif v_status = 'delivered' then
        update public.prospects
        set status = case
              when status in ('new', 'validated', 'pending_contact', 'contacted') then 'contacted'
              else status
            end,
            send_status = case
              when status in ('new', 'validated', 'pending_contact', 'contacted') then 'delivered'
              else send_status
            end,
            updated_at = v_now
        where id = v_prospect.id;
      elsif v_status = 'sent' then
        update public.prospects
        set status = case
              when status in ('new', 'validated', 'pending_contact', 'contacted') then 'contacted'
              else status
            end,
            send_status = case
              when status in ('new', 'validated', 'pending_contact', 'contacted') then 'sent'
              else send_status
            end,
            last_contacted_at = coalesce(last_contacted_at, v_now),
            updated_at = v_now
        where id = v_prospect.id;
      elsif v_status = 'failed' then
        update public.prospects
        set status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'failed'
              else status
            end,
            send_status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'failed'
              else send_status
            end,
            updated_at = v_now
        where id = v_prospect.id;
      end if;
    end if;

    if v_status in ('sent', 'delivered', 'bounced', 'complained')
       and not v_was_counted then
      update public.prospects
      set campaign_count = campaign_count + 1,
          last_contacted_at = coalesce(last_contacted_at, v_now),
          updated_at = v_now
      where id = v_prospect.id;

      update public.prospecting_send_attempts
      set campaign_counted_at = v_now
      where id = v_attempt.id;

      v_was_counted := true;
    end if;
  end if;

  if v_status in ('bounced', 'complained') then
    v_suppression_email := nullif(
      lower(btrim(coalesce(v_send.to_email, v_email, ''))),
      ''
    );

    if v_suppression_email is not null then
      v_suppression := public.prospecting_apply_suppression(
        v_suppression_email,
        case when v_status = 'bounced' then 'bounce' else 'complaint' end,
        'resend_webhook',
        case
          when v_status = 'bounced' then 'Rebote reportado por Resend'
          else 'Queja de spam reportada por Resend'
        end,
        null,
        v_now
      );
      v_suppression_applied := coalesce((v_suppression ->> 'applied')::boolean, false);
    end if;
  end if;

  update public.prospecting_events
  set association_status = 'matched',
      matched_send_id = v_send.id,
      processed_at = v_now,
      process_attempts = process_attempts + 1,
      next_attempt_at = v_now,
      last_process_error = null,
      suppression_applied_at = case
        when v_suppression_applied then v_now
        else suppression_applied_at
      end,
      association_evaluated_at = v_now,
      updated_at = v_now
  where id = v_event.id;

  return jsonb_build_object(
    'processed', true,
    'duplicate', false,
    'matched', true,
    'historical', p_historical,
    'event_id', v_event.id,
    'status', v_status,
    'applied', v_apply,
    'attempt_id', v_attempt.id,
    'attempt_no', v_attempt.attempt_no,
    'send_id', v_send.id,
    'fallback', v_fallback
  );
end;
$$;

create or replace function public.prospecting_ingest_provider_event(
  p_provider_event_id text,
  p_event_type text,
  p_provider_message_id text,
  p_email text default null,
  p_payload jsonb default '{}'::jsonb,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event public.prospecting_events%rowtype;
  v_result jsonb;
  v_now timestamptz := coalesce(p_now, now());
  v_event_id text := nullif(btrim(p_provider_event_id), '');
  v_message_id text := nullif(btrim(p_provider_message_id), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if v_event_id is null then
    raise exception 'provider_event_id_required';
  end if;

  insert into public.prospecting_events (
    provider_event_id,
    event_type,
    provider_message_id,
    email_normalized,
    payload,
    received_at,
    association_status,
    next_attempt_at
  )
  values (
    v_event_id,
    coalesce(nullif(btrim(p_event_type), ''), 'unknown'),
    v_message_id,
    v_email,
    public.prospecting_sanitize_payload(p_payload),
    v_now,
    'pending',
    v_now
  )
  on conflict (provider_event_id) do nothing
  returning * into v_event;

  if v_event.id is null then
    select * into v_event
    from public.prospecting_events
    where provider_event_id = v_event_id;

    if v_event.id is null then
      raise exception 'provider_event_insert_failed';
    end if;

    if v_event.processed_at is null
       and v_event.association_status <> 'needs_review' then
      v_result := public.prospecting_apply_provider_event(v_event.id, v_now);
      return v_result || jsonb_build_object('duplicate', true);
    end if;

    return jsonb_build_object(
      'processed', true,
      'duplicate', true,
      'event_id', v_event.id,
      'status', v_event.event_type
    );
  end if;

  return public.prospecting_apply_provider_event(v_event.id, v_now);
end;
$$;

create or replace function public.prospecting_reprocess_provider_events(
  p_limit integer default 50,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_event public.prospecting_events%rowtype;
  v_result jsonb;
  v_now timestamptz := coalesce(p_now, now());
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_processed integer := 0;
  v_deferred integer := 0;
  v_needs_review integer := 0;
  v_expired integer := 0;
  v_failed integer := 0;
begin
  for v_event in
    select *
    from public.prospecting_events
    where processed_at is null
      and association_status in ('pending', 'unmatched')
      and next_attempt_at <= v_now
    order by next_attempt_at, received_at
    limit v_limit
    for update skip locked
  loop
    -- No expirar por una ventana corta de indisponibilidad del worker. La
    -- retención de PII es de 30 días; pasada esa ventana ya no hay payload útil.
    if v_event.process_attempts >= 20
       or v_event.received_at < v_now - interval '30 days' then
      update public.prospecting_events
      set association_status = 'expired',
          processed_at = v_now,
          next_attempt_at = v_now,
          last_process_error = 'event_expired_retention',
          updated_at = v_now
      where id = v_event.id;

      v_expired := v_expired + 1;
    else
      begin
        v_result := public.prospecting_apply_provider_event(v_event.id, v_now);
        if coalesce((v_result ->> 'processed')::boolean, false) then
          v_processed := v_processed + 1;
        elsif coalesce((v_result ->> 'needs_review')::boolean, false) then
          v_needs_review := v_needs_review + 1;
        else
          v_deferred := v_deferred + 1;
        end if;
      exception when others then
        update public.prospecting_events
        set association_status = 'needs_review',
            processed_at = null,
            process_attempts = process_attempts + 1,
            next_attempt_at = v_now + interval '5 minutes',
            last_process_error = 'reprocess_failed',
            updated_at = v_now
        where id = v_event.id;
        v_failed := v_failed + 1;
      end;
    end if;
  end loop;

  return jsonb_build_object(
    'processed', v_processed,
    'deferred', v_deferred,
    'needs_review', v_needs_review,
    'expired', v_expired,
    'failed', v_failed
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Recuperación
-- ---------------------------------------------------------------------------
drop function if exists public.prospecting_recover_stale(timestamptz);

create or replace function public.prospecting_recover_stale(
  p_now timestamptz default null,
  p_mark_ready boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_settings public.prospecting_settings%rowtype;
  v_send public.prospecting_sends%rowtype;
  v_attempt public.prospecting_send_attempts%rowtype;
  v_prospect public.prospects%rowtype;
  v_now timestamptz := coalesce(p_now, now());
  v_runs integer := 0;
  v_sending integer := 0;
  v_queued integer := 0;
  v_legacy integer := 0;
  v_reserved integer := 0;
  v_day date;
  v_attempt_count integer;
  v_ledger_ready boolean := false;
begin
  select * into v_settings
  from public.prospecting_settings
  where id = 1
  for update;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;

  update public.prospecting_runs
  set status = 'failed',
      finished_at = v_now,
      error = coalesce(error, 'stale_run_recovered'),
      summary = summary || jsonb_build_object(
        'recovered_at', v_now,
        'reason', 'stale_run'
      )
  where status = 'running'
    and started_at < v_now - interval '2 hours';

  get diagnostics v_runs = row_count;

  for v_send in
    select *
    from public.prospecting_sends
    where status = 'sending'
      and updated_at < v_now - interval '2 hours'
    order by id
    for update
  loop
    select * into v_attempt
    from public.prospecting_send_attempts
    where send_id = v_send.id
    order by (state = 'reserved') desc, attempt_no desc
    limit 1
    for update;

    if found then
      v_attempt_count := greatest(
        v_send.attempt + case
          when v_attempt.provider_contacted then 0
          when coalesce((v_attempt.metadata ->> 'ledger_baseline')::boolean, false) then 0
          else 1
        end,
        v_attempt.attempt_no
      );

      if v_attempt.state <> 'consumed' then
        update public.prospecting_send_attempts
        set state = 'consumed',
            consumed_at = coalesce(consumed_at, v_now),
            consume_reason = 'stale_sending_unknown',
            provider_contacted = true,
            last_error = coalesce(last_error, 'stale_sending_unknown'),
            updated_at = v_now
        where id = v_attempt.id;
      end if;
    else
      v_day := (
        coalesce(v_send.updated_at, v_send.created_at)
        at time zone v_settings.timezone
      )::date;

      v_attempt_count := greatest(v_send.attempt, 1);

      insert into public.prospecting_send_attempts (
        send_id,
        run_id,
        prospect_id,
        attempt_no,
        day_key,
        timezone,
        state,
        provider_contacted,
        reserved_at,
        consumed_at,
        consume_reason,
        provider_message_id,
        recipient_hash,
        last_error,
        metadata
      )
      values (
        v_send.id,
        v_send.run_id,
        v_send.prospect_id,
        v_attempt_count,
        v_day,
        v_settings.timezone,
        'consumed',
        true,
        coalesce(v_send.created_at, v_now),
        v_now,
        'stale_sending_unknown',
        nullif(btrim(v_send.provider_message_id), ''),
        public.prospecting_recipient_hash(v_send.to_email),
        'stale_sending_unknown',
        jsonb_build_object('recovery_fallback', true)
      );
    end if;

    update public.prospecting_sends
    set status = 'unknown',
        last_error = coalesce(last_error, 'stale_sending_unknown'),
        last_error_transient = false,
        attempt = v_attempt_count,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = case
          when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
            then 'unknown'
          else send_status
        end,
        updated_at = v_now
    where id = v_send.prospect_id;

    v_sending := v_sending + 1;
  end loop;

  for v_send in
    select *
    from public.prospecting_sends
    where status = 'queued'
      and created_at < v_now - interval '10 minutes'
    order by id
    for update
  loop
    select * into v_attempt
    from public.prospecting_send_attempts
    where send_id = v_send.id
      and state = 'reserved'
    order by attempt_no desc
    limit 1
    for update;

    if found then
      update public.prospecting_send_attempts
      set state = 'released',
          released_at = v_now,
          release_reason = 'stale_queued_no_provider',
          updated_at = v_now
      where id = v_attempt.id;
    end if;

    update public.prospecting_sends
    set status = 'failed',
        last_error = coalesce(last_error, 'stale_queued_recovered'),
        last_error_transient = true,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = case
          when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
            then 'failed'
          else send_status
        end,
        updated_at = v_now
    where id = v_send.prospect_id;

    v_queued := v_queued + 1;
  end loop;

  for v_send in
    select *
    from public.prospecting_sends
    where status = 'failed'
      and last_error = 'stale_sending_recovered'
    order by id
    for update
  loop
    select * into v_attempt
    from public.prospecting_send_attempts
    where send_id = v_send.id
    order by (state = 'reserved') desc, attempt_no desc
    limit 1
    for update;

    if not found then
      v_day := (
        coalesce(v_send.updated_at, v_send.created_at)
        at time zone v_settings.timezone
      )::date;

      insert into public.prospecting_send_attempts (
        send_id,
        run_id,
        prospect_id,
        attempt_no,
        day_key,
        timezone,
        state,
        provider_contacted,
        reserved_at,
        consumed_at,
        consume_reason,
        provider_message_id,
        recipient_hash,
        last_error,
        metadata
      )
      values (
        v_send.id,
        v_send.run_id,
        v_send.prospect_id,
        greatest(v_send.attempt, 1),
        v_day,
        v_settings.timezone,
        'consumed',
        true,
        coalesce(v_send.created_at, v_now),
        v_now,
        'legacy_stale_sending',
        nullif(btrim(v_send.provider_message_id), ''),
        public.prospecting_recipient_hash(v_send.to_email),
        'stale_sending_recovered',
        jsonb_build_object('legacy_recovery', true)
      );
    elsif v_attempt.state <> 'consumed' then
      update public.prospecting_send_attempts
      set state = 'consumed',
          consumed_at = coalesce(consumed_at, v_now),
          consume_reason = 'legacy_stale_sending',
          provider_contacted = true,
          last_error = coalesce(last_error, 'stale_sending_recovered'),
          updated_at = v_now
      where id = v_attempt.id;
    end if;

    update public.prospecting_sends
    set status = 'unknown',
        last_error = coalesce(last_error, 'stale_sending_unknown'),
        last_error_transient = false,
        updated_at = v_now
    where id = v_send.id;

    update public.prospects
    set send_status = case
          when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
            then 'unknown'
          else send_status
        end,
        updated_at = v_now
    where id = v_send.prospect_id;

    v_legacy := v_legacy + 1;
  end loop;

  for v_send in
    select *
    from public.prospecting_sends s
    where exists (
      select 1
      from public.prospecting_send_attempts a
      where a.send_id = s.id
        and a.state = 'reserved'
        and a.reserved_at < v_now - interval '2 hours'
    )
    order by id
    for update
  loop
    select * into v_attempt
    from public.prospecting_send_attempts
    where send_id = v_send.id
      and state = 'reserved'
    order by attempt_no desc
    limit 1
    for update;

    if found then
      if v_send.status = 'sending' then
        v_attempt_count := greatest(
          v_send.attempt + case
            when v_attempt.provider_contacted then 0
            when coalesce((v_attempt.metadata ->> 'ledger_baseline')::boolean, false) then 0
            else 1
          end,
          v_attempt.attempt_no
        );

        update public.prospecting_send_attempts
        set state = 'consumed',
            consumed_at = coalesce(consumed_at, v_now),
            consume_reason = 'stale_reserved_unknown',
            provider_contacted = true,
            last_error = coalesce(last_error, 'stale_reserved_unknown'),
            updated_at = v_now
        where id = v_attempt.id;

        update public.prospecting_sends
        set status = 'unknown',
            last_error = coalesce(last_error, 'stale_reserved_unknown'),
            last_error_transient = false,
            attempt = v_attempt_count,
            updated_at = v_now
        where id = v_send.id;

        update public.prospects
        set send_status = case
              when status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
                then 'unknown'
              else send_status
            end,
            updated_at = v_now
        where id = v_send.prospect_id;
      else
        update public.prospecting_send_attempts
        set state = 'released',
            released_at = v_now,
            release_reason = 'stale_reserved_no_provider',
            updated_at = v_now
        where id = v_attempt.id;
      end if;

      v_reserved := v_reserved + 1;
    end if;
  end loop;

  update public.prospecting_settings
  set lock_token = null,
      lock_until = null,
      ledger_ready = case when p_mark_ready then true else ledger_ready end,
      ledger_recovery_at = case when p_mark_ready then v_now else ledger_recovery_at end,
      updated_at = v_now
  where id = 1
    and (lock_until is null or lock_until < v_now);

  select ledger_ready into v_ledger_ready
  from public.prospecting_settings
  where id = 1;

  return jsonb_build_object(
    'runs', v_runs,
    'sending', v_sending,
    'queued', v_queued,
    'legacy_failed', v_legacy,
    'reserved', v_reserved,
    'ledger_ready', v_ledger_ready
  );
end;
$$;

-- La recuperación legacy se sustituye por prospecting_recover_stale.
-- Se elimina para que no queden dos rutas con semánticas distintas.
drop function if exists public.prospecting_recover_stale_runs(text);

-- ---------------------------------------------------------------------------
-- 9. Cierre sin envío
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_mark_send_skipped(
  p_send_id uuid,
  p_reason text,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_send public.prospecting_sends%rowtype;
  v_attempt public.prospecting_send_attempts%rowtype;
  v_now timestamptz := coalesce(p_now, now());
  v_reason text := coalesce(public.prospecting_sanitize_text(p_reason), 'skipped');
begin
  select * into v_send
  from public.prospecting_sends
  where id = p_send_id
  for update;

  if not found then
    return jsonb_build_object('skipped', false, 'reason', 'send_not_found');
  end if;

  if v_send.status not in ('queued', 'sending', 'failed') then
    return jsonb_build_object(
      'skipped', false,
      'reason', 'send_not_skippable',
      'status', v_send.status
    );
  end if;

  select * into v_attempt
  from public.prospecting_send_attempts
  where send_id = v_send.id
    and state = 'reserved'
  order by attempt_no desc
  limit 1
  for update;

  if found then
    update public.prospecting_send_attempts
    set state = 'released',
        released_at = v_now,
        release_reason = left(v_reason, 500),
        updated_at = v_now
    where id = v_attempt.id;
  end if;

  update public.prospecting_sends
  set status = 'skipped',
      last_error = left(v_reason, 2000),
      last_error_transient = false,
      updated_at = v_now
  where id = v_send.id;

  update public.prospects
  set send_status = 'skipped',
      updated_at = v_now
  where id = v_send.prospect_id
    and status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded');

  return jsonb_build_object('skipped', true, 'send_id', v_send.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Baja
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_apply_unsubscribe(
  p_prospect_id uuid,
  p_email text default null,
  p_source text default 'email_link',
  p_note text default null,
  p_created_by uuid default null,
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_settings public.prospecting_settings%rowtype;
  v_prospect public.prospects%rowtype;
  v_email text;
  v_now timestamptz := coalesce(p_now, now());
  v_suppression_id uuid;
begin
  select * into v_settings
  from public.prospecting_settings
  where id = 1
  for update;

  if not found then
    raise exception 'prospecting_settings_missing';
  end if;

  select * into v_prospect
  from public.prospects
  where id = p_prospect_id
  for update;

  if not found then
    return jsonb_build_object('applied', false, 'reason', 'prospect_not_found');
  end if;

  v_email := nullif(
    lower(btrim(coalesce(p_email, v_prospect.email, v_prospect.email_normalized, ''))),
    ''
  );

  if v_email is null then
    return jsonb_build_object('applied', false, 'reason', 'email_missing');
  end if;

  update public.prospects
  set status = 'unsubscribed',
      send_status = 'skipped',
      updated_at = v_now
  where id = v_prospect.id
    and status not in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded');

  v_suppression_id := public.prospecting_upsert_suppression(
    v_email,
    'unsubscribe',
    coalesce(p_source, 'email_link'),
    p_note,
    p_created_by,
    v_now
  );

  return jsonb_build_object(
    'applied', true,
    'prospect_id', v_prospect.id,
    'email_normalized', v_email,
    'suppression_id', v_suppression_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 11. Retención de PII
-- ---------------------------------------------------------------------------
create or replace function public.prospecting_scrub_pii(
  p_now timestamptz default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := coalesce(p_now, now());
  v_events integer := 0;
  v_hashes integer := 0;
  v_attempt_text integer := 0;
  v_sends integer := 0;
  v_prospects integer := 0;
begin
  update public.prospecting_events
  set email_normalized = null,
      payload = '{}'::jsonb,
      last_process_error = null,
      updated_at = v_now
  where received_at < v_now - interval '30 days'
    and (
      email_normalized is not null
      or payload <> '{}'::jsonb
      or last_process_error is not null
    );

  get diagnostics v_events = row_count;

  update public.prospecting_send_attempts
  set recipient_hash = null,
      updated_at = v_now
  where created_at < v_now - interval '24 months'
    and recipient_hash is not null;

  get diagnostics v_hashes = row_count;

  update public.prospecting_send_attempts
  set last_error = null,
      metadata = '{}'::jsonb,
      updated_at = v_now
  where created_at < v_now - interval '90 days'
    and (
      last_error is not null
      or metadata <> '{}'::jsonb
    );

  get diagnostics v_attempt_text = row_count;

  -- Contenido del correo y destinatario: 90 días. Se conserva la fila de send
  -- para auditoría de estado/contadores, pero no el contenido ni el email.
  update public.prospecting_sends
  set to_email = 'redacted@invalid',
      subject = '[redacted]',
      html = '[redacted]',
      last_error = null,
      updated_at = v_now
  where created_at < v_now - interval '90 days'
    and (
      to_email <> 'redacted@invalid'
      or subject <> '[redacted]'
      or html <> '[redacted]'
      or last_error is not null
    );

  get diagnostics v_sends = row_count;

  -- Prospectos terminales inactivos: 24 meses. Se conserva la fila y firm_name
  -- para trazabilidad comercial; se eliminan identificadores personales.
  update public.prospects
  set email = null,
      contact_name = null,
      role = null,
      website = null,
      linkedin_url = null,
      city = null,
      description = null,
      notes = null,
      updated_at = v_now
  where updated_at < v_now - interval '24 months'
    and status in ('unsubscribed', 'bounced', 'complained', 'invalid', 'excluded')
    and (
      email is not null
      or contact_name is not null
      or role is not null
      or website is not null
      or linkedin_url is not null
      or city is not null
      or description is not null
      or notes is not null
    );

  get diagnostics v_prospects = row_count;

  return jsonb_build_object(
    'events_scrubbed', v_events,
    'attempt_hashes_scrubbed', v_hashes,
    'attempt_text_scrubbed', v_attempt_text,
    'sends_scrubbed', v_sends,
    'prospects_scrubbed', v_prospects
  );
end;
$$;

-- Contrato de retención (sin purga automática en esta migración):
--   events.payload/email_normalized: 30 días.
--   attempts.recipient_hash: 24 meses; attempts.last_error/metadata: 90 días.
--   sends.to_email/subject/html/last_error: 90 días; fila/estado se conserva.
--   prospects PII de terminales inactivos: 24 meses; fila/firm_name se conserva.
-- Requiere worker scheduler idempotente; no se crea cron aquí.
-- El backfill vive en 20261116000100_prospecting_block3_ledger_backfill.sql.

-- ---------------------------------------------------------------------------
-- 13. RLS y permisos necesarios antes de desplegar el runtime.
-- El runtime debe poder operar en la fase intermedia; DELETE/TRUNCATE se
-- revocan recién en 20261116000200_prospecting_block3_permissions.sql.
-- ---------------------------------------------------------------------------
alter table public.prospecting_send_attempts enable row level security;

revoke all on public.prospecting_send_attempts from public, anon, authenticated;
grant select, insert, update on public.prospecting_send_attempts to service_role;

grant select, insert, update on public.prospecting_events to service_role;

revoke all on function public.prospecting_send_status_rank(text) from public, anon, authenticated;
grant execute on function public.prospecting_send_status_rank(text) to service_role;

revoke all on function public.prospecting_sanitize_text(text) from public, anon, authenticated;
grant execute on function public.prospecting_sanitize_text(text) to service_role;

revoke all on function public.prospecting_sanitize_json(jsonb, integer) from public, anon, authenticated;
grant execute on function public.prospecting_sanitize_json(jsonb, integer) to service_role;

revoke all on function public.prospecting_sanitize_payload(jsonb) from public, anon, authenticated;
grant execute on function public.prospecting_sanitize_payload(jsonb) to service_role;

revoke all on function public.prospecting_recipient_hash(text) from public, anon, authenticated;
grant execute on function public.prospecting_recipient_hash(text) to service_role;

revoke all on function public.prospecting_recovery_pending(timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_recovery_pending(timestamptz) to service_role;

revoke all on function public.prospecting_event_needs_review(uuid, text, uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_event_needs_review(uuid, text, uuid, timestamptz, timestamptz) to service_role;

revoke all on function public.prospecting_suppression_reason_rank(text) from public, anon, authenticated;
grant execute on function public.prospecting_suppression_reason_rank(text) to service_role;

revoke all on function public.prospecting_apply_suppression(text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_apply_suppression(text, text, text, text, uuid, timestamptz) to service_role;

revoke all on function public.prospecting_upsert_suppression(text, text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_upsert_suppression(text, text, text, text, uuid, timestamptz) to service_role;

revoke all on function public.prospecting_get_capacity(timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_get_capacity(timestamptz) to service_role;

revoke all on function public.prospecting_claim_send_attempt(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_claim_send_attempt(uuid, uuid, timestamptz) to service_role;

revoke all on function public.prospecting_revalidate_attempt_day(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_revalidate_attempt_day(uuid, timestamptz) to service_role;

revoke all on function public.prospecting_finalize_send_attempt(uuid, text, text, text, boolean, boolean, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_finalize_send_attempt(uuid, text, text, text, boolean, boolean, boolean, text, timestamptz) to service_role;

revoke all on function public.prospecting_apply_provider_event(uuid, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.prospecting_apply_provider_event(uuid, timestamptz, boolean) to service_role;

revoke all on function public.prospecting_ingest_provider_event(text, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_ingest_provider_event(text, text, text, text, jsonb, timestamptz) to service_role;

revoke all on function public.prospecting_reprocess_provider_events(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_reprocess_provider_events(integer, timestamptz) to service_role;

revoke all on function public.prospecting_recover_stale(timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.prospecting_recover_stale(timestamptz, boolean) to service_role;

revoke all on function public.prospecting_mark_send_skipped(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_mark_send_skipped(uuid, text, timestamptz) to service_role;

revoke all on function public.prospecting_apply_unsubscribe(uuid, text, text, text, uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_apply_unsubscribe(uuid, text, text, text, uuid, timestamptz) to service_role;

revoke all on function public.prospecting_scrub_pii(timestamptz) from public, anon, authenticated;
grant execute on function public.prospecting_scrub_pii(timestamptz) to service_role;

create or replace view public.prospecting_operational_health as
select
  now() as checked_at,
  s.ledger_ready,
  s.ledger_cutoff_at,
  s.ledger_recovery_at,
  (select count(*) from public.prospecting_events e
    where e.processed_at is null) as pending_events,
  (select count(*) from public.prospecting_events e
    where e.association_status = 'needs_review') as needs_review_events,
  (select count(*) from public.prospecting_events e
    where e.association_status = 'expired') as expired_events,
  (select count(*) from public.prospecting_sends x
    where x.status = 'sending' and x.updated_at < now() - interval '2 hours') as stale_sending,
  (select count(*) from public.prospecting_send_attempts a
    where a.state = 'reserved' and a.reserved_at < now() - interval '2 hours') as stale_reserved,
  (select max(e.received_at) from public.prospecting_events e) as last_event_received_at
from public.prospecting_settings s
where s.id = 1;

revoke all on public.prospecting_operational_health from public, anon, authenticated;
grant select on public.prospecting_operational_health to service_role;
