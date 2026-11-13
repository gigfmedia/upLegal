# Block 1 — Plan de implementación de LegalUp Services

**Estado:** planificación aprobable; **no implementado**.
**Fecha:** 2026-11-12.
**Base:** `docs/services/SPRINT_2_TECHNICAL_DESIGN.md`, `docs/services/SPRINT_2_READINESS_AUDIT.md` y `docs/services/BLOCK_0_SECURITY_AUDIT.md`.
**H-07:** `BLOCKED — no RESOLVED`.
**D17:** `BLOCKED — no aprobado`; es una aprobación independiente de H-07.
**Feature flag:** `SERVICES_REAL_DOCUMENTS_ENABLED=false`; no cambia en este bloque.
**Alcance de este documento:** decisiones técnicas, secuencia, contratos, seguridad y pruebas. No autoriza crear código, migraciones, tablas, buckets, rutas, configuración ni documentos reales.

---

## 1. Objetivo y alcance

### 1.1 Objetivo

Definir el alcance técnico definitivo de Block 1 para implementar el dominio operativo de LegalUp Services: órdenes, asignaciones, cotizaciones, aceptaciones, pagos, documentos, análisis, revisión profesional, entrega, revisiones, eventos y retención.

Block 1 debe construirse de forma que H-07 pueda completarse después mediante la integración y verificación de los controles existentes, sin rehacer rutas ni rediseñar el flujo documental. El cierre de H-07 acredita la integración técnica del gate; la aprobación D17 acredita la preparación operativa para documentos reales y se evalúa por separado.

### 1.2 Entregables de Block 1

1. Migración de datos con tablas, relaciones, índices, funciones, triggers, RLS y grants.
2. Buckets privados y prefijos de cuarentena/clean para documentos contractuales y comprobantes.
3. Endpoints server-side para los flujos aprobados.
4. Integración del `CommercialReadinessGate` en las fronteras documentales.
5. Reutilización del motor IA con persistencia propia y revisión humana obligatoria.
6. Bandeja administrativa mínima y vistas mínimas de empresa/profesional.
7. Notificaciones por correo idempotentes.
8. Pruebas unitarias, de migración, de rutas, de seguridad, de concurrencia y de integración del gate.
9. Evidencia de H-07 únicamente cuando las rutas reales estén implementadas y probadas; esa evidencia no aprueba D17 ni habilita documentos reales.

### 1.3 Principios de diseño

- `service_inquiries` sigue siendo el intake; no se convierte en la orden.
- La empresa es el tenant; el `company_id` nunca se acepta desde el cliente como autoridad.
- Escrituras de base de datos solo server-side con `service_role`; RLS es la segunda barrera.
- El expediente documental y el comprobante de pago son dominios separados.
- Ningún archivo se procesa antes de estar `clean` y `validated`.
- La IA no entrega; el profesional revisa y aprueba.
- El pago lo confirma un admin; el cliente no autodeclara pagos.
- Una sola ronda de revisión incluida; los cambios adicionales son una nueva orden.
- El feature flag no reemplaza ni omite el gate de seguridad.
- Sin documento real, sin evidencia D17 completa, sin gate abierto.

### 1.4 Separación de estados: H-07 y D17

Son dos estados independientes y no se sustituyen entre sí.

| Estado | Qué acredita | Qué no acredita |
|---|---|---|
| **H-07 — Integración del gate** | El gate está integrado en el servidor y en las rutas reales de documentos de Services; pruebas HTTP/de integración demuestran que las rutas protegidas no permiten bypass. | No acredita scanner real, DPA, retención aprobada, worker de purga, probe de producción ni aprobación legal. |
| **D17 — Preparación para documentos reales** | Existe evidencia operativa y documental completa: scanner saludable y firmas vigentes, política de retención aprobada, worker de purga operativo, probe Storage/DB, DPA y aprobación legal/privacidad, entre otros requisitos. | No sustituye la evidencia de integración de rutas ni las pruebas de no-bypass de H-07. |

Reglas:

- H-07 podrá marcarse `RESOLVED` cuando exista la integración y la evidencia de pruebas descrita arriba; **no requiere evidencia operativa D17 de producción**.
- H-07 permanece `BLOCKED` hasta que existan rutas reales y pruebas que acrediten la integración.
- D17 permanece `BLOCKED` hasta cumplir todos sus requisitos operativos y documentales.
- `SERVICES_REAL_DOCUMENTS_ENABLED` no se activa y no se procesan documentos reales mientras D17 no esté aprobado.
- Un estado no puede usarse como evidencia del otro.

---

## 2. Fuera de alcance y restricciones

### 2.1 Fuera de alcance de este plan

- Implementar cualquier cambio de código o infraestructura.
- Crear migraciones, tablas, buckets, rutas, UI, jobs o variables de entorno.
- Modificar `server.mjs`, `eslint.config.js`, `SPRINT_2_TECHNICAL_DESIGN.md` o `SPRINT_2_READINESS_AUDIT.md` durante la implementación, salvo correcciones documentales aprobadas.
- Implementar el worker de purga o fijar plazos de retención.
- Procesar documentos reales o activar `SERVICES_REAL_DOCUMENTS_ENABLED`.
- Cerrar H-07 o declarar D17 aprobado.
- Migrar el bucket histórico `documents` o remediar documentos legacy.
- Añadir mensajería interna, DOCX, múltiples rondas de revisión o entrega automática por IA.
- Repetir o reabrir las auditorías del Bloque 0.2.

### 2.2 Restricciones obligatorias

- `documents` es público y legacy; Services no lo usa, no lo modifica y no llama `getPublicUrl`.
- `company_requests` y `company_request_documents` no se reutilizan.
- No se aceptan `company_id`, `professional_id`, `status`, `amount_clp`, `quote_id`, `payment_id`, `proof_path` ni `role` como autoridad desde el cliente.
- No se guardan URLs firmadas, rutas internas, tokens ni contenido contractual en logs.
- No se crean policies DELETE para clientes.
- No se expone `service_role` al navegador.
- No se inventan evidencias de escáner, DPA, retención, purga o validación legal.

---

## 3. Arquitectura y flujo de extremo a extremo

### 3.1 Componentes

| Componente | Responsabilidad |
|---|---|
| Intake | `service_inquiries`; formulario público existente, sin archivos. |
| Conversión administrativa | Crea/vincula empresa, usuario y orden de forma idempotente. |
| Órdenes | Máquina de estados, SLA, entrega, revisión y retención. |
| Cotizaciones | Versiones inmutables, envío, expiración y aceptación. |
| Aceptaciones | Evidencia inmutable de términos, monto y versiones. |
| Pagos | Intento, comprobante, escaneo, confirmación/rechazo admin. |
| Documentos | Carga, cuarentena, validación, escaneo, publicación y descarga. |
| Análisis | Extracción, proveedor IA, evidencia, versiones y revisión. |
| Entrega | Informe PDF server-side, escaneo, publicación y descarga. |
| Revisiones | Ronda incluida, ventana y derivación a cotización adicional. |
| Eventos | Timeline append-only y filtrado por audiencia. |
| Retención | Metadatos, legal hold y acciones auditables; sin worker en Block 1. |
| Seguridad | Autenticación, autorización, RLS, Storage y gate de readiness. |

### 3.2 Flujo operativo

```text
Inquiry pública
  -> bandeja admin
  -> conversión idempotente a empresa/usuario/orden
  -> cotización versionada y envío
  -> aceptación inmutable por owner/admin de empresa
  -> intento de pago + comprobante en bucket separado
  -> revisión y confirmación admin
  -> carga de documentos contractuales en cuarentena
  -> finalize: tamaño, magic bytes, malware, PDF, hash
  -> clean + validated
  -> análisis IA sobre documentos clean/validated
  -> payload revisado y aprobado por profesional
  -> generación de informe PDF, escaneo y validación
  -> entrega y publicación
  -> ventana de revisión incluida
  -> cierre, retención y eventual purga fuera de Block 1
```

