# Block 1 — B1.0 Congelamiento de contratos

**Estado:** `READY FOR FORMAL APPROVAL — NOT CLOSED`; D-05 resuelta.
**Fecha:** 2026-11-12; actualización documental: 2026-11-13.
**Base normativa:** `BLOCK_1_IMPLEMENTATION_PLAN.md`, `SPRINT_2_TECHNICAL_DESIGN.md`, `SPRINT_2_READINESS_AUDIT.md` y `BLOCK_0_SECURITY_AUDIT.md`.
**H-07:** `BLOCKED — no RESOLVED`.
**D17:** `BLOCKED — no aprobado`.
**Feature flag:** `SERVICES_REAL_DOCUMENTS_ENABLED=false`.
**Alcance:** definición y congelamiento de contratos. Este documento no autoriza ni ejecuta cambios de código, migraciones, tablas, buckets, rutas, UI, jobs, infraestructura ni procesamiento de documentos reales.

---

## 1. Objetivo y criterio de salida

B1.0 debe permitir que B1.1 implemente datos, RLS y Storage sin tener que tomar decisiones de producto, seguridad o contrato durante la implementación.

Criterio de salida de B1.0:

1. Modelo de datos y relaciones congelados.
2. Estados y transiciones congelados.
3. Contratos API y responsabilidades server-side congelados.
4. Matriz de roles y permisos congelada.
5. Estrategia RLS y aislamiento multi-tenant congelada.
6. Contratos de Storage y buckets privados congelados.
7. Interfaces de scanner, gate y proveedor IA congeladas.
8. Comportamiento fail-closed y política de lectura congelados.
9. Estrategia de pruebas y fixtures sintéticos congelada.
10. Auditoría de eventos y trazabilidad congelada.
11. Decisiones contradictorias resueltas o aprobadas explícitamente.
12. `D17=BLOCKED`, sin cambios productivos y sin documentos reales.

En caso de conflicto entre documentos, prevalece la regla más restrictiva para seguridad, privacidad y multi-tenancy. Las contradicciones detectadas se enumeran en §13 y **no se resuelven por inferencia**.

---

## 2. Línea base verificada

### 2.1 Lo que existe

- `service_inquiries` existe y sigue siendo el intake independiente.
  - Estados: `nueva`, `en_evaluacion`, `contactada`, `convertida`, `descartada`.
  - `convertida` es terminal para el intake.
  - RLS: solo admin de plataforma puede leer; no hay políticas de escritura para `anon`/`authenticated`.
  - `privacy_accepted_at` tiene default `now()` y no constituye por sí solo evidencia de aceptación contractual.
- `security_platform_admin()` usa exclusivamente `auth.jwt()->'app_metadata'->>'role' in ('admin','superadmin')`.
- `security_company_role(company_id)` devuelve `owner`, `admin`, `member` o `viewer`.
- `security_company_access(company_id, write)` incluye `owner/admin/member` para escritura y `owner/admin/member/viewer` para lectura.
- El servidor actual monta `POST /api/services/inquiries` con rate limit en memoria, idempotencia por `idempotency_key` y `express.json({ limit: '2mb' })`.
- No existen tablas `service_orders` ni derivadas, buckets `service-documents`/`service-payment-proofs`, políticas RLS del dominio ni rutas de órdenes/documentos.
- No existe un scanner antimalware de producción verificado en el repositorio.
- El motor IA existe en `server/ai/provider.mjs`; la extracción PDF existe en `server/ai/pdfText.mjs`.
- El `CommercialReadinessGate` y el `MalwareScannerPort` existen como módulos de seguridad, pero no están integrados en rutas documentales reales.

### 2.2 Lo que no existe y no se crea en B1.0

- Migraciones, tablas, índices, triggers, funciones, políticas RLS o grants nuevos.
- Buckets, prefijos, objetos o URLs firmadas.
- Endpoints, routers, middleware, UI, jobs o notificaciones nuevas.
- Integración del gate en `server.mjs`.
- Evidencia D17 real, aprobación legal, DPA, retención aprobada, worker de purga o scanner real.
- Documentos reales, fixtures con datos personales o migración del bucket legacy `documents`.

---

## 3. Decisiones de arquitectura congeladas

Se mantienen las decisiones D1–D17 del diseño, con estas precisiones normativas:

| Decisión | Contrato congelado |
|---|---|
| D1 | `service_inquiries` es intake; no es la orden y no almacena documentos. |
| D2 | Se crean `service_orders` y tablas derivadas; no se reutiliza `company_requests`. |
| D3 | `service-documents` es privado y solo contiene PDF contractuales. |
| D4 | `service_order_assignments` es la única fuente de asignación profesional. |
| D5 | El motor IA se reutiliza solo con contrato/DPA, no entrenamiento y retención verificados. |
| D6 | Documentos contractuales: solo PDF. El comprobante se rige por D16. |
| D7 | Escrituras server-side con `service_role`; RLS es segunda barrera. |
| D8 | Aceptación inmutable, versionada y única por orden. |
| D9 | La IA no entrega; el profesional revisa y aprueba. |
| D10 | El trabajo operativo inicia solo con pago confirmado por admin. |
| D11 | Sin scanner confiable no hay procesamiento; el objeto queda en cuarentena. |
| D12 | Bandeja administrativa mínima obligatoria. |
| D13 | Una ronda incluida; adicionales son una nueva orden. |
| D14 | Solo correo; no hay mensajería interna en v1. |
| D15 | No se migran documentos históricos en este sprint. |
| D16 | `service-payment-proofs` es un dominio separado, privado y sin IA. |
| D17 | El gate se evalúa en arranque y en cada operación documental; el flag no lo sustituye. |

Reglas no negociables:

- `company_id`, `professional_id`, `status`, `amount_clp`, `quote_id`, `payment_id`, `proof_path`, `storage_path` y `role` nunca son autoridad desde el cliente.
- Una empresa es el tenant; la pertenencia se recalcula en cada request.
- Un profesional accede por asignación activa, no por `profiles.role` ni por pertenencia a la empresa.
- Ningún documento se sirve, analiza o promociona sin `scan_status='clean'` y `validation_status='validated'`.
- Un comprobante nunca se analiza con IA ni se copia a `service-documents`.
- Ninguna lectura de cuarentena, `infected`, `unavailable`, `failed`, `rejected`, borrada o purgada es válida.
- No se crea un bypass de development para documentos reales.
- No se guardan URLs firmadas, rutas internas, tokens, contenido contractual ni PII en logs.

---

## 4. Modelo de datos congelado

El DDL ilustrativo de `SPRINT_2_TECHNICAL_DESIGN.md` §7.2–§7.11 es la base normativa, sujeto a las correcciones de §13 (D-01–D-08 aprobadas o aceptadas). Las migraciones reales se implementan en B1.1.

### 4.1 Inventario de tablas

