# Security Decision Record — LegalUp

**Clasificación:** interno y confidencial  
**Fecha:** 26 de noviembre de 2026  
**Versión:** 1.0-draft para revisión  
**Alcance:** decisiones de seguridad y estado de contención financiera desde Fase 1 hasta Fase 2F  
**Naturaleza:** documento de decisión. No ejecuta cambios, no aplica migraciones y no reemplaza un runbook operativo.

---

## 1. Propósito

Consolidar en un solo registro:

- los hallazgos que motivaron la contención;
- qué se decidió en cada fase;
- qué está versionado en Git y qué está aplicado en producción;
- qué sigue bloqueado;
- qué autorizaciones faltan antes de habilitar pagos o payouts;
- qué afirmaciones son históricas y ya no deben presentarse como estado actual.

Este documento se basa en evidencia documental y en el estado del repositorio. **No se verificó producción en vivo durante esta consolidación.** Por lo tanto, toda afirmación sobre producción se limita a lo que los documentos de fase registran y debe confirmarse antes de operar.

---

## 2. Veredicto ejecutivo

**Veredicto: NO APTO para producción sin contención, migraciones verificadas y autorización explícita.**

La conclusión principal no es una fuga de datos: es la posibilidad de **fraude financiero directo** por creación de pagos y ejecución de payouts sin evidencia canónica suficiente.

Estado del incidente:

- Exposición técnica: **confirmada** en los documentos de Fase 1.
- Acceso no autorizado o exfiltración: **indeterminable**; no hay evidencia concluyente, pero tampoco es posible descartarlo.
- Fraude ejecutado: **sin evidencia documentada**; el vector existía y debe tratarse como riesgo abierto.
- `payout_logs=0` **no demuestra** que no existan pagos o transferencias históricas.

Formulación defendible: **“no tenemos evidencia de acceso no autorizado; no podemos descartarlo”**. No usar “no hubo incidente” ni “no se filtró nada”.

---

## 3. Clasificación de estados

| Estado | Significado |
|---|---|
| **Aplicado en producción** | Verificado en el entorno productivo. No se asume por estar en Git. |
| **Versionado en Git** | Existe como migración o código en el repositorio, pero no consta aplicado/desplegado. |
| **Probado localmente** | Hay resultados de tests locales; no sustituye staging ni producción. |
| **Pendiente** | Requiere implementación, verificación o autorización. |
| **Histórico** | Afirmación válida en la fecha del documento fuente; puede no representar el estado actual. |
| **No verificado** | No hay evidencia suficiente para afirmar el estado. |

Regla: una migración versionada no es una migración aplicada. Un test local no es una validación de producción. Un documento histórico no es un estado actual.

---

## 4. Decisiones

### D-001 — Tratar Fase 1 como bloqueante de producción

**Decisión:** mantener el veredicto **NO APTO** hasta cerrar los vectores críticos de pagos, documentos y PII.

**Razón:** los hallazgos P0 permitían creación de pagos arbitrarios, exposición de documentos y lectura de perfiles con PII por `anon`.

**Estado:** vigente.

### D-002 — Mantener el cron de payouts suspendido

**Decisión:** no reactivar, eliminar ni modificar `weekly-payouts` mientras no se cumplan las condiciones de D-004 y D-005.

**Razón:** el payout desplegado no valida elegibilidad canónica y el esquema productivo no soporta el Edge endurecido.

**Estado:** el usuario confirma cron suspendido. Los documentos de Fase 2E/2B/2 lo registraban históricamente activo; esas afirmaciones son **históricas** y no deben usarse como estado actual.

**Restricción:** no eliminar ni modificar el job sin preservar evidencia. Si se suspendió con `alter_job`, el comando y el secreto embebido pueden seguir existiendo; verificar y rotar por separado.

### D-003 — No desplegar el Edge de payouts endurecido todavía

**Decisión:** no desplegar `process-weekly-payouts` hasta cerrar los bloqueantes 2F-a/2F-b, aplicar y verificar la migración de elegibilidad, respaldar datos y autorizar la ventana.