### 3.3 Fronteras de confianza

```text
Navegador
  -> HTTP autenticado
  -> router server-side
  -> autorización de tenant/asignación/admin
  -> validación de estado y relaciones
  -> CommercialReadinessGate (cuando corresponda)
  -> Storage/IA/PDF
  -> base de datos con service_role
```

- El navegador nunca escribe directamente en las tablas del dominio.
- El navegador recibe URLs firmadas de corta duración, nunca rutas internas.
- Un objeto en cuarentena nunca se sirve, aunque exista una URL de subida previa.
- La autorización se recalcula en cada request; no se confía en IDs de la sesión ni en estados enviados por el cliente.
- La creación de la orden y la aceptación se ejecutan en transacciones con locks e índices únicos.

### 3.4 Composición del servidor

En la implementación futura:

- `server.mjs` construye una sola instancia del `MalwareScannerPort` y del `CommercialReadinessGate`.
- El gate se inyecta en el router de Services; no se importa desde el frontend.
- En producción se ejecuta `assertProductionStartupSafe()` antes de aceptar tráfico. En development/test el startup no habilita procesamiento real.
- El gate se evalúa de nuevo en cada operación documental; no se cachea una decisión `allowed` entre requests.
- La integración de H-07 se puede probar con el gate cerrado, adaptadores sintéticos y evidencia de readiness de prueba; no requiere aprobación D17.
- El flag `SERVICES_REAL_DOCUMENTS_ENABLED` solo es una condición adicional; no sustituye evidencia, scanner, retención ni gate.
- El router de Services se monta como módulo, siguiendo el patrón de `server/prospecting/index.mjs`.

---

## 4. Modelo de datos y Storage

### 4.1 Tablas

| Tabla | Propósito | Campos clave e invariantes |
|---|---|---|
| `service_orders` | Orden operativa y estado del servicio. | `inquiry_id` único, `company_id`, `customer_user_id`, `parent_order_id`, `order_kind`, `public_ref` único, categoría, estado, SLA, entrega, ventana de revisión, retención y hold. No contiene asignación, pago ni aceptación duplicados. |
| `service_order_assignments` | Única fuente de asignación profesional. | `order_id`, `professional_id`, `role` (`lead`/`reviewer`), `assigned_by`, `revoked_at`. Un lead activo por orden y una asignación activa por profesional/orden. |
| `service_order_quotes` | Cotizaciones versionadas. | `order_id`, `version`, `amount_clp`, `scope`, `terms_version`, `status`, `sent_at`, `expires_at`. Una cotización `sent` activa y una `accepted` por orden. |
| `service_order_acceptances` | Evidencia inmutable de aceptación. | `order_id` y `quote_id` únicos; snapshot de versión, monto, moneda, usuario, términos, privacidad, IA y hash. Sin UPDATE/DELETE. |
| `service_order_payments` | Intento y estado del pago, incluido el comprobante. | `order_id`, `quote_id`, monto/moneda, estado, método, `proof_*`, `confirmed_by`, rechazo. Un intento abierto y un pago confirmado por orden. |
| `service_order_documents` | Documentos contractuales. | `document_kind` (`input`/`annex`/`deliverable`), bucket siempre `service-documents`, ruta server-side, PDF, tamaño y SHA-256 completados en `finalize`, validación, escaneo, publicación y purga. |
| `service_order_analyses` | Análisis IA versionado. | `document_id`, `analysis_version`, `is_current`, estado, proveedor/modelo/prompt/schema, resultado, evidencia, payload revisado y revisión. Un current y una ejecución activa por documento. |
| `service_order_revisions` | Ronda de revisión incluida. | `round_number`, estado, solicitante, ventana snapshot, motivo y decisión. Una revisión activa por orden. |
| `service_order_events` | Auditoría append-only. | Tipo, estados, audiencia, actor, metadata sanitizada, hashes de IP/user-agent. Sin UPDATE/DELETE. |
| `service_order_retention_actions` | Acciones de retención/hold/purga. | Acción, snapshots de retención, hold, motivo, actor, documento/pago opcional. Append-only. |

No se crea `service_order_messages` en v1.

### 4.2 Relaciones e invariantes

- `service_orders.inquiry_id` es único para la orden inicial; las órdenes `additional_changes` usan `parent_order_id` y no reutilizan `inquiry_id`.
- `service_orders` no duplica `assigned_professional_id`, `payment_status`, `accepted_at` ni contadores de revisión.
- `service_order_acceptances` referencia la cotización aceptada y conserva el snapshot comercial.
- `service_order_payments.quote_id`, monto y moneda deben coincidir con la aceptación; el trigger y el endpoint lo validan.
- `service_order_documents.document_kind='deliverable'` solo lo crea el servidor al generar el informe.
- `documents/upload-url` crea la fila `pending` con `storage_path` server-side y `size_bytes`/`sha256` nulos; `finalize` completa ambos y solo entonces puede marcarse `validated`.
- Un documento contractual solo puede analizarse si está `clean` y `validated`.
- Un `deliverable` solo se publica al entregar; un informe validado pero no entregado no es visible al cliente.
- Los eventos y las acciones de retención son append-only incluso para `service_role`, salvo la función auditada de purga fuera de Block 1.
- Los usuarios con historial de auditoría no se borran en cascada; se desactivan.

### 4.3 Storage

| Bucket | Contenido | Formatos | Límite | Política |
|---|---|---|---|---|
| `service-documents` | Documentos contractuales `input`/`annex`/`deliverable`. | Solo PDF. | 20 MB. | Privado; sin policies para `anon`/`authenticated`; solo `service_role`; URLs firmadas de 300 s. |
| `service-payment-proofs` | Comprobantes de pago. | PDF, PNG, JPEG. | 10 MB (10,485,760 bytes), límite normativo de v1; 20 MB fuera de alcance. | Privado; solo `service_role`; URLs firmadas de 300 s; nunca se analiza con IA. |

Prefijos:

```text
quarantine/{company_id}/{order_id}/documents/{document_id}/
clean/{company_id}/{order_id}/documents/{document_id}/
quarantine/{company_id}/{order_id}/payments/{payment_id}/
clean/{company_id}/{order_id}/payments/{payment_id}/
```

Reglas:

- La ruta se genera server-side; nunca se acepta desde el cliente.
- No se usa `getPublicUrl`.
- No se guarda una URL firmada en base de datos ni en logs.
- Un archivo en cuarentena no se sirve ni se analiza.
- Al promoverse, el objeto se mueve/copia a `clean/` y se actualiza la fila en la misma operación lógica.
- El bucket legacy `documents` no se toca.
- D-05 resuelta: 10 MB (10,485,760 bytes) es el límite máximo normativo de v1 para comprobantes; 20 MB queda fuera del alcance de v1. Una ampliación futura requiere una nueva decisión documentada y evidencia técnica suficiente.

### 4.4 Migración y pruebas de esquema

- Una migración nueva contiene tablas, funciones, índices, triggers, RLS, grants y comentarios. Se revisa contra convenciones del repositorio antes de crearla.
- Una migración separada o la misma migración controlada crea los buckets privados y sus policies de Storage.
- Las pruebas de migración usan PGlite, como `server/services/inquiries.migration.test.mjs`, y validan RLS, triggers, constraints, índices únicos y ausencia de policies DELETE.
- No se implementa la migración en este plan.

---

## 5. Estados y transiciones

### 5.1 Orden

