# Prospección automática LegalUp Pro

Estado: **instalada y desactivada por defecto**. `prospecting_settings.enabled = false` y `dry_run = true`.
No se envía ningún correo real hasta que un administrador active la automatización o ejecute una campaña manual confirmada.

## Arquitectura

- `server/prospecting/`: módulo aislado (discovery, validación, deduplicación, email, Resend, webhooks, scheduler).
- `server.mjs`: monta las rutas y arranca el scheduler solo fuera de tests.
- `src/components/admin/ProspectingTab.tsx`: panel dentro de LegalUp Admin.
- `supabase/migrations/20261105004400_prospecting_automation.sql`: tablas, RLS deny, claim atómico, recuperación de runs y supresiones.
- `.github/workflows/prospecting-cron.yml`: cron externo de respaldo.

## Rutas

| Ruta | Auth | Uso |
| --- | --- | --- |
| `GET/POST /api/prospecting/unsubscribe` | token HMAC | baja de un clic desde el correo |
| `POST /api/webhooks/resend` | firma Svix | rebotes, quejas, entregas |
| `POST /api/cron/prospecting` | `x-cron-secret` | respaldo del scheduler diario |
| `/api/admin/prospecting/*` | `requireAdmin` | panel, settings, runs, prospectos, envíos, supresiones y prueba |

## Variables de entorno (Render)

Obligatorias para envío real:

- `RESEND_API_KEY` (normalmente ya existe en el servicio).
- `PROSPECTING_UNSUBSCRIBE_SECRET`: secreto aleatorio usado para firmar los enlaces de baja (`openssl rand -hex 32`). Guardarlo solo en Render.
- `RESEND_WEBHOOK_SECRET`: secreto de firma del endpoint de Resend (`whsec_...`).
- Un proveedor de búsqueda, en orden de preferencia:
  - `SERPER_API_KEY`, o
  - `BRAVE_SEARCH_API_KEY`, o
  - `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`.

Para el cron externo:

- `PROSPECTING_CRON_SECRET`: el mismo valor debe guardarse como secreto de repositorio `PROSPECTING_CRON_SECRET` en GitHub (`openssl rand -hex 32`).

Opcional:

- `PROSPECTING_SCHEDULER_DISABLED=1`: desactiva el scheduler interno si se usará solo el cron externo.

Sin proveedor de búsqueda, el discovery devuelve `discovery_provider_not_configured` y el run queda `skipped`; no inventa prospectos.

## Webhook de Resend

1. En Resend, crear un endpoint para `https://legalup.cl/api/webhooks/resend`.
2. Suscribir al menos: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`.
3. Copiar el signing secret a `RESEND_WEBHOOK_SECRET` en Render.
4. Verificar que el dominio `legalup.cl` esté verificado en Resend. Si no lo está, cambiar temporalmente `sender_email` a un dominio verificado (por ejemplo `mg.legalup.cl`).

El endpoint valida la firma Svix, tolera 5 minutos de desfase, deduplica por `svix-id` y registra rebotes/quejas en la lista de supresión.

## Cron diario 10:00 America/Santiago

Hay dos mecanismos idempotentes:

- Scheduler interno de Render, cada 60 s, con la zona horaria de `prospecting_settings`.
- GitHub Actions a las 13:00 y 14:00 UTC (cubre horario de verano/invierno). La API ignora la llamada si aún no es la hora configurada.

Ambos usan `run_key = scheduled:YYYY-MM-DD` en la zona horaria configurada, por lo que solo se ejecuta un run diario.

## Checklist por plataforma

| Plataforma | Configuración |
| --- | --- |
| Render | `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `PROSPECTING_UNSUBSCRIBE_SECRET`, `PROSPECTING_CRON_SECRET` y una clave de búsqueda (`SERPER_API_KEY`, `BRAVE_SEARCH_API_KEY` o `GOOGLE_CSE_API_KEY` + `GOOGLE_CSE_CX`). Redesplegar. |
| GitHub | Secreto de repositorio `PROSPECTING_CRON_SECRET` con el mismo valor de Render. |
| Resend | Endpoint `https://legalup.cl/api/webhooks/resend`, eventos de entrega/rebote/queja y dominio remitente verificado. |

## Puesta en marcha

1. Configurar las variables de entorno anteriores en Render y redesplegar el servicio.
2. Configurar el secreto `PROSPECTING_CRON_SECRET` en GitHub si se usará el workflow.
3. Verificar el remitente en Resend.
4. Entrar a LegalUp Admin → Prospección.
5. Confirmar que `enabled = false` y `dry_run = true`.
6. Ejecutar **Dry-run** y revisar:
   - prospectos descubiertos, insertados y elegibles;
   - validación de correo y MX;
   - duplicados y exclusiones;
   - asuntos de los correos;
   - runs y errores en el panel.
7. Enviar un correo de prueba a `juan@legalup.cl` y revisar baja, remitente, reply-to y enlaces.
8. Solo después de validar personalmente, activar `enabled` y desactivar `dry_run`.
9. Empezar con un límite bajo (`max_sends_per_run`) y subirlo gradualmente.

## Consultas útiles

```sql
select id, enabled, dry_run, daily_target, max_sends_per_run, max_sends_per_day,
       schedule_time, timezone, sender_email
from public.prospecting_settings;

select run_key, trigger, mode, status, discovered, inserted, eligible, sent, failed, error
from public.prospecting_runs
order by started_at desc
limit 20;

select status, validation_status, count(*)
from public.prospects
group by status, validation_status
order by 3 desc;
```

## Seguridad y límites

- Las tablas nuevas tienen RLS activo sin políticas: `anon` y `authenticated` no leen nada; el backend usa `service_role`.
- Los enlaces de baja usan HMAC: manipular el UUID o la firma invalida el enlace.
- Con `dry_run = true`, cualquier envío manual se rechaza (`dry_run_enabled`); solo el correo de prueba explícito sale.
- Un prospecto recibe como máximo una campaña inicial (`prospecting_sends.prospect_id` único).
- Los rebotes y quejas agregan supresión y excluyen futuros envíos.
- Los envíos se registran con `idempotency_key`; los reintentos no crean filas nuevas.
- Los errores transitorios de Resend se reintentan hasta 3 veces; los definitivos marcan el prospecto como `failed`.
- No se almacenan secretos en la base de datos ni en el repositorio.

## Pendiente antes de activar envíos reales

- Configurar las variables de entorno y el webhook en Resend.
- Verificar el dominio remitente.
- Ejecutar un dry-run real con proveedor de búsqueda configurado.
- Revisar los correos generados y la procedencia de los datos.
- Revisar el cumplimiento de la Ley 21.719 (base de licitud, información al titular y baja).
- Activar envío real solo con confirmación manual.