**Razón:** el código local espera columnas que no existen en producción (`payout_eligible`, `confirmed_at`, `confirmation_source`, `payment_gateway_id`) y el esquema desplegado no tiene `payments.lawyer_user_id` ni la columna de token de Mercado Pago en perfiles.

**Estado:** vigente. La versión desplegada documentada es la v27, incompatible con el código local endurecido.

### D-004 — Fase 2E aplicada; Fase 2F no aplicar sin cerrar bloqueantes, respaldo y autorización

**Decisión:** Fase 2E está aplicada en producción; no reaplicarla. Mantener como requisito una verificación de solo lectura de los privilegios efectivos. Fase 2F está versionada y pusheada, pero no aplicada; no aplicarla sin cerrar los bloqueantes 2F-a/2F-b, respaldo, ventana y autorización.

**Razón:** Fase 2E fue aplicada con SHA autorizado/aplicado `2f0418020ca44d59402f801d8e59a761a853f02937ee7e3d3aaf88b0b9923d2d`, versión remota `20261124183450` y reconciliación en Git mediante el commit `8f79b20`. Fase 2F no se probó contra una copia real de producción y mantiene bloqueantes de evidencia canónica.

**Estado:** Fase 2E aplicada; verificación de privilegios efectivos pendiente. Fase 2F versionada y pusheada, no aplicada; bloqueantes 2F-a/2F-b abiertos.

### D-005 — No habilitar payouts automáticos ni manuales sin evidencia canónica

**Decisión:** ningún pago histórico se vuelve elegible por el solo hecho de aplicar la migración. No hacer backfill sin evidencia de Mercado Pago y aprobación separada.

**Razón:** la migración Fase 2F es aditiva y no hace backfill; todas las filas históricas quedan `payout_eligible=false`.

**Estado:** vigente.

### D-006 — No usar el trigger manual de payout mientras esté roto

**Decisión:** no usar `/api/admin/trigger-payout` hasta corregir la autenticación.

**Razón:** el endpoint envía `Authorization`, pero la función exige `x-cron-secret`; responde 401. No debe intentarse “hacerlo funcionar” saltándose el control.

**Estado:** vigente.

### D-007 — No afirmar aislamiento legacy completo

**Decisión:** describir el estado legacy como **inventariado y parcialmente contenido**, nunca como “aislado”.

**Razón:** Fase 2E inventarió y propuso, pero no modificó componentes legacy ni bloqueó flujos en producción. Fase 2F no modifica legacy; solo agrega controles de elegibilidad en base de datos.

**Estado:** vigente.

### D-008 — No ejecutar los SQL 01–06 como migraciones listas

**Decisión:** mantener los SQL de `docs/security/sql/` como borradores históricos de revisión, no como migraciones aplicables.

**Razón:** no forman parte del historial de migraciones y no están validados para producción. Varios hallazgos históricos ya fueron corregidos en versiones posteriores.

**Estado:** vigente.

### D-009 — Preservar evidencia antes de contener

**Decisión:** ante cualquier cambio de contención, preservar snapshots de pagos, eventos, payouts, cotizaciones, bookings, cron y logs, con acceso restringido y sin exponer secretos ni PII.

**Razón:** sin evidencia no se puede reconciliar ni determinar alcance.

**Estado:** vigente.

### D-010 — Mantener este documento redactado

**Decisión:** no incluir en este registro correos, nombres, RUT, IDs de pagos/bookings/usuarios, tokens, secretos, project refs ni datos financieros identificables.

**Razón:** el registro debe poder circular internamente sin convertirse en una nueva exposición.

**Estado:** vigente.

---

## 5. Estado por fase

### 5.1 Fase 1 — Auditoría de seguridad

**Estado:** completada como auditoría; hallazgos abiertos; sin remediación aplicada.

Hallazgos críticos:

- **P0 — Creación arbitraria de pagos:** una RPC `SECURITY DEFINER` ejecutable por `anon` permitía insertar pagos con estado `succeeded`, moneda CLP, monto y beneficiario arbitrarios. El job de payout seleccionaba esos pagos y podía transferir dinero real.
- **P0 — Documentos públicos:** bucket `documents` público, con política `SELECT` pública; documentos profesionales, corporativos y legales accesibles por URL pública.
- **P0 — PII de perfiles:** políticas permisivas permitían a `anon` leer perfiles con emails, teléfonos, RUT y estados de verificación. Columnas de credenciales Mercado Pago existían; al momento de la auditoría no tenían valor.
- **P0 — Superficie `SECURITY DEFINER`:** 34 funciones ejecutables por `anon`; 32 de negocio sin verificación de `auth.uid()`. Permitían, entre otras, forjar verificación, cambiar RUT, otorgar Founder Pro, alterar gateway IDs y leer métricas.
- **Riesgos altos:** inserts autenticados en `payment_events`, `/create-payment` sin autenticación y webhook Edge sin firma.

**Decisión asociada:** D-001.

**Limitación:** no se probó explotación real; la clasificación es “exposición técnicamente posible” y “acceso indeterminable”.

### 5.2 Fase 2 — Contención financiera inicial

**Estado:** documentación y pruebas locales; **sin cambios en producción**.

- Se definió una secuencia de contención: preservar evidencia, suspender cron, revocar RPC, bloquear endpoints legacy, deshabilitar Edge, rotar secretos y reconciliar.
- Los tests locales de la fase quedaron **BLOQUEADOS** por ausencia de Docker; no se pudo ejecutar Supabase local ni RLS/triggers.
- Los SQL 01–06 son borradores históricos, no migraciones.
- La revisión histórica detectó que el SQL 02 no eliminaba un trigger y que el 06 tenía un bypass anónimo; las versiones actuales de esos borradores ya incluyen correcciones. No presentar esos hallazgos como estado actual sin verificar la versión.

**Decisión asociada:** D-008, D-009.

### 5.3 Fase 2B — Auditorías de creación de pagos, webhook y payout

**Estado:** auditorías completas; tests locales verdes en lo cubierto; **NO APTO global**.

- Creación de pagos: `/create-payment` legacy vivo, sin autenticación, con monto y beneficiario controlados por el cliente; Netlify legacy condicional; Edge de preferencias confía en ítems/precio/referencia del cliente.
- Webhook: el webhook del servidor es la única pieza madura (firma HMAC fail-closed, validación de monto/moneda, idempotencia). El webhook Edge de cotizaciones no verifica firma ni monto/moneda. `verify-payment` no exige autenticación y devuelve datos del pagador.
- Payout: el cron histórico estaba activo; el Edge desplegado no coincide con el código local endurecido.
- Tests financieros locales: **126 PASS, 0 FAIL**, pero no cubren el webhook Edge sin firma ni todos los endpoints legacy.

**Decisión asociada:** D-002, D-003, D-007.

### 5.4 Fase 2C — Inventario de endpoints y contención de emergencia

**Estado:** inventario completo; plan de emergencia **no ejecutado**; legacy sin cambios.

- Inventario de backend, Edge Functions, Netlify y llamadores.
- Hallazgo: Edge `create-payment` v84 activa, sin código fuente descargable; comportamiento desconocido y potencialmente crítico.
- Hallazgo: snapshot histórico con 0 pagos `succeeded` CLP, 4 `pending` CLP, 1 `succeeded` USD, `payout_logs=0`; las columnas de payout no existían.
- El plan de emergencia recomendaba suspender el cron, revocar RPC, bloquear `/create-payment`, retirar Netlify, deshabilitar Edge y rotar secretos. **No se ejecutó como parte de esa fase.**
- El cron se documentó históricamente activo; el estado actual confirmado es suspendido.

**Decisión asociada:** D-002, D-006, D-009.

### 5.5 Fase 2D — Matriz de dependencias y contención selectiva