| Transición | Actor | Condición mínima |
|---|---|---|
| `created`/`awaiting_quote` -> `quote_sent` | Admin | Cotización enviada, vigente y única `sent`. |
| `quote_sent` -> `awaiting_payment` | Owner/admin empresa | Aceptación inmutable insertada; cotización `accepted`; intento de pago `pending`. `accepted` puede persistirse transitoriamente dentro de la transacción y se avanza a `awaiting_payment`; no es terminal. |
| `awaiting_payment` -> `awaiting_documents` | Admin | Pago confirmado, comprobante `clean`/`validated` y monto igual a la aceptación. |
| `awaiting_documents` -> `in_analysis` | Profesional/admin | Primer análisis permitido sobre documento `input`/`annex` clean/validated. |
| `in_analysis` -> `in_review` | Profesional/admin | Análisis completado y revisión iniciada. |
| `in_review` -> `ready_for_delivery` | Profesional/admin | Informe generado o en preparación; no se publica todavía. |
| `ready_for_delivery` -> `delivered` | Profesional/admin | `deliverable` clean/validated, `published_at` y `delivered_at` consistentes, ventana fijada. |
| `delivered` -> `revision_requested` | Owner/admin empresa | Dentro de `revision_window_ends_at`, ronda disponible y sin revisión activa. |
| `revision_requested` -> `in_review` | Profesional/admin | Revisión tomada; no reinicia la ventana. |
| `in_review` -> `ready_for_delivery`/`delivered` | Profesional/admin | Reentrega validada; nueva fecha de entrega, ventana original conservada salvo decisión auditada. |
| `quote_sent` -> `expired` | Job/aceptación | Cotización vencida; job idempotente o rechazo en aceptación. |
| `revision_requested`/`delivered` -> `additional_quote_required` | Owner/admin o sistema | Ronda agotada o ventana vencida; se deriva a nueva orden. |
| Cualquier estado no terminal -> `cancelled` | Admin | Motivo, sin pagos abiertos ni revisiones activas; auditoría. |
| Cualquier estado terminal -> `closed` | Admin/sistema | Cierre permitido, timestamps completos y sin trabajo activo. |

Reglas:

- Todo cambio genera `service_order_events`.
- Las transiciones críticas se validan en endpoint y en trigger `before update of status`.
- No se acepta una cotización vencida aunque el job aún no haya corrido.
- No se habilita la carga documental sin pago confirmado.
- No se entrega sin informe validado y aprobado.
- No se entrega dos veces por la misma revisión.
- No se cancela con pagos o revisiones activas.

### 5.2 Cotización

Estados: `draft`, `sent`, `accepted`, `rejected`, `expired`, `superseded`.

- `draft` es editable.
- `sent` no se edita en monto, alcance, versión, términos ni expiración; se crea otra versión y la anterior pasa a `superseded`.
- `accepted` es inmutable y no se reutiliza.
- Una sola `sent` activa y una sola `accepted` por orden.

### 5.3 Pago

Estados: `pending`, `proof_submitted`, `confirmed`, `rejected`.

- `pending` -> `proof_submitted`: finalize válido, comprobante clean/validated.
- `pending` -> `rejected`: fallo automático o intento no finalizado.
- `proof_submitted` -> `confirmed`: admin, monto correcto, lock y comprobante válido.
- `proof_submitted` -> `rejected`: admin con motivo.
- `confirmed` y `rejected` son terminales.
- Un fallo de escáner/validación del comprobante rechaza el intento y elimina el objeto no validado; permite crear uno nuevo.
- Un rechazo manual de un comprobante clean/validado conserva el objeto hasta la retención.

### 5.4 Documento contractual

Estados de escaneo: `pending`, `scanning`, `clean`, `infected`, `failed`, `unavailable`.

Estados de validación: `pending`, `quarantined`, `validated`, `rejected`.

- `pending`/`quarantined`/`unavailable`/`failed` pueden reintentar `finalize` sobre la misma fila.
- `infected` se marca `rejected`, se elimina de Storage y sigue el procedimiento de incidentes.
- `rejected` por validación exige subir un documento nuevo.
- Solo `clean` + `validated` habilita análisis y descarga profesional.
- Un `deliverable` solo se publica al entregar.

### 5.5 Análisis y revisión

Estados de análisis: `queued`, `processing`, `completed`, `failed`, `superseded`.

Estados de revisión: `pending`, `in_review`, `approved`.

- Solo un análisis `current` y uno en ejecución por documento.
- Un reintento crea nueva versión y supersede la anterior.
- Solo se aprueba un análisis `is_current`.
- La entrega usa exclusivamente los `reviewed_payload` de análisis current aprobados.

### 5.6 Revisión de la orden

Estados: `requested`, `in_review`, `completed`, `declined`.

- Una revisión activa por orden.
- Solo owner/admin de empresa solicita.
- Fuera de ventana o sin ronda: se registra `declined` y se deriva a cotización adicional.
- Una segunda solicitud no se ejecuta.

---

## 6. API y responsabilidades

### 6.1 Endpoints

Todos requieren autenticación salvo el intake público.

| Método | Ruta | Actor | Función |
|---|---|---|---|
| POST | `/api/services/inquiries` | Público | Intake existente, rate limit e idempotencia. |
| GET | `/api/services/admin/inquiries` | Admin | Bandeja de intake. |
| POST | `/api/services/admin/inquiries/:id/convert` | Admin | Conversión idempotente a empresa/usuario/orden. |
| GET | `/api/services/admin/orders` | Admin | Bandeja de órdenes. |
| GET | `/api/services/orders` | Empresa/asignado/admin | Lista paginada con proyección por rol. |
| GET | `/api/services/orders/:id` | Empresa/asignado/admin | Ficha de orden sin datos financieros para profesional. |
| POST | `/api/services/orders/:id/quotes` | Admin | Crea versión de cotización. |
| POST | `/api/services/orders/:id/quotes/:quoteId/send` | Admin | Envía, fija expiración y notifica. |
| POST | `/api/services/orders/:id/quotes/:quoteId/accept` | Owner/admin empresa | Aceptación inmutable y creación del intento de pago. |
| GET | `/api/services/orders/:id/quotes/:quoteId` | Owner/admin empresa o admin | Detalle comercial; no profesional. |
| GET | `/api/services/orders/:id/acceptance` | Owner/admin empresa o admin | Evidencia de aceptación. |
| GET | `/api/services/orders/:id/payments` | Owner/admin empresa o admin | Intentos y estado; sin URL. |
| POST | `/api/services/orders/:id/payments` | Owner/admin empresa o admin | Nuevo intento tras rechazo. |
| POST | `/api/services/orders/:id/payments/:paymentId/proof/upload-url` | Owner/admin empresa | Signed upload URL del comprobante. |
| POST | `/api/services/orders/:id/payments/:paymentId/proof/finalize` | Owner/admin empresa | Valida, escanea y marca `proof_submitted`; sin IA. |
| POST | `/api/services/admin/orders/:id/payments/:paymentId/confirm` | Admin | Confirma pago y mueve a `awaiting_documents`. |
| POST | `/api/services/admin/orders/:id/payments/:paymentId/reject` | Admin | Rechaza con motivo; la orden sigue en `awaiting_payment`. |
| POST | `/api/services/orders/:id/documents/upload-url` | Owner/admin/member | Registro pending + signed upload URL en cuarentena. |
| POST | `/api/services/orders/:id/documents/:docId/finalize` | Owner/admin/member | Escanea, valida y promueve si corresponde. |
| GET | `/api/services/orders/:id/documents` | Empresa/asignado/admin | Metadatos con proyección segura; sin rutas ni URLs. |
| GET | `/api/services/orders/:id/documents/:docId/url` | Según visibilidad | URL firmada de 300 s solo para objeto autorizado y clean. |
| GET | `/api/services/orders/:id/payments/:paymentId/proof/url` | Owner/admin empresa o admin | URL firmada del comprobante clean/validated. |
| POST | `/api/services/orders/:id/analysis` | Profesional asignado/admin | Crea/versiona análisis de documento clean/validated. |
| GET | `/api/services/orders/:id/analysis/:analysisId` | Profesional asignado/admin | Análisis, evidencia y revisión. |
| PATCH | `/api/services/orders/:id/analysis/:analysisId/review` | Profesional asignado/admin | Guarda payload revisado. |
| POST | `/api/services/orders/:id/analysis/:analysisId/approve` | Profesional asignado/admin | Aprueba análisis current. |
| POST | `/api/services/orders/:id/deliverables` | Profesional/admin | Genera PDF, escanea, valida y entrega si corresponde. |
| POST | `/api/services/orders/:id/revisions` | Owner/admin empresa | Solicita la ronda incluida. |
| PATCH | `/api/services/orders/:id/revisions/:revisionId` | Profesional asignado/admin | Toma o completa la revisión. |
| GET | `/api/services/orders/:id/events` | Empresa/asignado/admin | Timeline filtrado por audiencia. |
| POST | `/api/services/orders/:id/transition` | Admin/servicio | Transición validada. |
| POST | `/api/services/admin/orders/:id/assignments` | Admin | Crea/revoca asignación en transacción. |
| POST | `/api/services/admin/orders/:id/retention` | Admin | Fija retención, hold o solicita purga; sin worker en Block 1. |
| GET | `/api/services/admin/orders/:id/retention` | Admin | Estado y acciones auditadas. |
| GET | `/api/services/admin/quarantine` | Admin | Documentos/comprobantes en cuarentena o fallidos. |
| POST | `/api/services/admin/orders/:id/quarantine/:docId/retry` | Admin | Reintenta escaneo/validación. |