| Tabla | Propósito | Autoridad / invariante principal |
|---|---|---|
| `service_orders` | Orden operativa | `inquiry_id` único solo para orden inicial; sin asignación, pago, aceptación ni contador de revisión duplicados. |
| `service_order_assignments` | Asignación profesional | Única fuente de asignación; un lead activo por orden; una asignación activa por profesional/orden. |
| `service_order_quotes` | Cotizaciones versionadas | Una `sent` activa y una `accepted` por orden; `accepted`/`superseded` inmutables. |
| `service_order_acceptances` | Evidencia de aceptación | Una por orden y una por cotización; snapshot comercial y consentimientos; sin UPDATE/DELETE. |
| `service_order_payments` | Intento y estado de pago | Un intento abierto y un pago confirmado por orden; monto/cotización inmutables desde INSERT. |
| `service_order_documents` | Documentos contractuales | Solo `input`/`annex`/`deliverable`; ruta server-side; PDF, hash, escaneo y validación. |
| `service_order_analyses` | Análisis IA versionado | Un current y una ejecución activa por documento; aprobación solo sobre current. |
| `service_order_revisions` | Ronda incluida | Una revisión activa por orden; snapshot de ventana; sin segunda ronda automática. |
| `service_order_events` | Auditoría | Append-only; audiencia y metadata sanitizada; sin UPDATE/DELETE. |
| `service_order_retention_actions` | Retención, hold y purga | Append-only; actor, motivo y snapshot; no editable. |

### 4.2 Campos y constraints que deben existir en B1.1

- `service_orders`: `id`, `inquiry_id`, `company_id`, `customer_user_id`, `parent_order_id`, `order_kind`, `public_ref`, `service_category`, `title`, `scope_summary`, `status`, `priority`, `first_response_at`, `sla_due_at`, `delivered_at`, `closed_at`, `cancelled_at`, `cancel_reason`, `revision_rounds_included=1`, `revision_window_ends_at`, `retention_until`, `legal_hold`, `purge_started_at`, `purged_at`, `created_by`, `created_at`, `updated_at`.
- `service_orders` conserva las constraints de §7.2: `initial` sin `parent_order_id`; `additional_changes` con `parent_order_id` y sin `inquiry_id`; entrega completa; purga solo terminal; hold no purgado; cierre y cancelación completos.
- `service_order_assignments`: `order_id`, `professional_id`, `role` (`lead`/`reviewer`), `assigned_by`, `assigned_at`, `revoked_at`, `revoked_by`, `revoked_reason`.
- `service_order_quotes`: `order_id`, `version`, `amount_clp`, `currency='CLP'`, `scope`, `terms_version`, `status`, `sent_at`, `expires_at`, `rejection_reason`, `created_by`, `created_at`; `unique(order_id, version)`.
- `service_order_acceptances`: `order_id`, `quote_id`, `quote_version`, `quoted_amount_clp`, `currency`, `accepted_by`, `accepted_at`, `terms_version`, `privacy_version`, `ai_processing_version`, `accepted_terms`, `accepted_privacy`, `ai_processing_authorized`, `acceptance_text_sha256`, `ip_hash`, `user_agent_hash`; `order_id` y `quote_id` únicos.
- `service_order_payments`: `order_id`, `quote_id`, `amount_clp`, `currency`, `method`, `reference`, `status`, datos de comprobante (`proof_*`), `submitted_at`, `confirmed_at`, `confirmed_by`, `rejected_at`, `rejected_by`, `rejection_reason`, `created_at`, `updated_at`.
- `service_order_documents`: `order_id`, `uploaded_by`, `document_kind`, `storage_bucket='service-documents'`, `storage_path`, `original_filename`, `mime_type='application/pdf'`, `size_bytes`, `sha256`, `page_count`, `validation_status`, `validation_error`, `scan_status`, `scan_provider`, `scan_result`, `scanned_at`, `published_at`, `deleted_at`, `purged_at`, `created_at`.
- `service_order_analyses`: `order_id`, `document_id`, `analysis_version`, `is_current`, `superseded_at`, `superseded_by`, `status`, `provider`, `model`, `prompt_version`, `schema_version`, `input_chars`, `input_truncated`, `result_json`, `evidence_json`, `reviewed_payload`, `review_status`, `reviewed_by`, `reviewed_at`, `review_notes`, tokens/costo, error sanitizado, timestamps; `unique(document_id, analysis_version)`.
- `service_order_revisions`: `order_id`, `round_number`, `status`, `requested_by`, `requested_at`, `window_ends_at_snapshot`, `reason`, `decision_reason`, `completed_at`, `created_at`; `unique(order_id, round_number)`.
- `service_order_events`: `order_id`, `event_type`, `from_state`, `to_state`, `audience`, `actor_type`, `actor_user_id`, `metadata`, `ip_hash`, `user_agent_hash`, `created_at`.
- `service_order_retention_actions`: `order_id`, `document_id`, `payment_id`, `action`, `from_retention_until`, `to_retention_until`, `legal_hold`, `reason`, `actor_user_id`, `created_at`.

### 4.3 Invariantes entre tablas

1. Una inquiry inicial produce como máximo una orden inicial.
2. Una orden `additional_changes` referencia `parent_order_id` y no reutiliza `inquiry_id`.
3. Una orden no puede tener dos aceptaciones, dos pagos confirmados, dos revisiones activas ni dos análisis current.
4. Un pago confirmado exige aceptación y coincidencia de `quote_id`, monto y moneda.
5. Un pago abierto no puede coexistir con otro pago abierto de la misma orden.
6. Una cotización `accepted` no se edita ni se reutiliza.
7. Un documento `deliverable` solo lo crea el servidor al generar el informe.
8. Un documento contractual se analiza solo si está `clean` y `validated`.
9. Un análisis se aprueba solo si es current y tiene `reviewed_payload`.
10. Un entregable solo se publica al entregar, con `published_at` y `delivered_at` consistentes.
11. Una revisión activa impide una segunda revisión activa.
12. `cancelled` no deja pagos abiertos ni revisiones activas.
13. Eventos, aceptaciones y acciones de retención son inmutables; no hay policies DELETE de cliente.
14. Los usuarios con historial de auditoría se desactivan; no se borran en cascada.

---

## 5. Estados y transiciones congelados

### 5.1 Intake

```text
nueva -> en_evaluacion
nueva -> descartada
en_evaluacion -> contactada
en_evaluacion -> descartada
contactada -> en_evaluacion
contactada -> convertida
contactada -> descartada
convertida -> terminal
descartada -> terminal
```

`convertida` es terminal en el intake. La conversión es idempotente y no crea una segunda orden para la misma inquiry.

### 5.2 Orden

Estados persistidos permitidos:

```text
created
awaiting_quote
quote_sent
accepted
awaiting_payment
awaiting_documents
in_analysis
in_review
ready_for_delivery
delivered
revision_requested
additional_quote_required
closed
cancelled
expired
```

Transiciones mínimas:

| Desde | Hacia | Actor | Condición |
|---|---|---|---|
| `created`/`awaiting_quote` | `quote_sent` | Admin | Cotización `sent` única y vigente. |
| `quote_sent` | `accepted` | Owner/admin empresa | Aceptación inmutable insertada y cotización `accepted`. |
| `accepted` | `awaiting_payment` | Sistema | Intento de pago `pending` por el monto exacto. |
| `awaiting_payment` | `awaiting_documents` | Admin | Pago `confirmed`, comprobante `clean`/`validated` y monto correcto. |
| `awaiting_documents` | `in_analysis` | Profesional/admin | Primer análisis sobre documento `input`/`annex` clean/validated. |
| `in_analysis` | `in_review` | Profesional/admin | Primer análisis current completado. |
| `in_review` | `ready_for_delivery` | Profesional/admin | Informe preparado o validado, aún no publicado. |
| `ready_for_delivery` | `in_review` | Profesional/admin | Reapertura auditada antes de versionar; exige motivo y evento. |
| `ready_for_delivery` | `delivered` | Profesional/admin | Deliverable clean/validated, publicación y ventana fijadas. |
| `delivered` | `revision_requested` | Owner/admin empresa | Dentro de ventana, ronda disponible y sin revisión activa. |
| `revision_requested` | `in_review` | Profesional/admin | Revisión tomada; no reinicia la ventana. |
| `revision_requested` | `additional_quote_required` | Owner/admin o sistema | Ronda agotada o ventana vencida. |
| `delivered` | `additional_quote_required` | Owner/admin o sistema | Ronda agotada o ventana vencida. |
| Cualquier estado no terminal | `cancelled` | Admin | Motivo, sin pagos abiertos ni revisiones activas; auditoría. |
| Cualquier estado terminal | `closed` | Admin/sistema | Cierre permitido, timestamps completos y sin trabajo activo. |
| `quote_sent` | `expired` | Job/aceptación | Cotización vencida; job idempotente o rechazo en aceptación. |