**Estado:** análisis completo; pruebas locales verdes; **sin cambios en producción**.

- Matriz de dependencias para distinguir el flujo canónico de los flujos legacy.
- Conclusión: no bloquear Netlify hasta migrar `ContactModal`; no bloquear `/create-payment` hasta corregir el retry de `PaymentFailure`; no tocar el webhook firmado sin una prueba de defecto concreta.
- Reconciliación del pago real histórico: **no conciliado**. Moneda inconsistente, sin `booking_id`, sin `lawyer_amount`/`platform_fee`; transferencia manual sin respaldo en base de datos.
- `payout_logs=0` no prueba ausencia de pagos.
- Tests locales: **123 PASS**; no demuestran seguridad de producción.

**Decisión asociada:** D-005, D-007, D-009.

### 5.6 Fase 2E — Endurecimiento de privilegios RPC

**Estado:** migración **aplicada en producción**; SHA autorizado/aplicado `2f0418020ca44d59402f801d8e59a761a853f02937ee7e3d3aaf88b0b9923d2d`; versión remota `20261124183450`; reconciliada en Git mediante el commit `8f79b20`. Tests locales **130/130**. Legacy solo inventariado.

Migración: `supabase/migrations/20261124183450_phase2e_rpc_privilege_hardening.sql`

Efecto:

- revoca `PUBLIC`, `anon` y `authenticated` de cinco RPC financieras/de fundador;
- conserva `service_role` en esas cinco;
- para `get_company_metrics()` revoca `PUBLIC` y `anon`, conserva `authenticated` por el panel admin y `service_role` por el endpoint admin;
- no cambia datos ni definiciones de funciones.

Hallazgo principal: las seis funciones tenían EXECUTE implícito de `PUBLIC`; revocar solo `anon`/`authenticated` no habría eliminado el acceso.

Estado de producción: **aplicada**. No reaplicar. La verificación de solo lectura de los privilegios efectivos queda como requisito de cierre.

Riesgos residuales:

- `get_company_metrics` sigue disponible para cualquier usuario autenticado; moverlo a endpoint admin exclusivo queda como deuda.
- El endpoint admin de payout no envía `x-cron-secret`; debe fallar cerrado.
- Verificación de solo lectura de privilegios efectivos pendiente.
- Sin staging para pruebas adicionales.

**Decisión asociada:** D-004, D-006, D-007.

### 5.7 Fase 2F — Elegibilidad de payout y aislamiento legacy

**Estado:** migración **versionada y pusheada**, **no aplicada en producción**; tests de elegibilidad e integridad **136/136**; **no habilitada para producción**. El cron permanece suspendido y el Edge endurecido no se ha desplegado.

Migración: `supabase/migrations/20261125120000_phase2f_payout_eligibility.sql`  
Commit: `91926b5`

Efecto:

- agrega `confirmed_at`, `confirmation_source` y `payout_eligible` (default `false`, `NOT NULL`);
- no hace backfill: todo histórico queda no elegible;
- agrega un CHECK `NOT VALID` que exige, para `payout_eligible=true`: `status='succeeded'`, `confirmed_at`, `confirmation_source='mercadopago_webhook'`, `payment_gateway_id` no vacío, `currency='CLP'`, `lawyer_id`, `lawyer_amount>0` y `amount>0`;
- agrega triggers para forzar pagos de clientes a `pending`, proteger campos financieros, canonicalizar el gateway desde metadata y reconciliar confirmaciones solo desde `payment_events.success` con `source=webhook` insertado por `service_role`;
- bloquea `pending -> processing` si el pago no es elegible;
- crea índice de cola de payouts elegibles;
- no modifica webhooks, Edge Functions, cron, RLS ni datos históricos.

**No habilita producción.** Bloqueantes expresos:

- **2F-a — evento `success` de cliente antes del webhook:** un evento `success` insertado por un cliente puede ocupar el índice único antes del webhook. El webhook puede recibir un `23505` tratado como duplicado benigno, sin canonicalizar el evento existente ni completar la elegibilidad.
- **2F-b — `service_role` sin evidencia canónica completa:** `service_role` puede establecer `payout_eligible=true` para un pago `succeeded` sin evidencia de `payment_event` canónico. La garantía estricta de evidencia verificable no está completamente impuesta.

Riesgos residuales adicionales:

- sin staging: la migración y los triggers no se probaron contra una copia real de producción;
- RLS de `payment_events` sigue permisiva; el trigger bloquea eventos falsos de confirmación, pero no corrige la deuda de auditoría/analytics;
- webhook no modificado: si cambia `metadata.provider_payment_id` o `metadata.source`, la reconciliación deja de funcionar;
- pago preexistente por booking: el webhook no convierte a `succeeded` un pago ya existente para el mismo booking; el flujo canónico actual no crea el pago antes del webhook, pero es deuda a vigilar;
- sin backfill: los históricos permanecen no elegibles; cualquier backfill requiere evidencia de Mercado Pago y aprobación separada;
- roles privilegiados: `service_role` y admin pueden escribir; la seguridad depende del control de esas credenciales;
- cron inactivo: el sistema no paga automáticamente mientras no se autorice.

**Decisión asociada:** D-002, D-003, D-004, D-005.

---

## 6. Matriz de migraciones y SQL

**Fase 2E:** aplicada en producción. SHA autorizado/aplicado `2f0418020ca44d59402f801d8e59a761a853f02937ee7e3d3aaf88b0b9923d2d`; versión remota `20261124183450`; reconciliada en Git mediante `8f79b20`.  
**Fase 2F:** versionada y pusheada, no aplicada en producción.

| Elemento | Commit | SHA/registro remoto | Estado Git | Estado producción | Efecto | Decisión |
|---|---|---|---|---|---|---|
| `20261124183450_phase2e_rpc_privilege_hardening.sql` | `8f79b20` | `2f0418020ca44d59402f801d8e59a761a853f02937ee7e3d3aaf88b0b9923d2d` / `20261124183450` | Versionada y reconciliada | **Aplicada** | Revoca EXECUTE de RPC financieras; conserva `service_role` | D-004 |
| `20261125120000_phase2f_payout_eligibility.sql` | `91926b5` | — | Versionada y pusheada | **No aplicada** | Elegibilidad de payout, triggers y guardia | D-003, D-004, D-005 |
| `docs/security/sql/01`–`06` | — | — | Borradores untracked | No aplicados | Contención histórica | D-008 |

**Regla operativa:** Fase 2E no se reaplica. Fase 2F no se aplica sin respaldo, ventana, cierre de bloqueantes, verificación posterior y autorización registrada.

---

## 7. RPC financieras y privilegios

| RPC | Riesgo histórico | Estado deseado | Estado actual documentado |
|---|---|---|---|
| `create_payment_secure(...)` | Inserta pagos arbitrarios, incluso `succeeded` CLP | Solo `service_role` | Fase 2E aplicada; verificación de privilegios efectivos pendiente |
| `update_payment_gateway_id(uuid,text)` | Altera cualquier pago | Solo `service_role` | Fase 2E aplicada; verificación de privilegios efectivos pendiente |
| `claim_pro_founder_slot(uuid)` | Otorga entitlement Founder | Solo `service_role` | Fase 2E aplicada; verificación de privilegios efectivos pendiente |
| `reserve_pro_founder_slot(uuid,integer)` | Reserva cupos arbitrariamente | Solo `service_role` | Fase 2E aplicada; verificación de privilegios efectivos pendiente |
| `reconcile_pro_founders()` | Recalcula Founders sin autorización | Solo `service_role` | Fase 2E aplicada; verificación de privilegios efectivos pendiente |
| `get_company_metrics()` | Métricas comerciales | `authenticated` + `service_role`; deuda mover a admin-only | Fase 2E aplicada; `authenticated` conservado; verificación pendiente |
| `zz_reconcile_payment_confirmation(uuid)` | Confirmación de pago | Solo `service_role` | Definida en Fase 2F; no aplicada |

