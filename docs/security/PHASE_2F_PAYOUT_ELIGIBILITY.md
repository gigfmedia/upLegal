# FASE 2F — ELEGIBILIDAD DE PAYOUT Y AISLAMIENTO LEGACY

**Modo:** implementación local. No se aplicó nada en producción, no se desplegó ningún Edge Function, no se reactivó el cron y no se modificaron pagos ni datos históricos.

## 1. Objetivo

Permitir que el Edge corregido `process-weekly-payouts` solo pueda transferir pagos con evidencia canónica completa, sin modificar el webhook y sin convertir pagos históricos en elegibles.

La migración cierra el gap detectado:

- el webhook canónico inserta `payments.metadata.provider_payment_id`;
- el webhook **no** setea `payments.payment_gateway_id`;
- el Edge exige `payment_gateway_id` no nulo/no vacío;
- el evento `payment_events.success` se inserta después del pago, con `source=webhook`.

Sin un puente en base de datos, los pagos canónicos futuros no serían elegibles.

## 2. Cambios creados

- `supabase/migrations/20261125120000_phase2f_payout_eligibility.sql`
- `server/payoutEligibilityMigration.test.mjs`
- `server/payoutIntegrity.test.mjs` actualizado para aplicar la migración real en PGlite
- `docs/security/PHASE_2F_PAYOUT_ELIGIBILITY.md`

No se modificó ningún webhook, Edge Function, cron, RLS existente, servicio B1.1 ni dato de aplicación.

## 3. Esquema

La migración agrega, de forma idempotente:

| Columna | Tipo | Default | Uso |
|---|---|---|---|
| `confirmed_at` | `timestamptz` | `NULL` | Momento de la confirmación canónica |
| `confirmation_source` | `text` | `NULL` | Solo `mercadopago_webhook` habilita payout |
| `payout_eligible` | `boolean NOT NULL` | `false` | Autorización explícita de payout |

No hace backfill. Todas las filas existentes quedan `payout_eligible=false`, `confirmed_at=NULL`, `confirmation_source=NULL`.

### Guardia de elegibilidad

`payments_payout_eligible_guard` es un CHECK `NOT VALID`. No escanea ni bloquea históricos, pero se aplica a todo INSERT/UPDATE nuevo y exige, si `payout_eligible=true`:

- `status='succeeded'`
- `confirmed_at IS NOT NULL`
- `confirmation_source='mercadopago_webhook'`
- `payment_gateway_id` no nulo y no vacío
- `currency='CLP'`
- `lawyer_id IS NOT NULL`
- `lawyer_amount > 0`
- `amount > 0`

## 4. Triggers

### 4.1 Autoridad de pagos

`zz_protect_payments_authority` corre `BEFORE INSERT OR UPDATE` en `payments`.

- `service_role` y administradores de plataforma pueden escribir.
- Cualquier otro rol:
  - en INSERT queda forzado a `status=pending`, `payout_status=pending`, `payout_eligible=false`, sin confirmación ni gateway;
  - en UPDATE conserva los valores financieros y de payout de `OLD`.

Esto protege contra llamadas cliente que intenten marcar un pago como exitoso, confirmado o elegible.

### 4.2 Canonicalización del gateway

`zz_canonicalize_payment_gateway` corre `BEFORE INSERT OR UPDATE OF metadata, payment_gateway_id`.

Solo para `service_role`/admin, si:

- `payment_gateway_id` está vacío;
- `metadata.provider='mercadopago'`;
- `metadata.provider_payment_id` no está vacío;

entonces setea `payment_gateway_id = metadata.provider_payment_id`.

No toca pagos históricos por sí solo: solo se ejecuta en escrituras posteriores a la migración.

### 4.3 Confirmación desde `payment_events`

`zz_confirm_payment_from_event` corre `AFTER INSERT` en `payment_events`.

Solo un evento cumple todas las condiciones:

- `event_type='success'`
- `status='completed'`
- `payment_id` no nulo
- `metadata.source='webhook'`
- insertado por `service_role`

Si además existe un `payments.payment_gateway_id` igual a `payment_events.payment_id`, se ejecuta la reconciliación.