Reglas:

- Todo cambio de estado genera `service_order_events`.
- Las transiciones sensibles se validan en endpoint y en trigger `before update of status`.
- No se acepta una cotización vencida aunque el job aún no haya corrido.
- No se habilita carga documental sin pago confirmado.
- No se entrega sin informe validado y aprobado.
- No se cancela con pagos abiertos o revisiones activas.
- `accepted` es un estado persistido transitorio dentro de la misma transacción de aceptación; no es terminal y no se expone como estado final al cliente. Esta precisión está aprobada como D-06 (§13).

### 5.3 Estados técnicos separados

| Campo | Valores |
|---|---|
| `analysis_status` | `not_started`, `queued`, `processing`, `completed`, `failed`, `superseded` |
| `review_status` | `pending`, `in_review`, `approved` |
| `validation_status` | `pending`, `quarantined`, `validated`, `rejected` |
| `scan_status` | `pending`, `scanning`, `clean`, `infected`, `failed`, `unavailable` |
| `payment_status` | `pending`, `proof_submitted`, `confirmed`, `rejected` |
| `revision_status` | `requested`, `in_review`, `completed`, `declined` |
| `retention_state` | `active`, `held`, `purge_pending`, `purged`; derivado, no almacenado |
| `order_kind` | `initial`, `additional_changes` |

`retention_state` se deriva así:

- `held`: `legal_hold = true`.
- `purged`: `purged_at is not null`.
- `purge_pending`: `retention_until <= now()`, sin hold, sin purga, orden terminal, sin revisión activa, ventana cerrada y sin pago abierto.
- `active`: cualquier otro caso.

### 5.4 Cotización

Estados: `draft`, `sent`, `accepted`, `rejected`, `expired`, `superseded`.

- `draft` es editable.
- `sent` no se edita en monto, alcance, versión, términos ni expiración; se crea otra versión y la anterior pasa a `superseded`.
- `accepted` es inmutable y no se reutiliza.
- Una sola `sent` activa y una sola `accepted` por orden.
- Una cotización vencida no es aceptable.

### 5.5 Pago

Estados: `pending`, `proof_submitted`, `confirmed`, `rejected`.

- `pending -> proof_submitted`: finalize válido, comprobante clean/validated.
- `pending -> rejected`: fallo automático o intento no finalizado.
- `proof_submitted -> confirmed`: admin, monto correcto, lock y comprobante válido.
- `proof_submitted -> rejected`: admin con motivo.
- `confirmed` y `rejected` son terminales.
- Un fallo de escáner/validación rechaza el intento, elimina el objeto no validado y permite un nuevo intento.
- Un rechazo manual de un comprobante clean/validated conserva el objeto hasta la retención.
- El comprobante no se analiza con IA, no se publica y no se reutiliza como documento contractual.

### 5.6 Documento contractual

Estados de escaneo: `pending`, `scanning`, `clean`, `infected`, `failed`, `unavailable`.

Estados de validación: `pending`, `quarantined`, `validated`, `rejected`.

- `pending`/`quarantined`/`unavailable`/`failed` pueden reintentar `finalize` sobre la misma fila.
- `infected` se marca `rejected`, se elimina de Storage y sigue el procedimiento de incidentes.
- `rejected` por validación exige subir un documento nuevo.
- Solo `clean` + `validated` habilita análisis y descarga profesional.
- Un `deliverable` solo se publica al entregar.

### 5.7 Análisis y revisión

Estados de análisis: `queued`, `processing`, `completed`, `failed`, `superseded`.

Estados de revisión: `pending`, `in_review`, `approved`.

- Solo un análisis current y uno en ejecución por documento.
- Un reintento crea nueva versión y supersede la anterior.
- Solo se aprueba un análisis `is_current`.
- La entrega usa exclusivamente los `reviewed_payload` de análisis current aprobados.
- Un análisis superseded conserva historial, pero no puede aprobarse ni alimentar una entrega nueva.

### 5.8 Revisión de la orden

Estados: `requested`, `in_review`, `completed`, `declined`.

- Una revisión activa por orden.
- Solo owner/admin de empresa solicita.
- Fuera de ventana o sin ronda: se registra `declined` y se deriva a cotización adicional.
- Una segunda solicitud no se ejecuta.

---

## 6. Contrato API congelado

### 6.1 Convenciones

- Base: `/api/services`.
- Todo endpoint requiere autenticación salvo `POST /api/services/inquiries`.
- Los cuerpos son JSON y **nunca contienen bytes de archivos**. Los archivos se suben con signed upload URL y se confirman en `finalize`.
- El límite JSON existente de `2mb` se mantiene para metadatos; no se sube a 20 MB para archivos.
- `Idempotency-Key` obligatorio en todas las mutaciones de negocio.
- Rate limit por usuario/IP; el intake mantiene su rate limit existente.
- Respuestas de error: `{ error, code, requestId? }`, sin rutas, tokens, firmas, contenido ni detalles internos.
- `404` se usa cuando revelar `403` filtraría la existencia de un recurso de otro tenant.
- `409` para estado no permitido o conflicto de idempotencia no replayable.
- `503` con `code: SERVICES_NOT_READY_FOR_REAL_DOCUMENTS` cuando el gate esté cerrado.
- Toda ruta anidada valida que `quoteId`, `paymentId`, `docId`, `analysisId` o `revisionId` pertenezcan a la orden y al tenant.

### 6.2 Endpoints