**Nota:** el servidor usa `service_role` para el flujo canónico. Fase 2E ya está aplicada; la verificación de solo lectura debe confirmar que el servidor conserva `service_role` y que los clientes no tienen EXECUTE.

---

## 8. Estado del cron y del payout

| Elemento | Estado actual | Evidencia | Decisión |
|---|---|---|---|
| Cron `weekly-payouts` | **Suspendido** | Confirmación del usuario; Fase 2F lo describe inactivo | No reactivar sin D-002/D-004 |
| Edge `process-weekly-payouts` | v27 desplegada, incompatible | Fase 2C/2E/2F | No desplegar el endurecido |
| Trigger manual `/api/admin/trigger-payout` | Roto (401) | Fase 2E | No usar |
| `payout_logs` | 0 en snapshot histórico | Fase 2C/2D | No usar como prueba de ausencia |
| Pago real histórico | No conciliado | Fase 2D | Escalar; no crear `succeeded` manualmente |

**Advertencia:** `cron.job_run_details` puede mostrar ejecuciones “succeeded” solo porque el `net.http_post` fue encolado; no confirma que la Edge Function haya pagado.

---

## 9. Riesgos abiertos

| ID | Riesgo | Severidad | Estado | Mitigación requerida |
|---|---|---|---|---|
| R-01 | Privilegios efectivos de RPC no verificados tras Fase 2E | P1/P0 hasta verificar | Abierto | Verificación de solo lectura |
| R-02 | Documentos en bucket público | P0 | Abierto | Hacer privado, signed URLs, evaluar exposición |
| R-03 | PII de perfiles legible por `anon` | P0 | Abierto | RLS restrictiva y verificación |
| R-04 | Webhook Edge sin firma ni validación de monto | P0 | Abierto | Firmar o retirar; usar webhook canónico |
| R-05 | `/create-payment` legacy sin auth y precio cliente | P0 | Abierto | Migrar llamadores y bloquear |
| R-06 | Edge `create-payment` v84 sin fuente revisada | P1/P0 desconocido | No verificado | Obtener fuente, inventariar y retirar |
| R-07 | `verify-payment` sin auth y con PII | P1 | Abierto | Exigir JWT/ownership y minimizar respuesta |
| R-08 | OAuth con token en query string | P1 | Abierto | Entregar token por canal seguro |
| R-09 | Edge de payout incompatible con esquema | P1 | Abierto | Migración Fase 2F, despliegue y verificación |
| R-10 | Fase 2F no aplicada | P1 | Abierto | Cerrar bloqueantes 2F-a/2F-b; respaldo, ventana y autorización |
| R-11 | Secreto embebido en comando de cron | P1 | Abierto | Rotar y recrear sin secreto en texto plano |
| R-12 | Pago real histórico no conciliado | P1 | Abierto | Reconciliación Mercado Pago |
| R-13 | Legacy sin aislamiento completo | P1 | Abierto | Ejecutar plan de aislamiento |
| R-14 | **2F-a:** evento `success` de cliente puede ocupar el índice único antes del webhook; `23505` tratado como duplicado benigno sin canonicalizar ni completar elegibilidad | P0 | Abierto | Corregir canonicalización y flujo de duplicados antes de producción |
| R-15 | **2F-b:** `service_role` puede marcar `payout_eligible=true` en un pago `succeeded` sin evidencia de `payment_event` canónico | P0 | Abierto | Imponer garantía estricta de evidencia verificable |

---

## 10. Aprobaciones requeridas