No se agregan rutas de mensajería, documentos legacy ni descargas públicas.

### 6.2 Conversión de inquiry

La conversión debe ser idempotente y server-side:

1. Bloquear/leer la inquiry y verificar que no esté convertida.
2. Resolver el usuario por email normalizado usando el mecanismo admin existente; si no existe, crear/invitar mediante el flujo aprobado.
3. Resolver la empresa por ID seleccionado por el admin o crear la empresa mediante un flujo server-side aprobado.
4. Crear la membresía owner/admin correspondiente.
5. Crear la orden con `inquiry_id`, empresa y usuario; marcar la inquiry como convertida.
6. Registrar evento y notificar por correo.

No se reutiliza `registerCompany()` del cliente, porque escribe directo a `companies`. La creación server-side de empresa/usuario debe quedar aprobada antes de implementar la conversión; si no existe un flujo aprobado, la conversión queda bloqueada.

### 6.3 Reglas transversales

- `Idempotency-Key` en todas las mutaciones de negocio.
- Rate limit por usuario/IP.
- Validación de body, Content-Type y tamaño.
- Toda ruta anidada verifica que `quoteId`, `paymentId`, `docId`, `analysisId` y `revisionId` pertenezcan a la orden y empresa.
- Errores sin rutas, tokens, firmas ni contenido.
- Logs con `request_id`, `order_id`, `payment_id`, `event_id`; sin PII ni URLs firmadas.
- Paginación en bandejas.
- Notificaciones por correo idempotentes; no hay mensajería interna.
- No se acepta estado, monto, rol ni IDs de autoridad desde el cliente.

### 6.4 Errores

| Situación | Respuesta |
|---|---|
| Gate cerrado | `503` con `code: SERVICES_NOT_READY_FOR_REAL_DOCUMENTS`; sin razones internas. |
| Sin autenticación | `401`. |
| Sin permiso/tenant/asignación | `403`/`404` según no filtrar existencia. |
| Estado no permitido | `409`. |
| Validación de entrada | `400`/`422`. |
| MIME/tamaño | `415`/`413`. |
| Conflicto de idempotencia | `200` replay seguro o `409` según operación. |

El detalle de razones D17 se registra internamente de forma sanitizada; no se expone al cliente.

---

## 7. Autorización, multitenancy y RLS

### 7.1 Actores

| Actor | Acceso |
|---|---|
| Visitante | Crear inquiry; nada más. |
| Empresa owner/admin | Leer órdenes, aceptar cotización, subir/ver comprobante, cargar documentos, descargar informe final y solicitar revisión. |
| Empresa member | Leer órdenes y cargar documentos; no acepta, no paga, no ve comprobantes, no solicita revisión. |
| Empresa viewer | Leer estado y descargar informe final publicado/entregado; no escribe. |
| Profesional asignado | Leer orden, asignación, metadatos y documentos contractuales clean; ejecutar análisis, revisar, aprobar y entregar. No ve pagos, comprobantes ni precios. |
| Admin plataforma | Conversión, cotización, pagos, asignación, cuarentena, retención y auditoría. |
| `anon` | Sin acceso a tablas del dominio ni Storage. |

### 7.2 Orden de controles server-side

1. Autenticación.
2. Tenant de empresa o admin.
3. Asignación profesional activa, si aplica.
4. Estado de orden, cotización, pago, documento o revisión.
5. Gate D17, si la operación recibe o procesa contenido.
6. Validación documental.
7. Idempotencia.
8. Rate limit.
9. Evento de auditoría.

La autorización se evalúa contra la base, no contra el body. El tenant se deriva de la orden, no del request.

### 7.3 RLS

- `REVOKE INSERT, UPDATE, DELETE` de `anon`/`authenticated` en todas las tablas del dominio.
- `GRANT SELECT` solo sobre columnas seguras o vistas/proyecciones; nunca `SELECT *`.
- Writes solo con `service_role` desde endpoints.
- Policies SELECT por empresa, asignación activa o admin.
- Sin policies DELETE; la purga es server-side y auditada.
- `security_company_access` incluye member; para aceptar/pagar/comprobantes se exige `security_company_role(company_id) in ('owner','admin')`.
- La asignación se encapsula en `security_service_order_assigned(order_id)` con `security definer` y `set search_path`, para evitar recursión.
- `security_platform_admin()` es la única autoridad admin; no `profiles.role`, `user_metadata` ni email.

### 7.4 Proyecciones y columnas no expuestas

Nunca se envían al cliente:

- `storage_path`, `proof_path`, `sha256`, `proof_sha256`.
- `scan_provider`, `scan_result`, `proof_scan_result`, `validation_error`.
- `amount_clp`, `quote_id` a profesional.
- `legal_hold`, `retention_until`, `purge_started_at`, `purged_at`.
- `customer_user_id`, `created_by`.
- Hashes de aceptación/IP/user-agent.
- Metadata de eventos con datos financieros o rutas.

### 7.5 Storage y URLs

- Sin policies de Storage para `anon`/`authenticated`; solo `service_role`.
- URL firmada de 300 s emitida por endpoint, después de autorización y validación de estado.
- `Content-Disposition: attachment` y `X-Content-Type-Options: nosniff` si se sirve por proxy.
- No se sirve cuarentena, `infected`, `unavailable`, `failed`, `rejected`, borrado lógico o purgado.
- El cliente solo recibe `deliverable` publicado y entregado.
- El profesional solo recibe documentos contractuales clean, nunca comprobantes.
- Owner/admin de empresa y admin reciben comprobantes clean/validated, nunca member/viewer/profesional.

---

## 8. Integración del `CommercialReadinessGate`

### 8.1 Contrato

