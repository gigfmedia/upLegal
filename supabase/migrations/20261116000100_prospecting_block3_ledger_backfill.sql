-- Bloque 3 / Fase 1: backfill verificado del ledger de prospección.
-- Requiere que el guard haya quedado confirmado con ledger_ready=false.
-- Al cerrar correctamente habilita ledger_ready=true.

-- 12. Backfill
-- ---------------------------------------------------------------------------
-- Confirmación explícita de que el guard quedó aplicado antes de backfillear.
do $$
begin
  if to_regclass('public.prospecting_send_attempts') is null then
    raise exception 'ledger_guard_missing';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'prospecting_settings'
      and column_name = 'ledger_ready'
  ) then
    raise exception 'ledger_guard_missing:ledger_ready';
  end if;
  if (select ledger_ready from public.prospecting_settings where id = 1) is null then
    raise exception 'ledger_guard_unconfirmed';
  end if;
end;
$$;

-- El backfill no reconstruye intentos que no existen. Para cada send histórico
-- sin ledger crea UNA fila baseline explícita. Esa fila representa el estado
-- consolidado del send, no cada intento individual, y queda marcada con
-- metadata.ledger_baseline=true. Los sends que ya tienen ledger no se tocan.
--
-- ledger_cutoff_at marca el inicio del primer día local con ledger exacto.
-- Antes de ese instante los claims quedan bloqueados; los días anteriores
-- usan el baseline para no inflar el cupo futuro. No se promete exactitud
-- diaria del histórico que nunca fue registrado.

-- 12.1 Baseline del ledger histórico.
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
  last_error,
  created_at,
  metadata
)
select
  s.id,
  s.run_id,
  s.prospect_id,
  greatest(coalesce(s.attempt, 0), 1),
  (
    case
      when s.status = 'sending'
        then coalesce(s.updated_at, s.created_at)
      else coalesce(
        s.sent_at,
        s.delivered_at,
        s.bounced_at,
        s.complained_at,
        s.updated_at,
        s.created_at
      )
    end
    at time zone st.timezone
  )::date,
  st.timezone,
  'consumed',
  s.status in ('sent', 'delivered', 'bounced', 'complained', 'unknown')
    or (
      s.status = 'failed'
      and (
        coalesce(s.attempt, 0) > 0
        or s.last_error = 'stale_sending_recovered'
      )
    ),
  case
    when s.status in ('sent', 'delivered', 'bounced', 'complained')
      then coalesce(
        s.sent_at,
        s.delivered_at,
        s.bounced_at,
        s.complained_at,
        s.updated_at,
        s.created_at
      )
    else null
  end,
  coalesce(s.created_at, s.updated_at),
  coalesce(
    s.sent_at,
    s.delivered_at,
    s.bounced_at,
    s.complained_at,
    s.updated_at,
    s.created_at
  ),
  'ledger_baseline',
  nullif(btrim(s.provider_message_id), ''),
  public.prospecting_recipient_hash(s.to_email),
  public.prospecting_sanitize_text(s.last_error),
  coalesce(
    s.created_at,
    s.sent_at,
    s.delivered_at,
    s.bounced_at,
    s.complained_at,
    s.updated_at,
    now()
  ),
  jsonb_build_object(
    'ledger_baseline', true,
    'backfilled', true,
    'send_status', s.status,
    'send_attempt', s.attempt,
    'baseline_claimed', s.status = 'sending',
    'baseline_provider_contacted',
      s.status in ('sent', 'delivered', 'bounced', 'complained', 'unknown')
      or (
        s.status = 'failed'
        and (
          coalesce(s.attempt, 0) > 0
          or s.last_error = 'stale_sending_recovered'
        )
      ),
    'note', 'Consolidado histórico; no reconstruye intentos individuales.'
  )
from public.prospecting_sends s
cross join public.prospecting_settings st
where st.id = 1
  and (
    s.status in (
      'sent', 'delivered', 'bounced', 'complained',
      'unknown', 'sending'
    )
    or (
      s.status = 'failed'
      and (
        coalesce(s.attempt, 0) > 0
        or s.last_error = 'stale_sending_recovered'
      )
    )
  )
  and not exists (
    select 1
    from public.prospecting_send_attempts a
    where a.send_id = s.id
  )
on conflict do nothing;

-- 12.2 Reconciliación exacta de campaign_count.
-- campaign_count se deriva de los sends que realmente cuentan como envío
-- exitoso. No se usa un mínimo artificial de 1. Un prospecto sin envíos
-- exitosos queda en 0, aunque el contador anterior fuera mayor.
with successful_sends as (
  select
    s.prospect_id,
    count(*)::integer as send_count,
    min(coalesce(
      s.sent_at,
      s.delivered_at,
      s.bounced_at,
      s.complained_at,
      s.updated_at,
      s.created_at
    )) as first_success_at
  from public.prospecting_sends s
  where s.status in ('sent', 'delivered', 'bounced', 'complained')
  group by s.prospect_id
),
reconciled as (
  select
    p.id as prospect_id,
    coalesce(s.send_count, 0)::integer as send_count,
    s.first_success_at
  from public.prospects p
  left join successful_sends s on s.prospect_id = p.id
)
update public.prospects p
set campaign_count = r.send_count,
    last_contacted_at = coalesce(p.last_contacted_at, r.first_success_at),
    updated_at = now()
from reconciled r
where p.id = r.prospect_id
  and (
    p.campaign_count is distinct from r.send_count
    or (p.last_contacted_at is null and r.first_success_at is not null)
  );