| Método | Ruta | Actor | Gate | Efecto / precondición |
|---|---|---|---|---|
| POST | `/api/services/inquiries` | Público | No | Intake existente; idempotencia y rate limit. |
| GET | `/api/services/admin/inquiries` | Admin | No | Bandeja de intake paginada. |
| POST | `/api/services/admin/inquiries/:id/convert` | Admin | No | Conversión idempotente; empresa/usuario/orden; marca `convertida`. |
| GET | `/api/services/admin/orders` | Admin | No | Bandeja de órdenes con filtros y paginación. |
| GET | `/api/services/orders` | Empresa/asignado/admin | No | Lista paginada con proyección por rol. |
| GET | `/api/services/orders/:id` | Empresa/asignado/admin | No | Ficha sin datos financieros para profesional. |
| POST | `/api/services/orders/:id/quotes` | Admin | No | Crea versión `draft`. |
| POST | `/api/services/orders/:id/quotes/:quoteId/send` | Admin | No | Marca `sent`, fija expiración y notifica. |
| POST | `/api/services/orders/:id/quotes/:quoteId/accept` | Owner/admin empresa | No | Aceptación inmutable; crea intento `pending`; mueve a `awaiting_payment`. |
| GET | `/api/services/orders/:id/quotes/:quoteId` | Owner/admin empresa o admin | No | Detalle comercial; no profesional. |
| GET | `/api/services/orders/:id/acceptance` | Owner/admin empresa o admin | No | Evidencia de aceptación; solo lectura. |
| GET | `/api/services/orders/:id/payments` | Owner/admin empresa o admin | No | Intentos y estado; sin URL. |
| POST | `/api/services/orders/:id/payments` | Owner/admin empresa o admin | No | Nuevo intento tras rechazo; no otro intento abierto. |
| POST | `/api/services/orders/:id/payments/:paymentId/proof/upload-url` | Owner/admin empresa | Sí | Signed upload URL en `service-payment-proofs`; valida monto y rol. |
| POST | `/api/services/orders/:id/payments/:paymentId/proof/finalize` | Owner/admin empresa | Sí | Magic bytes, malware y `proof_submitted`; sin IA. |
| POST | `/api/services/admin/orders/:id/payments/:paymentId/confirm` | Admin | No | Confirma pago; mueve a `awaiting_documents`. |
| POST | `/api/services/admin/orders/:id/payments/:paymentId/reject` | Admin | No | Rechaza con motivo; orden sigue en `awaiting_payment`. |
| POST | `/api/services/orders/:id/documents/upload-url` | Owner/admin/member | Sí | Crea fila pending `input`/`annex` y signed upload URL en cuarentena. |
| POST | `/api/services/orders/:id/documents/:docId/finalize` | Owner/admin/member | Sí | Escanea, valida y promueve si corresponde. |
| GET | `/api/services/orders/:id/documents` | Empresa/asignado/admin | No | Metadatos con proyección segura; sin rutas ni URLs. |
| GET | `/api/services/orders/:id/documents/:docId/url` | Según visibilidad | No D17 | URL firmada 300 s solo para objeto autorizado y clean/validated. |
| GET | `/api/services/orders/:id/payments/:paymentId/proof/url` | Owner/admin empresa o admin | No D17 | URL firmada 300 s solo si clean/validated y no purgado. |
| POST | `/api/services/orders/:id/analysis` | Profesional asignado/admin | Sí | Crea/versiona análisis de documento clean/validated. |
| GET | `/api/services/orders/:id/analysis/:analysisId` | Profesional asignado/admin | No | Análisis, evidencia y revisión; no empresa. |
| PATCH | `/api/services/orders/:id/analysis/:analysisId/review` | Profesional asignado/admin | No | Guarda payload revisado. |
| POST | `/api/services/orders/:id/analysis/:analysisId/approve` | Profesional asignado/admin | No | Aprueba análisis current. |
| POST | `/api/services/orders/:id/deliverables` | Profesional/admin | Sí | Genera PDF, escanea, valida y entrega si corresponde. |
| POST | `/api/services/orders/:id/revisions` | Owner/admin empresa | No | Solicita ronda incluida o deriva a adicional. |
| PATCH | `/api/services/orders/:id/revisions/:revisionId` | Profesional asignado/admin | No | Toma o completa revisión; no entrega. |
| GET | `/api/services/orders/:id/events` | Empresa/asignado/admin | No | Timeline filtrado por audiencia. |
| POST | `/api/services/orders/:id/transition` | Admin/servicio | Según destino | Transición validada; no sustituye gates. |
| POST | `/api/services/admin/orders/:id/assignments` | Admin | No | Crea/revoca asignación en transacción. |
| POST | `/api/services/admin/orders/:id/retention` | Admin | No | Fija retención, hold o solicitud de purga; sin worker. |
| GET | `/api/services/admin/orders/:id/retention` | Admin | No | Estado y acciones auditadas. |
| GET | `/api/services/admin/quarantine` | Admin | No | Documentos/comprobantes en cuarentena o fallidos. |
| POST | `/api/services/admin/orders/:id/quarantine/:docId/retry` | Admin | Sí | Reintenta escaneo/validación; no promueve sin clean. |

No se agregan rutas de mensajería, documentos legacy, descargas públicas ni endpoints que acepten bytes de archivos en JSON.

### 6.3 Reglas específicas de operaciones críticas

- `convert`: idempotente; verifica inquiry no convertida; resuelve/crea empresa y usuario con flujo server-side aprobado; crea membresía; crea orden; marca inquiry; evento y correo.
- `accept`: bloquea cotización; valida `sent`, vigencia, versión y monto; inserta aceptación; marca cotización `accepted`; crea intento `pending`; mueve la orden a `awaiting_payment`; todo en una transacción.
- `proof/upload-url`: exige pago `pending`, owner/admin, monto igual a la aceptación y ausencia de comprobante previo válido. No confía en `proof_path` ni `amount_clp` del cliente.
- `proof/finalize`: descarga el objeto de cuarentena del mismo intento; valida tamaño, magic bytes y malware; no usa parser ni IA; si falla, rechaza el intento y elimina el objeto no validado.
- `confirm` y `reject`: solo admin; lock de fila; confirmar exige monto, comprobante clean/validated y ausencia de otro pago confirmado; rechazar exige motivo. Ninguno habilita documentos por sí solo.
- `documents/upload-url`: exige orden en `awaiting_documents`/`in_analysis`/`in_review`, pago confirmado, kind `input`/`annex`, ruta server-side y gate abierto. No crea `deliverable`.
- `documents/finalize`: descarga, valida tamaño/magic/PDF/malware/hash; un `infected` se rechaza y elimina; `unavailable`/`failed` deja cuarentena; solo `clean` + `validated` promueve a `clean/`.
- `analysis`: solo documento `input`/`annex` clean/validated; no deliverable; el primer análisis puede mover `awaiting_documents -> in_analysis`; versionar supersede el current; no dos ejecuciones simultáneas.
- `review`/`approve`: solo profesional asignado o admin; aprobar exige payload revisado y `is_current=true`.
- `deliverables`: genera PDF server-side; lo escanea/valida; si clean/validated, transiciona a `delivered` y fija `published_at = delivered_at`; si no, queda `ready_for_delivery`.
- `revisions`: solo owner/admin dentro de ventana; una activa; segunda solicitud se registra `declined` y deriva a adicional si corresponde.
- `documents/:docId/url`: no D17; solo `deliverable` publicado/entregado para empresa, solo `input`/`annex` clean/validated para profesional asignado, admin según autorización; nunca cuarentena, borrado o purgado.
- `proof/url`: no D17; solo owner/admin empresa o admin, comprobante clean/validated y no purgado; nunca profesional/member/viewer.

### 6.4 Mapa de errores

| Situación | Respuesta |
|---|---|
| Gate cerrado | `503` con `code: SERVICES_NOT_READY_FOR_REAL_DOCUMENTS`; sin razones internas. |
| Sin autenticación | `401`. |
| Sin permiso, tenant o asignación | `403` o `404` para no filtrar existencia. |
| Estado no permitido | `409`. |
| Validación de entrada | `400`/`422`. |
| MIME o tamaño | `415`/`413`. |
| Idempotencia replayable | `200` con el resultado previo. |
| Conflicto de idempotencia no replayable | `409`. |

---

## 7. Matriz de roles y permisos congelada