| Acción | Autorizador | Estado |
|---|---|---|
| Verificar privilegios efectivos de Fase 2E (solo lectura) | Founder + ops | Pendiente |
| Cerrar bloqueantes 2F-a/2F-b | Founder + ops | Pendiente |
| Aplicar migración Fase 2F | Founder + ops | Pendiente |
| Desplegar Edge de payouts endurecido | Founder + ops | Pendiente |
| Reactivar cron de payouts | Founder | Pendiente |
| Bloquear endpoints legacy | Founder + ops | Pendiente |
| Rotar secretos | Founder + ops | Pendiente |
| Comunicación externa o legal | Founder + legal | Pendiente |

---

## 11. Criterios de salida

Para pasar de “NO APTO” a un estado operativo controlado:

1. Fase 2E aplicada; verificación de solo lectura de privilegios efectivos completada: clientes sin EXECUTE en RPC financieras.
2. Bloqueantes 2F-a/2F-b cerrados; Fase 2F aplicada y verificada: columnas, constraint, triggers e índice presentes; cola elegible en 0; históricos no elegibles.
3. Edge de payouts desplegado solo después de la migración y con prueba controlada.
4. Cron reactivado solo con aprobación explícita y monitoreo.
5. Legacy inventariado, migrado y bloqueado sin romper el flujo canónico.
6. Webhook Edge firmado o retirado.
7. PII de `verify-payment`, pagos y documentos autenticada y minimizada.
8. Pago real histórico reconciliado con Mercado Pago.
9. Evidencia preservada y decisión de notificación documentada con legal.
10. Ningún secreto en documentos, logs, comandos o repositorio.

---

## 12. Limitaciones de este registro

- No hubo acceso a producción ni staging durante la consolidación.
- No se ejecutaron tests ni SQL.
- No se verificó el estado remoto de migraciones, cron, Edge Functions ni secretos.
- Los documentos fuente son históricos y pueden contener afirmaciones superadas.
- No se incluyó evidencia cruda, PII, secretos ni identificadores financieros.

---

## 13. Referencias

- `docs/security/PHASE_1_SECURITY_AUDIT.md`
- `docs/security/INCIDENT_ASSESSMENT.md`
- `docs/security/PHASE_1_REMEDIATION_PLAN.md`
- `docs/security/PHASE_2_FINANCIAL_CONTAINMENT.md`
- `docs/security/PHASE_2_REVIEW.md`
- `docs/security/PHASE_2_MIGRATION_REVIEW.md`
- `docs/security/PHASE_2_LOCAL_TEST_RESULTS.md`
- `docs/security/PHASE_2B_PAYMENT_CREATION_AUDIT.md`
- `docs/security/PHASE_2B_WEBHOOK_AUDIT.md`
- `docs/security/PHASE_2B_PAYOUT_CRON_ASSESSMENT.md`
- `docs/security/PHASE_2B_FINANCIAL_TEST_RESULTS.md`
- `docs/security/PHASE_2C_ENDPOINT_INVENTORY.md`
- `docs/security/PHASE_2C_PAYMENT_ENDPOINT_AUDIT.md`
- `docs/security/PHASE_2C_WEBHOOK_REVIEW.md`
- `docs/security/PHASE_2C_EMERGENCY_CONTAINMENT.md`
- `docs/security/PHASE_2D_DEPENDENCY_RISK_MATRIX.md`
- `docs/security/PHASE_2D_REAL_PAYMENT_RECONCILIATION.md`
- `docs/security/PHASE_2D_SELECTIVE_CONTAINMENT_PLAN.md`
- `docs/security/PHASE_2E_IMPLEMENTATION_REPORT.md`
- `docs/security/PHASE_2E_PRECHECK.md`
- `docs/security/PHASE_2E_PAYOUT_CONTAINMENT.md`
- `docs/security/PHASE_2E_LEGACY_ISOLATION.md`
- `docs/security/PHASE_2F_PAYOUT_ELIGIBILITY.md`
- `supabase/migrations/20261124183450_phase2e_rpc_privilege_hardening.sql`
- `supabase/migrations/20261125120000_phase2f_payout_eligibility.sql`

---

**Fin del registro.** Cualquier cambio de estado debe reflejarse aquí con fecha, autorización y evidencia verificable.