- Código de error: `SERVICES_NOT_READY_FOR_REAL_DOCUMENTS`.
- Excepción: `CommercialReadinessError` con `statusCode=503`.
- Funciones: `createCommercialReadinessGate`, `evaluate`, `assertReadyForRealDocuments`, `assertProductionStartupSafe`, `scanDocument`.
- El gate se construye con scanner, política de retención, evidencia DPA/legal, evidencia de purga e infraestructura.
- `scanDocument` exige un scanner de producción confiable y un gate listo.
- En entornos no-production el gate permanece cerrado; no se debe crear un bypass para development.
- H-07 acredita la integración y el comportamiento fail-closed del gate; D17 acredita la evidencia operativa exigida por el gate. No se confunden.

### 8.2 Dónde se revalida

| Operación | Gate D17 | Motivo |
|---|---|---|
| Arranque del servidor | Sí, `assertProductionStartupSafe` | Fail-closed en producción si el flag está activo y falta evidencia. |
| `documents/upload-url` | Sí | Recibe contenido real y emite URL de subida. |
| `documents/:docId/finalize` | Sí | Descarga, valida, escanea y promueve contenido. |
| Registro/confirmación del documento | Sí, en `finalize` | No hay endpoint separado; la fila nace en upload-url y se confirma en finalize. |
| `analysis` | Sí | Envía contenido a IA. |
| `deliverables` | Sí | Genera, escanea y publica un PDF derivado. |
| `proof/upload-url` | Sí | Recibe un comprobante real. |
| `proof/finalize` | Sí | Descarga, valida y escanea el comprobante. |
| `quarantine/retry` | Sí | Vuelve a escanear/procesar. |
| Cualquier nuevo endpoint que reciba, descargue para procesar o procese archivos | Sí, por defecto | No se permite una ruta de ingreso/procesamiento sin gate. |
| `documents` list/metadata | No | No recupera contenido; solo ACL y proyección. |
| `documents/:docId/url` de un objeto clean/validado | No D17 | La lectura se controla por autenticación, tenant, asignación, estado, publicación, retención y purga. |
| `proof/url` de un comprobante clean/validated | No D17 | Igual que el caso anterior; solo owner/admin de empresa o admin. |
| Confirmar/rechazar pago | No D17 | Es una decisión financiera, no procesamiento documental. No habilita documentos por sí misma; upload-url sigue protegido. |
| Asignaciones, eventos, retención metadata | No D17 | No reciben ni procesan archivos. |

#### 8.2.1 Operaciones que requieren D17

Deben fallar de forma segura cuando el gate no esté aprobado:

- Upload de documentos.
- Finalización de upload.
- Escaneo antimalware.
- Promoción de cuarentena a almacenamiento validado.
- Análisis de documentos mediante IA.
- Generación y publicación de entregables derivados de documentos.
- Upload y finalización de comprobantes de pago.
- Reintentos de procesamiento desde cuarentena.

#### 8.2.2 Política formal de lectura y descarga

La lectura o descarga de documentos ya `clean`/`validated` **no requiere D17 en cada lectura**. Depende obligatoriamente de:

1. Autenticación.
2. Autorización y control de acceso por tenant.
3. Validación de pertenencia a la orden o asignación activa al caso.
4. Estado válido del documento.
5. Condición de publicación, cuando corresponda.
6. Política de retención vigente.
7. Prohibición absoluta de acceder a objetos en cuarentena o no validados.

Reglas adicionales:

- Las URLs firmadas son temporales y respetan el límite de 300 segundos.
- No existe una excepción que permita leer documentos de otros tenants, órdenes o asignaciones.
- Una lectura autorizada no puede promover, escanear, analizar ni modificar el documento.
- La lectura de cuarentena, `infected`, `unavailable`, `failed`, `rejected`, borrado lógico o purgado se rechaza siempre.
- La caída del scanner no impide descargar un objeto ya validado y autorizado, pero no habilita procesamiento nuevo.

#### 8.2.3 Kill switch de lectura

Se documenta un posible kill switch independiente para suspender lecturas/descargas, separado de D17. No se implementa en Block 1, no es requisito para iniciar B1.0 y queda como decisión operativa independiente pendiente de aprobación. No puede usarse para relajar tenant, asignación, publicación, retención ni cuarentena.

### 8.3 Secuencia de una operación protegida

```text
request
  -> autenticación
  -> autorización de tenant/asignación/admin
  -> validación de orden, estado y relaciones
  -> validación de reglas comerciales (pago, aceptación, revisión)
  -> assertReadyForRealDocuments()
  -> validación documental / scanner
  -> efecto de negocio
  -> evento
```

Si el gate falla:

- No se crea fila documental nueva.
- No se emite URL firmada.
- No se descarga el objeto para procesamiento.
- No se ejecuta parser ni IA.
- No se marca `clean`/`validated`.
- Se responde `503` sanitizado.
- El objeto previamente subido a cuarentena permanece allí y se reconcilia/reintenta o se purga según retención.

Si el gate se cierra entre `upload-url` y `finalize`, `finalize` vuelve a evaluar y falla de forma independiente. Una URL de subida emitida antes no permite promover el documento.

Secuencia de lectura de un objeto ya validado:

```text
request
  -> autenticación
  -> autorización de tenant y pertenencia/asignación
  -> estado clean/validated y condición de publicación
  -> retención vigente y no purgado
  -> URL firmada de 300 s
```

Esta secuencia no ejecuta `assertReadyForRealDocuments`, no llama al scanner y no procesa el archivo.

### 8.4 Arranque y flag

- `assertProductionStartupSafe()` se ejecuta en el arranque del servidor.
- En producción, si `SERVICES_REAL_DOCUMENTS_ENABLED=true` y D17 no está aprobado, el proceso no debe aceptar tráfico documental.
- Si el flag está en `false`, el gate permanece cerrado y las operaciones documentales responden `503`.
- `SERVICES_REAL_DOCUMENTS_ENABLED=true` sin evidencia D17 no habilita nada.
- El flag no se consulta en el frontend como autorización.
- No se crea un flag de bypass ni una ruta de development que procese documentos reales.
- H-07 puede acreditarse con el gate cerrado y con pruebas de `503`/no-bypass; no requiere que D17 esté aprobado.
- D17 no se aprueba como consecuencia de integrar el gate ni de cerrar H-07.

### 8.5 Estrategia de pruebas sin bypass

El gate real rechaza entornos no-production. Por eso:

- Las pruebas de integración construyen una instancia real del gate con `environment: 'production'`, `realDocumentsEnabled: true`, fixtures sintéticos de readiness, repositorio de evidencia confiable y un scanner de producción de prueba construido por fábrica confiable.
- Esos fixtures no son evidencia D17 real, no aprueban D17 y no autorizan producción.
- No se modifica el código de producción para permitir development.
- No se usa `MockMalwareScanner` en la app como bypass; el mock solo se usa en pruebas unitarias del propio scanner.
- Las pruebas modifican una sola condición D17 a la vez y verifican `503` y ausencia de efectos.
- El "happy path" de documentos solo se prueba en la suite, con archivos sintéticos y adaptadores de prueba; nunca en un entorno con documentos reales.

### 8.6 Logs y respuesta

- Log interno: `operation`, `order_id`, `document_id`/`payment_id`, `request_id`, códigos de razón D17 sanitizados.
- Nunca: contenido, nombre de archivo, ruta, URL firmada, firma de malware, tokens.
- Respuesta pública: mensaje genérico, código `SERVICES_NOT_READY_FOR_REAL_DOCUMENTS`, sin detalle de evidencia ni de configuración.

---

## 9. Matriz de operaciones documentales, validaciones y pruebas

### 9.1 Operaciones de ingreso/procesamiento