| Acción | Anon | Owner/Admin empresa | Member | Viewer | Profesional asignado | Admin plataforma |
|---|---:|---:|---:|---:|---:|---:|
| Crear inquiry | Sí | — | — | — | — | — |
| Ver intake | No | No | No | No | No | Sí |
| Convertir inquiry | No | No | No | No | No | Sí |
| Leer orden | No | Sí | Sí | Sí | Sí, asignada | Sí |
| Aceptar cotización | No | Sí | No | No | No | No |
| Ver cotización/aceptación | No | Sí | No | No | No | Sí |
| Ver/crear pago | No | Sí | No | No | No | Sí |
| Subir comprobante | No | Sí | No | No | No | No |
| Confirmar/rechazar pago | No | No | No | No | No | Sí |
| Subir documento contractual | No | Sí | Sí | No | No | No |
| Descargar insumo/anexo | No | No | No | No | Sí, asignado y clean | Sí |
| Descargar informe final | No | Sí | Sí | Sí | Sí, asignado | Sí |
| Ejecutar análisis | No | No | No | No | Sí, asignado | Sí |
| Revisar/aprobar análisis | No | No | No | No | Sí, asignado | Sí |
| Generar/entregar informe | No | No | No | No | Sí, asignado | Sí |
| Solicitar revisión | No | Sí | No | No | No | No |
| Tomar/completar revisión | No | No | No | No | Sí, asignado | Sí |
| Leer eventos | No | Sí, `customer` | Sí, `customer` | Sí, `customer` | Sí, `internal`/`customer` | Sí, todos |
| Asignar profesional | No | No | No | No | No | Sí |
| Retención/hold | No | No | No | No | No | Sí |
| Reintentar cuarentena | No | No | No | No | No | Sí |

Reglas:

- `security_company_access` incluye `member`; no se usa para aceptar, pagar o subir comprobantes.
- Para aceptar, crear/subir comprobante y solicitar revisión se exige `security_company_role(...) in ('owner','admin')`.
- Para cargar documentos contractuales se exige `security_company_role(...) in ('owner','admin','member')`.
- Para acciones profesionales se exige asignación activa en `service_order_assignments`; no se usa `profiles.role` ni pertenencia a la empresa.
- El admin de plataforma se evalúa solo con `security_platform_admin()`.

---

## 8. RLS y aislamiento multi-tenant congelados

### 8.1 Reglas generales

- `REVOKE INSERT, UPDATE, DELETE` de `anon`/`authenticated` en todas las tablas del dominio.
- `GRANT SELECT` solo sobre vistas/proyecciones seguras o columnas explícitas; nunca `SELECT *` sobre tablas base.
- Las policies RLS existen como segunda barrera, aunque el acceso del navegador se sirva por endpoints o vistas.
- `service_role` no se expone al navegador y no sustituye triggers.
- No se crean policies DELETE para clientes.
- Toda lectura de otra empresa debe devolver cero filas; los endpoints no deben revelar existencia.
- Las rutas server-side recalculan tenant, rol, asignación, estado y relaciones en cada request.

### 8.2 Matriz de lectura RLS

| Tabla | SELECT permitido |
|---|---|
| `service_inquiries` | Solo admin (`security_platform_admin`). |
| `service_orders` | `security_company_access(company_id)` o `security_service_order_assigned(id)` o admin. |
| `service_order_assignments` | Empresa de la orden, profesional de la propia asignación o admin. |
| `service_order_quotes` | Solo owner/admin de la empresa o admin. |
| `service_order_acceptances` | Solo owner/admin de la empresa o admin. |
| `service_order_payments` | Solo owner/admin de la empresa o admin. |
| `service_order_documents` | Empresa solo `deliverable` con `published_at <= delivered_at`, no borrado; profesional asignado para metadatos; admin todo. |
| `service_order_analyses` | Solo profesional asignado o admin. |
| `service_order_revisions` | Empresa, profesional asignado o admin. |
| `service_order_events` | Empresa solo `audience='customer'`; profesional asignado `internal`/`customer`; admin todo. |
| `service_order_retention_actions` | Solo admin. |

### 8.3 Helpers y recursión

- `security_service_order_assigned(order_id)` encapsula la asignación activa y evita recursión de policies.
- Las policies de asignación, documentos, análisis, revisiones y eventos usan el helper, no subqueries directas a `service_order_assignments`.
- `security_company_role(company_id)` es la autoridad para owner/admin/member/viewer.
- `security_platform_admin()` es la única autoridad de admin.
- No se acepta `profiles.role`, `user_metadata`, email ni IDs enviados por el cliente como autoridad.

### 8.4 Columnas no expuestas

Nunca se exponen a `authenticated` columnas como:

- `storage_path`, `proof_path`, `proof_bucket`.
- `sha256`, `proof_sha256`, `scan_provider`, `scan_result`, `validation_error`, `proof_scan_result`.
- `amount_clp`, `quoted_amount_clp`, `quote_id`, `payment_id` fuera de proyecciones comerciales autorizadas.
- `legal_hold`, `retention_until`, `purge_started_at`, `purged_at`.
- `customer_user_id`, `created_by`, `ip_hash`, `user_agent_hash`.
- `metadata` de eventos que pueda contener datos financieros o rutas.

---

## 9. Contrato de Storage congelado

### 9.1 Buckets

| Bucket | Contenido | Formatos | Límite | Acceso |
|---|---|---|---|---|
| `service-documents` | `input`, `annex`, `deliverable` | Solo PDF | 20 MB | Privado; sin policies para `anon`/`authenticated`; solo `service_role`; URL firmada 300 s. |
| `service-payment-proofs` | Comprobantes | PDF, PNG, JPEG | 10 MB (10,485,760 bytes), límite normativo de v1; 20 MB fuera de alcance | Privado; sin policies para `anon`/`authenticated`; solo `service_role`; URL firmada 300 s. |

El límite de 10 MB (10,485,760 bytes) es el máximo normativo de v1 para comprobantes. Los 20 MB quedan fuera del alcance de v1; una ampliación futura requiere una nueva decisión documentada y evidencia técnica suficiente de Storage, procesamiento y escaneo. Esta decisión de diseño no acredita que Storage, scanner o infraestructura estén implementados o verificados. La observación histórica de 10 MB y el addendum de `SPRINT_2_READINESS_AUDIT.md` se conservan sin reescritura.

### 9.2 Prefijos

```text
quarantine/{company_id}/{order_id}/documents/{document_id}/
clean/{company_id}/{order_id}/documents/{document_id}/
quarantine/{company_id}/{order_id}/payments/{payment_id}/
clean/{company_id}/{order_id}/payments/{payment_id}/
```

Reglas:

- La ruta se genera server-side; nunca se acepta desde el cliente.
- No se usa `getPublicUrl` ni CDN público.
- No se guarda una URL firmada en base de datos ni en logs.
- Un objeto en cuarentena no se sirve, analiza ni descarga.
- Al promoverse, el objeto se mueve/copia a `clean/` y se actualiza la fila en la misma operación lógica.
- El bucket legacy `documents` no se usa, modifica ni migra en Block 1.
- El comprobante nunca se copia a `service-documents` ni se analiza con IA.
- Un PDF contractual debe ser `%PDF-`; un comprobante debe cumplir magic bytes de PDF, PNG (`89 50 4E 47`) o JPEG (`FF D8 FF`).
- `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff` si se sirve por proxy; si se usa URL firmada, el visor debe ser sandbox.