-- Un send exitoso se contabiliza una sola vez, en el intento efectivo más
-- reciente (consumido si existe). Los sends no exitosos no dejan marca.
with ranked_attempts as (
  select
    a.id,
    s.status,
    row_number() over (
      partition by a.send_id
      order by (a.state = 'consumed') desc, a.attempt_no desc
    ) as rn,
    coalesce(
      s.sent_at,
      s.delivered_at,
      s.bounced_at,
      s.complained_at,
      s.updated_at,
      s.created_at
    ) as counted_at
  from public.prospecting_send_attempts a
  join public.prospecting_sends s on s.id = a.send_id
)
update public.prospecting_send_attempts a
set campaign_counted_at = case
      when r.status in ('sent', 'delivered', 'bounced', 'complained')
       and r.rn = 1
        then coalesce(a.campaign_counted_at, r.counted_at)
      else null
    end,
    updated_at = now()
from ranked_attempts r
where a.id = r.id;

-- 12.3 Resolución de eventos históricos con efectos reales.
-- Se procesa cada evento no procesado con la misma función que usa el runtime,
-- en modo histórico. Un error no marca el evento como procesado: queda en
-- needs_review para revisión humana. Los duplicados ya procesados no se tocan.
do $$
declare
  v_event_id uuid;
  v_result jsonb;
  v_processed boolean;
  v_needs_review boolean;
  v_now timestamptz := now();
begin
  for v_event_id in
    select e.id
    from public.prospecting_events e
    where e.association_evaluated_at is null
    order by e.received_at, e.id
    for update
  loop
    begin
      v_result := public.prospecting_apply_provider_event(
        v_event_id,
        v_now,
        true
      );

      v_processed := coalesce((v_result ->> 'processed')::boolean, false);
      v_needs_review := coalesce((v_result ->> 'needs_review')::boolean, false);

      if not v_processed and not v_needs_review then
        update public.prospecting_events
        set association_status = 'needs_review',
            processed_at = null,
            next_attempt_at = v_now,
            last_process_error = coalesce(
              v_result ->> 'reason',
              'historical_unprocessed'
            ),
            association_evaluated_at = v_now,
            updated_at = v_now
        where id = v_event_id;
      end if;
    exception when others then
      update public.prospecting_events
      set association_status = 'needs_review',
          matched_send_id = null,
          processed_at = null,
          process_attempts = process_attempts + 1,
          next_attempt_at = v_now,
          last_process_error = 'historical_apply_failed',
          association_evaluated_at = v_now,
          updated_at = v_now
      where id = v_event_id;
    end;
  end loop;
end;
$$;

-- 12.4 Sanitización recursiva del payload histórico. Se aplica a todos los
-- eventos, procesados o no, para no conservar PII en claro después de la
-- migración. Es idempotente.
update public.prospecting_events
set payload = public.prospecting_sanitize_payload(payload),
    last_process_error = public.prospecting_sanitize_text(last_process_error),
    updated_at = now()
where payload <> '{}'::jsonb
   or last_process_error is not null;

-- 12.4.b Reparación de cronología ya persistida. No inventa un envío anterior:
-- usa el terminal más antiguo conocido como cota superior.
update public.prospecting_sends
set sent_at = least(delivered_at, bounced_at, complained_at),
    updated_at = now()
where sent_at is not null
  and least(delivered_at, bounced_at, complained_at) is not null
  and sent_at > least(delivered_at, bounced_at, complained_at);

-- 12.5 Cierre verificado. Sólo se ejecuta si el ledger está bloqueado; así el
-- rerun del backfill es idempotente y no falla por reservas de pruebas/runtime.
-- La recuperación se ejecuta sin habilitar el ledger; si queda una reserva
-- joven o falla una comprobación, se lanza excepción y el ledger sigue bloqueado.
do $$
declare
  v_should_close boolean;
  v_reserved integer;
  v_missing_success integer;
  v_pending_eval integer;
  v_key_len integer;
  v_cutoff timestamptz;
begin
  select ledger_ready into v_should_close
  from public.prospecting_settings
  where id = 1;

  if not coalesce(v_should_close, false) then
    perform public.prospecting_recover_stale(now(), false);

    select count(*) into v_reserved
    from public.prospecting_send_attempts
    where state = 'reserved';

    if v_reserved > 0 then
      raise exception 'ledger_reserved_attempts_pending: %', v_reserved;
    end if;

    select count(*) into v_missing_success
    from public.prospecting_sends s
    where s.status in ('sent', 'delivered', 'bounced', 'complained')
      and not exists (
        select 1
        from public.prospecting_send_attempts a
        where a.send_id = s.id
          and a.state = 'consumed'
      );

    if v_missing_success > 0 then
      raise exception 'ledger_success_without_consumed_attempt: %', v_missing_success;
    end if;

    select count(*) into v_pending_eval
    from public.prospecting_events
    where association_evaluated_at is null;

    if v_pending_eval > 0 then
      raise exception 'ledger_events_pending_evaluation: %', v_pending_eval;
    end if;

    select octet_length(recipient_hash_key), ledger_cutoff_at
    into v_key_len, v_cutoff
    from public.prospecting_settings
    where id = 1;

    if v_key_len is distinct from 32 then
      raise exception 'ledger_recipient_hash_key_invalid';
    end if;
    if v_cutoff is null then
      raise exception 'ledger_cutoff_missing';
    end if;

    update public.prospecting_settings
    set events_v2_backfilled_at = now(),
        ledger_ready = true,
        ledger_recovery_at = now(),
        updated_at = now()
    where id = 1;

    if not found then
      raise exception 'ledger_close_guard_failed';
    end if;
  end if;
end;
$$;