| ID | Operación | Autorización y estado | Gate | Validación documental | Pruebas obligatorias |
|---|---|---|---|---|---|
| OP-01 | `documents/upload-url` | Owner/admin/member; orden `awaiting_documents`/`in_analysis`/`in_review`; pago confirmado; kind `input`/`annex`. | Sí, antes de crear fila y firmar. | PDF declarado, 20 MB, ruta server-side, cuarentena. | Gate cerrado: 503, sin fila, sin URL. Cross-tenant. Viewer/profesional denegados. `deliverable` rechazado. Estado inválido: 409. |
| OP-02 | `documents/:docId/finalize` | Owner/admin/member; doc de la orden; `pending`/`quarantined`/`unavailable`/`failed`. | Sí, antes de descargar/escanear. | Tamaño real, magic `%PDF-`, malware, PDF válido, sin contraseña, texto, <=200 páginas, SHA-256 único. | Gate cerrado: no promueve. EICAR: rechazado. Magic spoof: rechazado. 20 MB aceptado/21 MB rechazado. PDF cifrado/sin texto/corrupto. Duplicado. Reintento idempotente. |
| OP-03 | Registro/confirmación del documento | Sin endpoint separado; fila en upload-url, confirmación en finalize. | Sí, en ambos hitos. | Trigger impide insertar `validated`/publicado directamente. | No se puede saltar de `pending` a `validated` por SQL/API. No hay ruta alternativa. |
| OP-04 | `analysis` | Profesional asignado/admin; doc `input`/`annex` clean/validated; orden `awaiting_documents`/`in_analysis`/`in_review`. | Sí, antes de enviar contenido al proveedor. | Solo clean/validated; no deliverable; no cuarentena. | Gate cerrado: 503 y provider no invocado. Cuarentena/deliverable: 409/422. Cross-tenant/no asignado: 403/404. Dos análisis concurrentes: uno falla. |
| OP-05 | `deliverables` | Profesional/admin; análisis current aprobados. | Sí, antes de generar y escanear. | PDF server-side, escaneo, validación, `published_at=delivered_at`. | Gate cerrado: no genera. Scanner unavailable: `ready_for_delivery`, no publica. Clean: entrega/publica. Reintento idempotente. |
| OP-06 | `proof/upload-url` | Owner/admin empresa; pago `pending`; monto igual a aceptación. | Sí, antes de crear/firmar. | Bucket `service-payment-proofs`, PDF/PNG/JPEG, 10 MB (10,485,760 bytes), límite definitivo v1, ruta server-side. | Gate cerrado: 503 sin URL. Member/viewer/profesional denegados. Pago ajeno/orden ajena: 404. Intento no abierto: 409. >10 MB: rechazo. |
| OP-07 | `proof/finalize` | Owner/admin empresa; pago `pending`; ruta de cuarentena del intento. | Sí, antes de descargar/escanear. | Magic PDF/PNG/JPEG, 10 MB (10,485,760 bytes), límite definitivo v1, malware; sin parser/IA. | Gate cerrado: no promueve. EICAR/MIME spoof: rechazo. 10 MB aceptado; >10 MB rechazado. Scanner unavailable: intento rechazado, objeto eliminado. Replay idempotente. |
| OP-08 | `quarantine/retry` | Admin; doc en cuarentena/fallo. | Sí, antes de reescanear. | Reintento del mismo documento; no promueve sin clean. | Gate cerrado: 503. Clean: validated. Infeccioso: rechazo/eliminación. Evento auditado. |
| OP-09 | Cualquier nueva ruta documental | Debe declararse en esta matriz antes de merge. | Sí, por defecto. | La misma que corresponda. | Test de "ruta nueva sin gate" debe fallar en revisión. |

### 9.2 Operaciones de lectura/administración

| ID | Operación | Autorización y estado | Gate | Control específico | Pruebas obligatorias |
|---|---|---|---|---|---|
| OP-10 | `documents/:docId/url` | Cliente: solo `deliverable` publicado/entregado. Profesional: solo asignado y documento contractual clean. Admin: todo lo autorizado. | No D17. | ACL, `clean`, `validated`, no borrado/purgado; URL 300 s; entrega publicada. | Cross-tenant, cuarentena, no publicado, profesional no asignado, member/viewer. URL no se guarda en logs. No `getPublicUrl`. |
| OP-11 | `proof/url` | Owner/admin empresa o admin; comprobante clean/validated y no purgado. | No D17. | URL 300 s; nunca member/viewer/profesional. | Cross-tenant, no owner, no clean, purgado. No URL en logs. |
| OP-12 | `documents` list/metadata | Empresa/asignado/admin según proyección. | No. | Sin `storage_path`, hashes, scan provider, errores internos. | Proyección exacta; profesional no ve pagos; cliente no ve insumos. |
| OP-13 | Eventos/auditoría | Por audiencia; admin todo. | No. | Append-only; metadata sanitizada. | UPDATE/DELETE falla. Cliente no ve admin/internal. |
| OP-14 | Retención/hold | Solo admin. | No. | Acción append-only; sin worker de purga en Block 1. | Cliente/profesional sin acceso. Hold bloquea purga futura. |
| OP-15 | Confirmar/rechazar pago | Solo admin. | No. | Monto, comprobante, lock, unicidad. | No habilita documentos por sí solo; upload-url sigue 503 si gate cerrado. Doble confirmación imposible. |
| OP-16 | Asignaciones | Solo admin. | No. | Revocación + nueva asignación en transacción. | Profesional no asignado no accede. Una asignación activa por orden/profesional. |
| OP-17 | Arranque | Producción. | `assertProductionStartupSafe`. | Flag + evidencia. | Producción sin evidencia y flag true: aborta. Flag false: gate cerrado. Development: sin bypass. |
| OP-18 | URL firmada emitida antes de una caída | Cualquier operación previa. | Revalidación en finalize/análisis. | La URL no autoriza promoción. | Gate cierra entre upload y finalize: 503 y no se promueve. |
| OP-19 | Feature flag mal configurado | Operación documental. | Sí. | Flag no sustituye gate. | Flag true sin evidencia: 503. Flag false: 503. |

### 9.3 Evidencia que debe producir la suite

- Cada fila con gate `Sí` tiene al menos una prueba negativa de gate cerrado; toda fila OP-01 a OP-19 tiene al menos una prueba de autorización.
- Toda operación que emite URL firmada tiene una prueba que verifica que no se emitió si falla el gate o la ACL.
- Toda operación que procesa contenido tiene una prueba que verifica que el parser/proveedor no fue invocado si el gate está cerrado.
- Toda lectura tiene una prueba de cross-tenant, cuarentena y objeto no publicado.
- La matriz se actualiza antes de agregar una ruta nueva; una ruta sin fila y sin pruebas no se acepta.

---

## 10. Estrategia de pruebas

### 10.1 Capas

| Capa | Herramienta | Cobertura |
|---|---|---|
| Unitaria | Vitest | Estados, validaciones, schemas, permisos, errores, helpers de gate, sanitización. |
| Migración/RLS | Vitest + PGlite | Tablas, constraints, triggers, índices, RLS, inmutabilidad, cross-tenant. |
| Rutas | Express de prueba + `fetch`/HTTP | Contratos reales, auth, estados, idempotencia, rate limit, respuestas 503/403/409. |
| Gate de integración | `createCommercialReadinessGate` real en configuración de prueba | Cada frontera de ingreso/procesamiento, sin bypass, sin efectos cuando falla. |
| Storage | Adaptador falso | Signed URLs, cuarentena/clean, no `getPublicUrl`, no logs de URL. |
| PDF/documentos | Fixtures sintéticos | Magic bytes, tamaño, cifrado, sin texto, páginas, hash, malware EICAR. |
| Concurrencia | PGlite/transacciones | Aceptación única, pago único, análisis único, revisión única. |

### 10.2 Configuración del gate en pruebas

La suite debe poder construir:

```text
createCommercialReadinessGate({
  environment: 'production',
  realDocumentsEnabled: true,
  scanner: <scanner de producción de prueba construido por fábrica confiable>,
  retentionParameters: <parámetros de prueba>,
  retentionConfig: <evidencia válida>,
  evidenceRepository: createReadinessEvidenceRepository(<fixture>),
  aiProvider: <proveedor de prueba>,
})
```

No se debe cambiar `NODE_ENV` de la app ni agregar una rama de código que permita development. Las pruebas modifican un fixture sintético de readiness para simular scanner unhealthy, retención faltante, DPA vencido, purga stale, infraestructura fallida o flag desactivado. Ese fixture no es evidencia D17 ni cierra D17.

### 10.3 Casos mínimos

- Gate cerrado por cada razón D17 en OP-01, OP-02, OP-04, OP-05, OP-06, OP-07 y OP-08.
- Gate cerrado no crea filas, no firma URLs de procesamiento, no descarga para procesar y no llama parser/IA.
- Gate abierto con evidencia completa permite el happy path sintético.
- `SERVICES_REAL_DOCUMENTS_ENABLED=true` sin evidencia: 503.
- `SERVICES_REAL_DOCUMENTS_ENABLED=false`: 503.
- Scanner `unavailable` en documento contractual: cuarentena, sin análisis; en comprobante: intento rechazado.
- Malware EICAR: rechazo, eliminación, evento sanitizado.
- PDF falso, cifrado, sin texto, corrupto, >200 páginas, >20 MB: rechazo.
- Comprobante >10 MB (10,485,760 bytes): rechazo; 20 MB queda fuera del alcance de v1 y no se prueba como límite.
- Cross-tenant en cada endpoint.
- Profesional no asignado; profesional no ve pagos.
- Member no acepta, no paga, no ve comprobantes.
- Viewer no escribe.
- Aceptación concurrente: una sola fila.
- Pago confirmado concurrente: uno solo.
- Análisis concurrente: uno en ejecución.
- Revisión concurrente: una activa.
- Eventos/retención/aceptaciones inmutables.
- Sin policies DELETE.
- No `getPublicUrl`; no URLs en logs.
- Logs sin contenido, rutas, tokens ni PII.
- Idempotencia de conversion, quotes, payments, proof, documents, analysis, deliverables.
- Expiración de cotización y aceptación vencida.
- Delivery/publication: cliente no ve borradores; solo informe final publicado/entregado.

### 10.4 Evidencia de H-07 (independiente de D17)

H-07 no se cierra con pruebas unitarias aisladas del gate. Podrá marcarse `RESOLVED` cuando:

1. El gate esté integrado en el servidor y en las rutas reales de documentos de Services implementadas en B1.4.
2. La aserción de arranque esté integrada en el servidor real.
3. Las pruebas HTTP/de integración demuestren `503` cuando el gate está cerrado.
4. Las pruebas demuestren que no existe una ruta alternativa ni bypass.
5. Las rutas cubiertas por H-07 tengan autorización, tenant, estado y gate revalidados.
6. La evidencia se haya producido contra rutas reales, no solo contra funciones aisladas.

H-07 **no exige evidencia operativa D17 de producción**. Puede cerrarse con `D17=BLOCKED`, gate cerrado y adaptadores/fixtures sintéticos de prueba. Hasta que existan las rutas reales y las pruebas de integración, H-07 permanece `BLOCKED`.

El alcance de cierre de H-07 son las rutas documentales de B1.4. Las rutas de análisis/entregables de B1.5 deben reutilizar el mismo gate y sus pruebas se añaden en B1.5 como condición de Block 1; no requieren D17.

D17 no se cierra con esta evidencia. D17 requiere los elementos de §11.1 y solo puede aprobarse cuando todos estén vigentes.

### 10.5 Verificación de CI

En la implementación futura:

```bash
npm run test:run
npm run lint
npm run typecheck
npm run build
```

No se declara Block 1 terminado con fallos de lint, tipos, build o pruebas. No se corrigen cambios ajenos para hacer pasar la suite.

---

## 11. Dependencias externas, bloqueadores y decisiones abiertas

### 11.1 Evidencia D17

| Dependencia | Condición de cierre | Efecto si falta |
|---|---|---|
| Scanner antimalware real | Adaptador de producción confiable, saludable, firmas vigentes y timeout. | Gate cerrado; no se procesan documentos reales. |
| Política de retención | `policy_version`, `approved_by`, `approved_at`, parámetros autorizados y estado activo. | Gate cerrado. |
| Worker de purga | Evidencia de ejecución exitosa, reciente y dentro de `max_purge_staleness_window_hours`. | Gate cerrado. |
| Infraestructura | Chequeo no destructivo de Storage/DB. | Gate cerrado. |
| DPA de IA | Contrato activo, alcance correcto, no entrenamiento y retención verificada. | Gate cerrado. |
| Validación legal | Aprobación activa y vigente para transferencia/tratamiento. | Gate cerrado. |
| Flag | `SERVICES_REAL_DOCUMENTS_ENABLED=true` solo después de todo lo anterior. | Gate cerrado. |

No se inventan evidencias ni se usan fixtures como prueba de producción. D17 no se aprueba por integrar el gate ni por cerrar H-07; H-07 no se cierra por tener evidencia D17.

### 11.2 Decisiones técnicas que B1.0 debe congelar

Estas decisiones no requieren aprobación D17 y no bloquean el inicio de B1.0:

1. **Política de lectura:** autenticación, tenant, pertenencia/asignación, estado, publicación, retención y prohibición de cuarentena/no validados; URLs de 300 s.
2. **Kill switch de lectura:** solo se identifica como decisión operativa independiente pendiente; no se implementa, no es requisito de B1.0 y no altera la política de lectura.
3. **Seam de pruebas:** gate real en configuración de producción con adaptadores/fixtures sintéticos confiables, sin bypass en la app.
4. **Conversión de inquiry:** flujo server-side de creación/vinculación de empresa y usuario; no reutilizar `registerCompany()` del cliente.
5. **Abstracciones:** `MalwareScannerPort`, proveedor IA y adaptadores sintéticos definidos antes de implementar las rutas que los usan.
6. **Contratos técnicos:** modelo de datos, estados, API, roles, RLS, Storage, eventos, auditoría y pruebas.
7. **Parámetros comerciales de prueba:** precios, SLA y ventana de revisión pueden usar fixtures; los valores reales se aprueban fuera de B1.0.

### 11.3 Bloqueadores de aprobación D17 / producción (no de B1.0)

Estos elementos bloquean la aprobación D17 y la producción, pero **no bloquean el diseño, el desarrollo técnico ni el cierre de H-07**:

- Selección y contratación definitiva del proveedor antimalware.
- DPA del proveedor IA.
- Aprobaciones legales y de privacidad.
- Aprobación formal de la política de retención.
- Evidencia de despliegue y operación del worker de purga.
- Evidencia operativa de scanner saludable y probe de producción.
- Aprobación formal para activar `SERVICES_REAL_DOCUMENTS_ENABLED`.

Se puede desarrollar y probar con adaptadores sintéticos, fixtures controlados y el gate cerrado, sin procesar documentos reales. La selección del proveedor real y su habilitación en producción pertenecen a D17.

---

## 12. Secuencia de implementación

La implementación se divide en sub-bloques pequeños, cada uno con pruebas y sin activar documentos reales. Ningún sub-bloque se considera terminado solo por compilar.

### B1.0 — Preparación y contratos

B1.0 puede iniciar y cerrarse con `D17=BLOCKED`. No requiere scanner real, DPA, aprobación legal, retención aprobada, worker de purga ni evidencia operativa de producción.

Debe congelar como mínimo:

- Modelo de datos y relaciones.
- Estados y transiciones.
- Contratos API y responsabilidades server-side.
- Matriz de roles y permisos.
- Estrategia RLS y aislamiento multi-tenant.
- Contratos de Storage y buckets privados.
- Interfaces/adaptadores para scanner y proveedor IA.
- Comportamiento fail-closed del gate.
- Estrategia de pruebas y fixtures sintéticos.
- Auditoría de eventos y trazabilidad.
- Política formal de lectura y kill switch separado como decisión pendiente no bloqueante.

Criterio de salida: contratos y decisiones técnicas aprobados; `D17=BLOCKED`; sin cambios productivos y sin documentos reales.

### B1.1 — Datos, RLS y Storage

- Migración con tablas, relaciones, índices, funciones, triggers, RLS y grants.
- Buckets privados y prefijos de cuarentena/clean.
- Pruebas PGlite de RLS, inmutabilidad, constraints, unicidad y cross-tenant.
- Criterio de salida: ningún usuario accede a otra empresa; ninguna cuarentena es descargable; no hay writes de cliente; no hay policies DELETE.

### B1.2 — Conversión, órdenes y cotizaciones

- Bandeja admin de inquiries.
- Conversión idempotente y aprovisionamiento server-side.
- Órdenes, asignaciones, cotizaciones versionadas, envío y expiración.
- Eventos y notificaciones.
- Criterio de salida: una orden por inquiry; una cotización `sent` activa; asignación transaccional; sin documentos.

### B1.3 — Aceptación y pagos

- Aceptación inmutable y transaccional.
- Intento de pago, comprobante en bucket separado, finalize y revisión admin.
- Gate de pago confirmado para avanzar a `awaiting_documents`.
- Criterio de salida: no se habilita documento sin pago confirmado; no hay doble aceptación/pago; comprobante no analizado por IA.

### B1.4 — Documentos, integración del gate y pruebas de H-07

- `documents/upload-url` y `finalize` con cuarentena, validación PDF, malware, hash y promoción.
- Integración del gate en upload, finalize, escaneo, promoción y reintentos.
- Reintento de cuarentena y descarga de documentos autorizados.
- Pruebas HTTP/de integración de H-07: gate cerrado `503`, no-bypass y ausencia de efectos.
- Cierre de H-07 como `RESOLVED` cuando la integración y las pruebas anteriores estén completas.
- Criterio de salida: H-07 resuelto técnicamente con `D17=BLOCKED`; Gate cerrado bloquea el ingreso, escaneo, promoción y procesamiento de documentos; no permite servir objetos en cuarentena o no validados. Las lecturas de objetos previamente `clean`/`validated` siguen la política de §8.2.2 y no requieren D17. Archivo infectado rechazado; cruce de tenant imposible; ningún documento real procesado.

### B1.5 — Análisis, revisión y entrega

- Análisis IA versionado, evidencia y revisión.
- Aprobación de análisis current.
- Generación de PDF, escaneo, publicación y entrega.
- Integración del gate en análisis y deliverables, con pruebas equivalentes a las de B1.4.
- Criterio de salida: solo documentos clean/validated se analizan; cliente solo ve informe final; gate cerrado bloquea análisis/entrega; `D17` sigue `BLOCKED` salvo aprobación independiente.

### B1.6 — Revisiones, retención y operación

- Ronda incluida, ventana y cotización adicional.
- Retención metadata, legal hold y acciones auditables.
- Bandeja admin, monitoreo de cuarentena y runbooks.
- Criterio de salida: una revisión activa; hold bloquea purga futura; no se implementa worker de purga en Block 1.

### 12.1 Orden de activación de producción

Esta secuencia es independiente del cierre de H-07. H-07 puede quedar `RESOLVED` con `D17=BLOCKED`; la siguiente secuencia solo aplica a la habilitación de documentos reales:

1. Código y pruebas con flag `false`.
2. Staging con fixtures sintéticos y gate de prueba.
3. Evidencia D17 completa.
4. Aprobación formal de D17 y apertura.
5. `SERVICES_REAL_DOCUMENTS_ENABLED=true` solo en producción y solo con D17 aprobado y gate abierto.
6. Monitoreo y rollback documentados.

Nunca se activa primero y se prueba después.

---

## 13. Criterios de aceptación y definición de terminado

### 13.1 Criterios heredados

Se aceptan los 50 criterios de `docs/services/SPRINT_2_TECHNICAL_DESIGN.md` §16. Este plan no los debilita. En caso de conflicto, prevalece el criterio más restrictivo.

### 13.2 Criterios adicionales de Block 1

1. Existe una sola vía de conversión inquiry -> orden, idempotente y server-side.
2. Una orden no puede tener dos aceptaciones, dos pagos confirmados, dos revisiones activas ni dos análisis current.
3. Todo documento contractual se registra en cuarentena y solo se promueve tras validación y escaneo.
4. Todo comprobante vive en `service-payment-proofs`, nunca en `service-documents`, y nunca se analiza con IA.
5. Ninguna operación de ingreso/procesamiento documental puede ejecutarse sin el gate cuando la matriz lo exige; las lecturas válidas siguen la política formal de §8.2.2.
6. El gate cerrado no crea filas, no firma URLs de procesamiento, no descarga para procesar, no llama parser/IA y responde `503`.
7. Una URL firmada previa no permite promover un documento si el gate se cierra.
8. El flag no sustituye el gate.
9. No existe un bypass de development para documentos reales.
10. Las pruebas de H-07 usan rutas reales y gate real en configuración de prueba.
11. No hay `getPublicUrl` en Services.
12. No hay policies DELETE de cliente.
13. Los eventos, aceptaciones y acciones de retención son inmutables.
14. Las descargas de cuarentena, no publicadas, borradas o purgadas están bloqueadas.
15. Los logs no contienen contenido, rutas, URLs, tokens, firmas ni PII.
16. La retención está modelada y auditada; el worker de purga queda fuera de Block 1.
17. La documentación de apertura incluye evidencia D17 y runbooks; no se confunde con la evidencia de H-07.
18. No se declara H-07 resuelto sin integración y pruebas reales.
19. H-07 puede marcarse `RESOLVED` con `D17=BLOCKED` cuando existan las rutas reales y las pruebas HTTP/de integración de no-bypass.
20. D17 permanece `BLOCKED` hasta que todos los requisitos de §11.1 estén vigentes; H-07 no lo aprueba.
21. La lectura de objetos clean/validated no requiere D17, pero exige autenticación, tenant, pertenencia/asignación, estado, publicación y retención.
22. El kill switch de lectura no se implementa, no es requisito de B1.0 y no modifica las reglas de acceso.

### 13.3 Definición de terminado de Block 1

Block 1 está terminado cuando:

- La migración aplica limpia y las pruebas PGlite pasan.
- Las rutas y contratos de §6 están implementados y cubiertos.
- La matriz §9 está cubierta por pruebas.
- `npm run test:run`, `npm run lint`, `npm run typecheck` y `npm run build` pasan.
- No hay accesos cross-tenant, cuarentena descargable ni writes de cliente.
- El gate está integrado en todas las fronteras de ingreso/procesamiento y las pruebas demuestran que no hay bypass.
- H-07 está `RESOLVED` con la evidencia de integración y pruebas de B1.4; si falta, Block 1 no se declara terminado y H-07 permanece `BLOCKED`.
- D17 permanece `BLOCKED` salvo aprobación independiente con toda la evidencia de §11.1; el cierre de H-07 no lo aprueba.
- No se procesaron documentos reales.
- No se activó `SERVICES_REAL_DOCUMENTS_ENABLED`.
- La apertura de producción sigue requiriendo D17 aprobado, evidencia operativa, aprobación formal y worker de purga.