Un insert de un evento `success/completed/source=webhook` por un rol distinto a `service_role` **se rechaza con `42501`**. Esto evita dejar eventos falsos persistidos aunque las políticas RLS actuales permitan inserts de clientes. Los eventos de analytics sin `source=webhook` no se bloquean, pero nunca confirman un pago.

### 4.4 Reconciliación

`zz_reconcile_payment_confirmation(uuid)` es la única función que escribe la confirmación. Su EXECUTE se revoca de `PUBLIC`, `anon` y `authenticated`; solo `service_role` puede invocarla:

- busca el primer evento `success/completed/source=webhook` asociado al gateway del pago;
- setea `confirmed_at` solo si aún es `NULL`;
- setea `confirmation_source='mercadopago_webhook'`;
- setea `payout_eligible=true` solo si se cumplen todas las condiciones del guard.

`zz_reconcile_payment_after_write` corre `AFTER INSERT OR UPDATE OF payment_gateway_id, status, currency, lawyer_id, lawyer_amount` en `payments`. Permite reconciliar si el pago y el evento llegan en distinto orden, pero solo para `service_role`/admin.

### 4.5 Bloqueo de claim no elegible

`enforce_payout_eligibility` corre `BEFORE UPDATE OF payout_status`.

Bloquea `pending -> processing` cuando `payout_eligible` no es `true`, con `42501`.

### 4.6 Índice de cola

`payments_payout_queue_idx` cubre `(lawyer_id, created_at)` para pagos:

- `status='succeeded'`
- `payout_status='pending'`
- `payout_eligible=true`

## 5. Qué no hace

- No modifica `server.mjs` ni el webhook.
- No modifica el Edge Function.
- No modifica cron.
- No hace backfill de `payment_gateway_id`, `confirmed_at`, `confirmation_source` ni `payout_eligible`.
- No valida el CHECK contra filas históricas.
- No endurece RLS de `payment_events`; el bloqueo de eventos falsos de confirmación se hace en el trigger.
- No convierte en elegibles los 4 pagos CLP pendientes ni el pago real de 77.000 USD.
- No autoriza ningún payout real.

## 6. Estado histórico esperado

Después de aplicar la migración, sin backfill:

- los 4 pagos CLP `pending` siguen no elegibles: no tienen gateway ni evento `success/webhook`;
- el pago real `d832f85e-2846-4588-a929-a400cf23601b` sigue no elegible: `currency=usd`, sin `lawyer_amount`, sin gateway; su evento es `source=migration`;
- `payout_logs` sigue en 0;
- el cron `weekly-payouts` (`jobid=1`) sigue inactivo.

## 7. Tests

Comando dirigido:

```text
npx vitest run server/payoutEligibilityMigration.test.mjs server/payoutIntegrity.test.mjs
```

Resultado: **2 archivos, 33/33 tests passed**.

Cobertura nueva:

- migración idempotente;
- histórico con evento `webhook` preexistente no se backfillea;
- gateway derivado de metadata;
- confirmación solo con evento `success/completed/source=webhook`;
- evento `source=migration` no confirma;
- evento de confirmación insertado por rol cliente se rechaza;
- `payout_eligible=true` sin evidencia es rechazado por CHECK;
- `pending -> processing` no elegible es bloqueado;
- pago elegible sí puede pasar a `processing`;
- el Edge real no transfiere filas succeeded/pending CLP sin confirmación completa.

## 8. Secuencia de despliegue recomendada

No ejecutar sin autorización expresa.

1. Respaldar esquema y snapshot de `payments`, `payment_events`, `payout_logs` y cron.
2. Aplicar la migración en ventana de baja escritura. Es aditiva; el bloqueo es breve.
3. Verificar columnas, constraint, triggers, índice y que ningún histórico quedó elegible.
4. Desplegar el Edge corregido solo después de la migración.
5. Mantener `weekly-payouts` inactivo.
6. Validar con SQL que la cola elegible sigue en 0 antes de cualquier prueba controlada.
7. Reactivar el cron solo con aprobación explícita y un pago de prueba autorizado.

## 9. Verificación posterior