### 9.3 Visibilidad de lectura

- Empresa: solo `deliverable` con `published_at is not null`, `published_at <= delivered_at`, `deleted_at is null`, `purged_at is null`.
- Profesional asignado: solo documentos contractuales `input`/`annex` con `scan_status='clean'`, `validation_status='validated'`, no borrados ni purgados.
- Admin: según autorización operativa; no se expone al cliente.
- Comprobante: solo owner/admin de la empresa o admin, `clean`/`validated`, no `proof_deleted_at`/`proof_purged_at`.
- Nunca se emite URL de cuarentena, `infected`, `unavailable`, `failed`, `rejected`, borrado o purgado.

---

## 10. Contratos de adaptadores congelados

### 10.1 Scanner antimalware

Contrato mínimo:

```text
scanBuffer({ buffer, filename?, mimeType?, signal? }) -> {
  status: 'clean' | 'infected' | 'failed' | 'unavailable',
  provider: string,
  details?: string,   // sanitizado
  durationMs?: number
}

checkHealth() -> {
  healthy: boolean,
  provider: string,
  status?: string,
  details?: string,
  engineVersion?: string,
  signatureVersion?: string,
  signaturesUpdatedAt?: string
}
```

Reglas:

- Estados permitidos: `clean`, `infected`, `failed`, `unavailable`.
- Timeout máximo: `8000` ms; el adaptador recibe `AbortSignal`.
- `scanWithTimeout` devuelve `unavailable` por timeout o configuración ausente; `failed` por error del adaptador.
- `MockMalwareScanner` solo en `development`/`test`, con archivos sintéticos y EICAR; no se usa en la app como bypass.
- En producción se exige fábrica síncrona de scanner confiable; se prohíbe inyección directa, mock o placeholder.
- Un scanner no configurado en producción es `UnconfiguredMalwareScanner` y el gate permanece cerrado.
- El scanner no valida tamaño, MIME ni PDF; esas validaciones pertenecen al endpoint de `finalize`.
- `infected` obliga a eliminar el objeto y seguir el procedimiento de incidentes; no se registra la firma completa del exploit.

### 10.2 CommercialReadinessGate

Contrato congelado:

- Código: `SERVICES_NOT_READY_FOR_REAL_DOCUMENTS`.
- Excepción: `CommercialReadinessError`, `statusCode=503`.
- Fábrica: `createCommercialReadinessGate(options)`.
- Métodos: `evaluate()`, `isReady()`, `assertReadyForRealDocuments()`, `assertProductionStartupSafe()`, `scanDocument()`.
- `scanDocument({ buffer, filename, mimeType })`:
  1. Ejecuta `assertReadyForRealDocuments()`.
  2. Exige scanner de producción confiable.
  3. Ejecuta `scanBufferWithTimeout` con timeout.
  4. Devuelve el resultado normalizado y registra el estado del circuito.
  5. No valida PDF, tamaño, hash ni MIME; eso corresponde al caller.
- `assertProductionStartupSafe()`:
  - En entorno desconocido: lanza.
  - En no producción: devuelve `skipped=true`, `processingEnabled=false`.
  - En producción con `SERVICES_REAL_DOCUMENTS_ENABLED=false`: devuelve `ok=true`, `processingEnabled=false`.
  - En producción con flag activo y gate no listo: lanza.
- El gate se evalúa de nuevo en cada operación documental; no se cachea una decisión `allowed` entre requests.
- El flag no reemplaza evidencia, scanner, retención, DPA, legal ni probe.
- Razones D17 sanitizadas incluyen, entre otras: entorno, evidencia, scanner, retención, purga, infraestructura, DPA, proveedor IA y validación legal.
- La respuesta pública no incluye `reasons`, detalles de evidencia ni configuración.

Repositorio de evidencia mínimo (`ReadinessEvidenceRepositoryPort`):

- `getRetentionPolicyEvidence()`
- `getAiDpaEvidence()` / `getDpaEvidence()`
- `getLegalValidationEvidence()`
- `getPurgeWorkerEvidence()`
- `verifyNonDestructiveInfrastructure()` / `getInfrastructureEvidence()`
- `loadEvidence()` compone el snapshot.

En producción el repositorio debe ser confiable; no se acepta un repositorio autodeclarado por el caller sin control.

### 10.3 Proveedor IA

Contrato:

- `chatCompletion({ model, system, user, messages?, maxTokens?, temperature?, budget?, metering? })`.
- `isAIProviderConfigured()` determina si existe API key.
- `detectAIProvider(baseUrl)` identifica `openai`, `openrouter`, `groq`, `deepseek`, `anthropic` u host.
- `classifyProviderError(status, text, retryAfterSeconds)` devuelve códigos tipados (`AI_PROVIDER_RATE_LIMITED`, `AI_PROVIDER_AUTH`, `AI_PROVIDER_SERVER_ERROR`, `AI_PROVIDER_NETWORK`, `AI_PROVIDER_TIMEOUT`, etc.).
- La llamada usa JSON mode, timeout y presupuesto de llamadas; no navega, no usa herramientas y no accede a red fuera del proveedor.
- El DPA/condiciones del proveedor deben estar aprobados antes de enviar documentos reales; esto pertenece a D17.
- El comprobante de pago nunca entra al proveedor IA.
- `extractPdfText(buffer, { maxChars=80000 })` devuelve `{ text, pageCount }`.
- `extractPdfText` rechaza `NOT_A_PDF`, PDF vacío, corrupto o con contraseña; limita a 200 páginas; usa `isEvalSupported:false`.
- PDF sin texto se rechaza con instrucción; no se inventa contenido ni se llama IA.
- El prompt debe tratar documento y filename como datos no confiables, delimitar el contenido, prohibir instrucciones embebidas, prohibir conocimiento externo y exigir evidencia.
- La salida se valida con Zod antes de persistir; cada hallazgo debe referenciar `fragment_id`/`page_number` o marcarse `sin_evidencia`.
- `reviewed_payload` aprobado es la única fuente del informe final; `result_json` crudo no se expone al cliente.

---

## 11. Fail-closed, auditoría y trazabilidad

### 11.1 Secuencia de operación protegida

```text
request
  -> autenticación
  -> autorización de tenant/asignación/admin
  -> validación de orden, estado y relaciones
  -> validación comercial (aceptación, pago, revisión)
  -> assertReadyForRealDocuments()
  -> validación documental / scanner
  -> efecto de negocio
  -> evento
```

Si el gate falla:

- No se crea fila documental nueva.
- No se emite URL de procesamiento.
- No se descarga el objeto para procesar.
- No se ejecuta parser ni IA.
- No se marca `clean`/`validated`.
- Se responde `503` sanitizado.
- El objeto en cuarentena permanece y se reconcilia/reintenta o se purga según retención.

Una URL emitida antes de una caída no permite promover ni analizar: `finalize` y `analysis` revalidan de forma independiente.

### 11.2 Política de lectura

La lectura de objetos ya `clean`/`validated` no requiere D17 por lectura, pero exige:

1. Autenticación.
2. Autorización y tenant.
3. Pertenencia a la orden o asignación activa.
4. Estado válido del documento.
5. Publicación cuando corresponda.
6. Retención vigente y no purgado.
7. Prohibición absoluta de cuarentena o no validado.

La lectura autorizada no promueve, escanea, analiza ni modifica el documento. La caída del scanner no impide descargar un objeto ya validado y autorizado, pero no habilita procesamiento nuevo.