```sql
-- 1. Columnas
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema='public' AND table_name='payments'
  AND column_name IN ('confirmed_at','confirmation_source','payout_eligible')
ORDER BY column_name;

-- 2. Históricos: debe devolver 0
SELECT count(*) AS eligible_history
FROM public.payments
WHERE payout_eligible;

-- 3. Confirmaciones: debe devolver 0
SELECT count(*) AS confirmed_history
FROM public.payments
WHERE confirmed_at IS NOT NULL OR confirmation_source IS NOT NULL;

-- 4. Triggers
SELECT tgname
FROM pg_trigger
WHERE tgrelid IN ('public.payments'::regclass, 'public.payment_events'::regclass)
  AND NOT tgisinternal
ORDER BY tgname;

-- 5. Constraint
SELECT conname, convalidated
FROM pg_constraint
WHERE conrelid='public.payments'::regclass
  AND conname='payments_payout_eligible_guard';

-- 6. Cola de payout: debe devolver 0
SELECT count(*) AS eligible_queue
FROM public.payments
WHERE status='succeeded'
  AND payout_status='pending'
  AND payout_eligible;
```

Resultado esperado tras migrar sin backfill: `eligible_history=0`, `confirmed_history=0`, `eligible_queue=0`, guard presente y `convalidated=false`.

## 10. Rollback

Si el Edge todavía no fue desplegado o ya fue revertido:

```sql
BEGIN;
DROP TRIGGER IF EXISTS payments_require_payout_eligibility ON public.payments;
DROP TRIGGER IF EXISTS zz_reconcile_payment_after_write ON public.payments;
DROP TRIGGER IF EXISTS zz_canonicalize_payment_gateway ON public.payments;
DROP TRIGGER IF EXISTS zz_protect_payments_authority ON public.payments;
DROP TRIGGER IF EXISTS zz_confirm_payment_from_event ON public.payment_events;

DROP FUNCTION IF EXISTS public.enforce_payout_eligibility();
DROP FUNCTION IF EXISTS public.zz_reconcile_payment_after_write();
DROP FUNCTION IF EXISTS public.zz_confirm_payment_from_event();
DROP FUNCTION IF EXISTS public.zz_canonicalize_payment_gateway();
DROP FUNCTION IF EXISTS public.zz_protect_payments_authority();
DROP FUNCTION IF EXISTS public.zz_reconcile_payment_confirmation(uuid);

DROP INDEX IF EXISTS public.payments_payout_queue_idx;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payout_eligible_guard;
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS payout_eligible,
  DROP COLUMN IF EXISTS confirmation_source,
  DROP COLUMN IF EXISTS confirmed_at;
COMMIT;
```

No revertir columnas mientras el Edge desplegado las consulte. Primero revertir el Edge y mantener el cron inactivo.

## 11. Riesgos residuales

- **Sin staging:** la migración y los triggers no se han probado contra una copia real de producción.
- **RLS de `payment_events` sigue permisiva:** el trigger bloquea eventos falsos de confirmación, pero no corrige la deuda de auditoría/analytics. `docs/security/sql/05_payment_events_lockdown.sql` sigue siendo una recomendación separada.
- **Webhook no modificado:** si en el futuro cambia `metadata.provider_payment_id` o `metadata.source`, la reconciliación deja de funcionar.
- **Pago preexistente por booking:** el webhook no convierte a `succeeded` un `payments` ya existente para el mismo booking; solo inserta si no existe. El flujo canónico actual no crea el pago antes del webhook, pero esta deuda debe vigilarse.
- **Sin backfill:** los históricos permanecen no elegibles. Cualquier backfill futuro requiere evidencia de Mercado Pago y aprobación separada.
- **Cron inactivo:** el sistema no paga automáticamente mientras no se autorice la reactivación.
- **Construcción de tests:** PGlite reproduce el esquema mínimo; no sustituye una prueba de integración con Supabase real.

## 12. Dictamen

La migración local está lista para revisión. Cierra el gap técnico entre el webhook canónico y el Edge sin modificar el webhook, y garantiza que ningún pago histórico se vuelva elegible. No debe aplicarse en producción ni desplegarse el Edge hasta completar revisión, respaldo y autorización explícita.