Kill switch de lectura: decisión operativa independiente, no implementada, no requisito de B1.0 y no puede relajar tenant, asignación, publicación, retención ni cuarentena.

### 11.3 Eventos

- Todo cambio de estado genera un evento append-only.
- `audience`: `customer`, `internal` o `admin`.
- `actor_type`: `customer`, `professional`, `admin`, `system` o `ai`.
- `metadata` solo contiene IDs, códigos, contadores y timestamps; no texto libre, PII, rutas, URLs, tokens, secretos ni contenido contractual.
- `ip_hash`/`user_agent_hash` usan salt server-side; no se guarda IP cruda.
- Eventos financieros usan `audience='admin'` y no se exponen a empresa ni profesional.
- UPDATE/DELETE de eventos falla en base de datos, incluso para `service_role`.
- La retención de eventos no se implementa en Block 1; cualquier purga de auditoría requiere procedimiento legal separado.

### 11.4 Logs

- Logs internos: `request_id`, `order_id`, `document_id`/`payment_id`, operación y códigos D17 sanitizados.
- Prohibido: contenido contractual, nombres de archivo, rutas, URLs firmadas, tokens, service keys, firmas de malware, PII.
- Respuesta pública: mensaje genérico y código; sin evidencia, configuración ni razones internas.

---

## 12. Estrategia de pruebas y aceptación de B1.0

### 12.1 Capas

| Capa | Herramienta | Cobertura |
|---|---|---|
| Unitaria | Vitest | Estados, schemas, permisos, errores, sanitización, helpers. |
| Migración/RLS | Vitest + PGlite | Tablas, constraints, triggers, índices, RLS, inmutabilidad, cross-tenant. |
| Rutas | Express de prueba + HTTP | Auth, estados, idempotencia, rate limit, 503/403/404/409. |
| Gate | Gate real en configuración de prueba | Cada frontera documental, sin bypass, sin efectos al fallar. |
| Storage | Adaptador falso | Signed URLs, cuarentena/clean, no `getPublicUrl`, no logs. |
| PDF | Fixtures sintéticos | Magic bytes, tamaño, cifrado, sin texto, páginas, hash, EICAR. |
| Concurrencia | PGlite/transacciones | Aceptación, pago, análisis y revisión únicos. |

### 12.2 Configuración de pruebas

La suite debe construir el gate real con `environment:'production'`, `realDocumentsEnabled:true`, scanner de producción de prueba por fábrica confiable, parámetros de retención de prueba, repositorio de evidencia de prueba y proveedor IA de prueba. No se cambia `NODE_ENV` de la app ni se agrega rama de bypass.

Los fixtures son sintéticos; no son evidencia D17, no aprueban D17 y no autorizan producción.

### 12.3 Casos mínimos obligatorios

- Gate cerrado por cada razón D17 en upload, finalize, analysis, deliverables, proof upload/finalize y retry.
- Gate cerrado no crea filas, no firma URLs, no descarga para procesar y no llama parser/IA.
- Gate abierto con evidencia completa permite happy path sintético.
- Flag `true` sin evidencia: `503`; flag `false`: `503`.
- Scanner `unavailable`: documento en cuarentena; comprobante rechazado.
- EICAR: rechazo, eliminación y evento sanitizado.
- PDF falso, cifrado, sin texto, corrupto, >200 páginas, >20 MB: rechazo.
- Comprobante >10 MB (10,485,760 bytes): rechazo; 20 MB queda fuera del alcance de v1.
- Cross-tenant en cada endpoint.
- Profesional no asignado; profesional no ve pagos.
- Member no acepta, no paga y no ve comprobantes; viewer no escribe.
- Aceptación, pago confirmado, análisis y revisión concurrentes: uno solo.
- Eventos, aceptaciones y retención inmutables; sin policies DELETE.
- Purga de comprobante: fija `proof_deleted_at` antes de `proof_purged_at` y nulifica `proof_path` solo en la función auditada.
- No `getPublicUrl`; no URLs en logs; logs sin contenido, rutas, tokens ni PII.
- Idempotencia de conversión, cotizaciones, pagos, comprobantes, documentos, análisis y entregables.
- Expiración de cotización y aceptación vencida.
- Cliente no ve borradores ni análisis crudos; solo informe final publicado/entregado.

### 12.4 Matriz de aceptación B1.0

| ID | Criterio | Estado |
|---|---|---|
| A1 | Modelo de datos y relaciones definidos | Definido; D-01/D-02/D-03/D-04/D-08 aprobadas |
| A2 | Estados y transiciones definidos | Definido; D-06 aprobada |
| A3 | Contratos API y responsabilidades server-side | Definido |
| A4 | Matriz de roles y permisos | Definido |
| A5 | Estrategia RLS y multi-tenant | Definido |
| A6 | Contratos de Storage y buckets | Definido; D-05 aprobada (10 MB / 10,485,760 bytes; 20 MB fuera de v1) |
| A7 | Interfaces de scanner, gate y proveedor IA | Definido |
| A8 | Comportamiento fail-closed y política de lectura | Definido |
| A9 | Estrategia de pruebas y fixtures | Definido |
| A10 | Auditoría de eventos y trazabilidad | Definido |
| A11 | Kill switch de lectura como decisión pendiente no bloqueante | Definido como fuera de B1.0 |
| A12 | Contradicciones resueltas y aprobadas | **Aprobado — D-01 a D-08 revisadas; D-05 resuelta** |

**A12 aprobado. B1.0 queda en `READY FOR FORMAL APPROVAL — NOT CLOSED` hasta la aprobación formal del usuario; no se declara `CLOSED`.**

---

## 13. Contradicciones y decisiones que requieren aprobación

Ninguna de estas decisiones se resuelve silenciosamente. D-01, D-02, D-03, D-04, D-05, D-06, D-07 y D-08 están aprobadas o aceptadas. Ninguna se presenta como implementación realizada.

### D-01 — Documentos pendientes de carga

**Estado:** APROBADA.

**Severidad:** bloqueante para B1.1 mientras no se refleje en el modelo documental.

**Conflicto:** el DDL original de `service_order_documents` exigía `storage_path`, `size_bytes` y `sha256` `NOT NULL`. `documents/upload-url` crea la fila `pending` antes de que el objeto exista y antes de que `finalize` calcule tamaño y hash.

**Decisión aprobada:** en B1.1:

- `storage_path` se genera server-side en `upload-url` y puede existir antes del objeto.
- `size_bytes` y `sha256` pueden ser `NULL` mientras el documento está pendiente de finalización.
- `validation_status='validated'` exige `size_bytes is not null`, `sha256 is not null` y `page_count is not null and page_count <= 200`.
- La creación (`upload-url`), la carga y la finalización deben compartir el mismo contrato de ruta, estado y metadatos.
- No se cambia el esquema real ni se crea una migración en B1.0.

### D-02 — Ruta de Storage después de purgar

**Estado:** APROBADA.

**Severidad:** bloqueante para B1.6 y para la política de retención.

**Conflicto:** §7.12 ordenaba `UPDATE service_order_documents SET storage_path = null`, pero el DDL declaraba `storage_path text not null unique`.

**Decisión aprobada:** mantener `NOT NULL UNIQUE` y, al purgar, reemplazar el valor por una ruta pseudónima, única y no reconstruible: `purged/{document_id}`. No se elimina `NOT NULL`. La ruta pseudónima no representa un objeto disponible en Storage y solo conserva integridad y unicidad de la fila. Actualizar §7.12 para que no use `NULL`.

### D-03 — Purga de resultados de análisis

**Estado:** APROBADA.

**Severidad:** bloqueante para B1.6.

**Conflicto:** §7.12 ordenaba vaciar `summary`, `claims`, `evidence_sources`, `obligations`, `risks`, `key_points`, `parties` y `reviewed_payload`, pero §7.8 solo definía `result_json`, `evidence_json` y `reviewed_payload`.

**Decisión aprobada:** purgar `result_json`, `evidence_json` y `reviewed_payload` a `{"purged": true}` en todas las versiones del documento. Preservar `provider`, `model`, `prompt_version`, `schema_version`, tokens, costo y timestamps para trazabilidad, sujeto a la política de retención aprobada. No se inventan columnas ni se hace referencia a campos que no existan en el modelo contractual.

### D-04 — Consistencia de estados al purgar documentos

**Estado:** APROBADA.

**Severidad:** bloqueante para B1.6.

**Conflicto:** §7.12 marcaba `validation_status='rejected'` y `purged_at`, pero:

- `published_at` no puede quedar no nulo si `validation_status` deja de ser `validated`.
- `purged_at` exige `deleted_at is not null`.
- El procedimiento no ordena fijar `deleted_at` ni limpiar `published_at`.

**Decisión aprobada:** ejecutar la purga de forma transaccional y fijar, en la misma operación:

- `published_at = NULL`.
- `deleted_at = COALESCE(deleted_at, now())`.
- `purged_at = now()`.
- `validation_status = 'rejected'`.
- `storage_path` se reemplaza por la ruta pseudónima de D-02.

Registrar el evento y la acción de retención correspondientes. Esta decisión documental no declara implementado el procedimiento.

### D-05 — Límite de tamaño de comprobantes de pago

**Estado:** APROBADA.

**Severidad:** alta para B1.1 (bucket y validaciones); resuelta documentalmente.

**Conflicto histórico:** diseño/plan proyectaban 20 MB para `service-payment-proofs`; `SPRINT_2_READINESS_AUDIT.md` registró 10 MB como valor observado/proyectado en su fecha.

**Decisión aprobada:** el usuario aprobó expresamente:

- `service-payment-proofs` acepta PDF, PNG y JPEG.
- El límite máximo normativo de v1 es **10 MB (10,485,760 bytes)**.
- `upload-url` y `finalize` rechazan comprobantes que excedan el límite.
- **20 MB queda fuera del alcance de v1**; no es objetivo pendiente ni límite normativo.
- Una ampliación futura requiere una nueva decisión documentada y evidencia técnica suficiente de Storage, procesamiento y escaneo.
- Esta decisión de diseño no acredita que Storage, scanner o infraestructura estén implementados o verificados.

La observación histórica y el addendum fechado de `SPRINT_2_READINESS_AUDIT.md` se conservan sin reescritura; la resolución posterior se registra en ese informe.

### D-06 — Estado `accepted`

**Estado:** APROBADA.

**Severidad:** media para B1.2.

**Conflicto:** el diseño incluía `accepted` en el enum y en la máquina de estados; el plan lo describía como “hito canónico, no un estado final persistido” y mostraba `quote_sent -> awaiting_payment`.

**Decisión aprobada:** `accepted` puede existir transitoriamente dentro de la misma transacción de aceptación y la operación avanza inmediatamente a `awaiting_payment`. `accepted` no es terminal y la API no lo expone como estado final. Se corrige la redacción del plan para describirlo como estado transitorio persistido, no como estado que nunca se persiste, y se alinean modelo de estados, contratos API y pruebas.

### D-07 — Aceptación de privacidad en inquiries

**Estado:** INFORMATIVA; ACEPTADA.

**Severidad:** informativa para B1.2; no bloquea B1.1.

**Situación:** `service_inquiries.privacy_accepted_at` existe con default `now()` y el formulario envía `privacyAccepted: true`; eso corresponde al consentimiento de la etapa de intake y no equivale a la aceptación contractual versionada de `service_order_acceptances`.

**Decisión aceptada:** no reutilizar `privacy_accepted_at` como evidencia de aceptación contractual. La aceptación de cotización, términos, privacidad y tratamiento IA se registra exclusivamente en `service_order_acceptances`, con su versión y evidencia. No se modifica el esquema en B1.0.

### D-08 — Purga de comprobantes de pago

**Estado:** APROBADA.

**Severidad:** bloqueante para B1.6.

**Conflicto:** §7.12 ordenaba `UPDATE service_order_payments SET proof_path = null, proof_purged_at = now()`, pero el DDL exige `check (proof_purged_at is null or proof_deleted_at is not null)`. El procedimiento no fijaba `proof_deleted_at`.

**Decisión aprobada:** en la misma transacción de purga, fijar:

- `proof_deleted_at = COALESCE(proof_deleted_at, now())`.
- `proof_purged_at = now()`.
- `proof_path = NULL`.

Preservar los datos financieros y de decisión que deban permanecer por trazabilidad y registrar la acción `purged` en `service_order_retention_actions`. No se declara implementado el procedimiento.

---

## 14. Dependencias externas y bloqueadores

Estos elementos no bloquean el diseño ni B1.0, pero bloquean D17/producción:

- Selección y contratación del proveedor antimalware.
- DPA y condiciones del proveedor IA.
- Aprobación legal/privacidad y transferencia internacional.
- Política de retención aprobada con parámetros y versión.
- Worker de purga operativo y evidencia reciente.
- Probe no destructivo de Storage/DB.
- Scanner real saludable con firmas vigentes.
- Aprobación formal para activar `SERVICES_REAL_DOCUMENTS_ENABLED`.

H-07 no se cierra con esta evidencia. D17 no se aprueba por integrar el gate ni por cerrar H-07.

---

## 15. Estado Git y cambios de esta entrega

- `HEAD` observado: `dc3a51a` — `feat: actualizar footer global con paleta crema y badge NVIDIA Inception`.
- Ese commit es un cambio ajeno al alcance B1.0; no se modifica ni se revierte.
- `origin/main` local: `6c20edd63615ed1ba1429a8b58be6f54d3c73339`.
- No se ejecutó push.
- Esta entrega actualiza exclusivamente documentación de contratos, plan, diseño y auditoría; no hay cambios de código, migraciones, rutas, buckets ni configuración.
- No se procesaron documentos reales.
- `SERVICES_REAL_DOCUMENTS_ENABLED` no se activó.

---

## 16. Veredicto B1.0

**Estado:** `READY FOR FORMAL APPROVAL — NOT CLOSED`.

Contratos definidos: datos, estados, API, roles, RLS, Storage, adaptadores, fail-closed, pruebas y auditoría. D-05 resuelta y A12 aprobado; no quedan decisiones D-01–D-08 abiertas.

Pendiente para cerrar B1.0:

1. Aprobación formal del usuario sobre el resultado documental revisado.
2. Confirmación de que el modelo de datos resultante no requiere cambios adicionales antes de B1.1.

Hasta entonces:

- `H-07=BLOCKED`.
- `D17=BLOCKED`.
- `SERVICES_REAL_DOCUMENTS_ENABLED=false`.
- No se inicia B1.1.
- No se implementan migraciones, RLS, buckets, rutas ni UI.
