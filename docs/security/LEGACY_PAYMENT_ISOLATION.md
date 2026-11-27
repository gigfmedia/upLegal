# Legacy Payment Isolation — LegalUp

**Clasificación:** interno y confidencial  
**Fecha:** 26 de noviembre de 2026  
**Versión:** 1.0-draft para revisión  
**Alcance:** superficies legacy de pago, webhooks, PII y estado de aislamiento  
**Naturaleza:** inventario y criterios de aislamiento. No modifica código, no despliega y no bloquea producción.

---

## 1. Propósito

Documentar qué superficies de pago siguen fuera del flujo canónico, qué dependencias impiden bloquearlas y qué condiciones deben cumplirse para aislarlas sin romper cobros legítimos.

**Conclusión principal:** el legacy **no está completamente aislado**. Fue inventariado y parcialmente contenido, pero no se modificaron sus componentes ni se bloquearon sus flujos en producción.

No usar la frase “legacy aislado” como estado actual. La formulación correcta es: **“legacy inventariado; aislamiento parcial; brechas abiertas”**.

---

## 2. Flujo canónico vs. legacy

### 2.1 Flujo canónico

| Componente | Ruta | Control | Estado |
|---|---|---|---|
| Creación de booking/preferencia | `POST /api/bookings/create` | Precio calculado en servidor | Núcleo del cobro legítimo |
| Webhook firmado | `POST /api/mercadopago/webhook` | HMAC SHA-256 fail-closed; valida monto/moneda | Fuente de verdad para bookings |
| Reconciliación manual | `POST /api/mercadopago/reconcile/:paymentId` | `x-reconcile-secret` | Vía administrativa; no pública |

El flujo canónico es la referencia. Cualquier superficie que cree pagos, preferencias o confirmaciones fuera de este flujo es legacy o deuda.

### 2.2 Superficies legacy

| Superficie | Ruta/archivo | Estado | Autenticación | Problema principal |
|---|---|---|---|---|
| Retry de pago | `src/pages/PaymentFailure.tsx:82` | Activo | Ninguna | Envía el ID del booking como `appointmentId`; `bookingId` queda vacío y el retry no confirma el booking |
| Server legacy | `server.mjs:1254` `/create-payment` | Activo | Ninguna | Monto y beneficiario controlados por el cliente; crea usuarios invitados; usa RPC con `service_role` |
| Netlify legacy | `netlify/functions/create-payment.cjs` | Activo para flujos legacy/contacto | Ninguna | Monto del cliente; columnas incompatibles; con `bookingId` solo valida lawyer, no precio |
| ContactModal | `src/components/ContactModal.tsx:345` | Activo si se monta | Ninguna | URL Netlify hardcodeada; depende de legacy; `consultations=0` al análisis |
| Edge create-payment | Supabase Edge `create-payment` v84 | Activo, comportamiento desconocido | Desconocida | Fuente no descargable; potencial creación de pagos |
| Edge preferencias | `supabase/functions/create-mercado-pago-preference/index.ts` | Activo | JWT | Confía en ítems, precio, `external_reference` y `notification_url` del cliente |
| CheckoutResume | `src/pages/CheckoutResume.tsx:166` | Activo | JWT | Llama preferencias sin `notification_url`; el pago reanudado puede no confirmarse |
| Edge webhook cotizaciones | `supabase/functions/mercado-pago-webhook/index.ts` | Activo | Ninguna | Sin firma; no valida monto/moneda; actualiza quotes y payments |
| Verify payment | `supabase/functions/verify-payment/index.ts` | Activo | Ninguna | Devuelve datos del pagador y del pago |
| Send confirmation | `supabase/functions/send-payment-confirmation/index.ts` | Activo | Ninguna | Acepta email/nombre/monto del cliente y envía correo |
| Payment detail | `server.mjs:1546` `/payment/:paymentId` | Activo | Ninguna | Devuelve fila completa de `payments` |
| Document detail | `server.mjs:2629` `/api/documents/:id` | Activo | Ninguna | Devuelve fila completa del documento |
| OAuth Mercado Pago | `server.mjs:2196` callback | Activo | OAuth | Redirige con token en query string |
| Webhook logging | `server.mjs` webhook | Activo | Firma | Loguea payload crudo y prefijo de token |
| Código muerto | `src/routes/api/create-payment.ts` | Muerto | — | Sin dependencias de SvelteKit |
| Código muerto | `src/pages/api/payments/mercadopago/create.ts` | Muerto | — | Sin llamadores vivos |

---

## 3. Webhooks

| Webhook | Firma | Validación de monto/moneda | Idempotencia | Veredicto |
|---|---|---|---|---|
| Server `POST /api/mercadopago/webhook` | HMAC SHA-256, fail-closed | Sí, contra booking/catálogo | Claim atómico + eventos | Aceptable con hardening |
| Server reconcile | `x-reconcile-secret` | Revisión manual | Parcial | Administrativo; no público |
| Edge `mercado-pago-webhook` | **No** | **No** | Parcial por estado | **Crítico — no usar como fuente de verdad** |
| Edge `verify-payment` | **No** | No aplica | No aplica | **Alto — PII sin auth** |

Riesgos:

- El webhook Edge puede marcar una cotización como pagada sin validar que el monto corresponda.
- `verify-payment` permite leer datos de un pagador si se conoce o filtra un identificador de pago.
- El webhook del servidor valida firma contra el `data.id` de query, pero el procesamiento prioriza el `data.id` del body. Si ambos difieren, la firma podría validar un ID y procesarse otro. No se encontró explotación práctica, pero debe unificarse el identificador.
- `notification_url` puede ser fijada por el cliente en la Edge de preferencias; restringir a dominios propios.
- El webhook firmado registra payload crudo y prefijo de token; reducir logging.

---

## 4. Exposición de PII y datos

| Superficie | Dato | Riesgo | Mitigación |
|---|---|---|---|
| `verify-payment` | `payer`, monto, método, metadata | Alto | Exigir JWT/ownership; devolver solo estado/monto/moneda |
| `/payment/:paymentId` | Fila completa de pago | Alto | Exigir propietario/admin; reducir campos |
| `/api/documents/:id` | Fila completa de documento | Alto | Exigir propietario/admin |
| `send-payment-confirmation` | Email/nombre/monto | Medio | Autenticar o mover a server-side |
| OAuth callback | Token en query string | Alto | Entregar por canal seguro/server-side |
| Webhook logs | Payload y prefijo de token | Medio | Reducir logging; no loguear secretos/PII |
| Netlify legacy | Datos de contacto/pago | Medio | Migrar a endpoint autenticado |

No incluir en este documento nombres, correos, RUT, IDs, tokens ni contenido de documentos.

---

## 5. Estado de aislamiento

| Control | Estado | Evidencia |
|---|---|---|
| Inventario legacy | Parcial; brechas abiertas | Fase 2E |
| Modificación de código legacy | **No realizado** | Fase 2E |
| Bloqueo de rutas legacy | **No realizado** | Fase 2E |
| Retiro de Netlify | **No realizado** | Fase 2E |
| Firma del webhook Edge | **No realizado** | Fase 2B/2C |
| Autenticación de PII | **No realizado** | Fase 2C |
| Revocación de RPC financieras | **Aplicada en producción**; verificación de privilegios efectivos pendiente | Fase 2E |
| Elegibilidad de payout | Versionada y pusheada, no aplicada; bloqueantes 2F-a/2F-b | Fase 2F |
| Cron de payouts | Suspendido | Confirmación del usuario |
| Edge de payouts endurecido | **No desplegado** | Fase 2F |
| Staging | **No disponible** | Fase 2E/2F |

**Fase 2E:** aplicada con SHA `2f0418020ca44d59402f801d8e59a761a853f02937ee7e3d3aaf88b0b9923d2d`, versión remota `20261124183450` y reconciliación en Git mediante el commit `8f79b20`; no reaplicar.  
**Fase 2F:** versionada y pusheada, no aplicada. Bloqueantes: 2F-a, evento `success` de cliente puede ocupar el índice único antes del webhook y el `23505` puede tratarse como duplicado benigno sin canonicalizar ni completar elegibilidad; 2F-b, `service_role` puede marcar `payout_eligible=true` en un pago `succeeded` sin evidencia de `payment_event` canónico.

**Dictamen:** aislamiento **parcial y documental**. No hay evidencia de aislamiento completo.

---

## 6. Dependencias que impiden bloquear

1. **`PaymentFailure.tsx`** todavía reintenta contra `/create-payment`. Bloquear la ruta antes de corregir el retry rompe la recuperación de pagos.
2. **`ContactModal.tsx`** puede llamar a Netlify para cobros de contacto. Bloquear Netlify antes de migrar el componente puede romper esa ruta, aunque `consultations=0` al análisis.
3. **`CheckoutResume.tsx`** usa la Edge de preferencias sin `notification_url`; el pago reanudado puede quedar sin confirmación.
4. **Edge `create-payment` v84** está activa y su fuente no se pudo descargar. No se puede retirar con seguridad sin inventariar llamadas y comportamiento.
5. **Webhook Edge de cotizaciones** puede ser el `notification_url` de `send-service-quote`; retirarlo sin migrar la confirmación de cotizaciones rompe ese flujo.
6. **`verify-payment`** es usado por la pantalla de éxito; autenticarlo sin actualizar el cliente puede romper la experiencia.
7. **El webhook firmado del servidor** es la única pieza madura; no modificarlo sin una prueba de defecto concreta.

---

## 7. Secuencia de aislamiento requerida

No bloquear antes de migrar.

1. **Retry booking-first:** corregir `PaymentFailure` para enviar `bookingId` y precio server-side; retirar el fallback `appointmentId`.
2. **ContactModal:** mover el cobro de contacto a un endpoint server-side autenticado; luego retirar la URL Netlify hardcodeada.
3. **CheckoutResume:** añadir `notification_url` y validar precio/booking en servidor o Edge; no confiar en el cliente.
4. **Webhook Edge:** firmar o retirar; validar monto/moneda contra la cotización; migrar `send-service-quote` al webhook firmado.
5. **PII:** autenticar `verify-payment`, `/payment/:id`, `/api/documents/:id` y `send-payment-confirmation`; minimizar respuestas.
6. **OAuth:** eliminar el token de la query string; reducir logs.
7. **Edge `create-payment`:** obtener la fuente, inventariar llamadas y retirar solo cuando no tenga consumidores.
8. **RPC:** verificar en solo lectura los privilegios efectivos de Fase 2E, ya aplicada; no reaplicar. Confirmar clientes sin EXECUTE y servidor con `service_role`.
9. **Payout:** cerrar los bloqueantes 2F-a/2F-b, aplicar Fase 2F y desplegar el Edge endurecido solo después de la migración.
10. **Bloqueo final:** bloquear rutas legacy solo con evidencia de que no tienen llamadas vivas.

---

## 8. Criterios de aceptación

El legacy puede considerarse aislado solo si:

- no hay llamadores vivos a `/create-payment`, Netlify legacy ni Edge `create-payment`;
- el retry de pago usa el flujo canónico booking-first;
- `ContactModal` usa un endpoint autenticado;
- `CheckoutResume` envía `notification_url` y no confía en precio/referencia del cliente;
- el webhook Edge está firmado o retirado;
- `send-service-quote` usa el webhook firmado;
- `verify-payment`, pagos y documentos exigen propietario/admin;
- no hay tokens en URLs ni logs;
- las RPC financieras no son ejecutables por clientes y los privilegios efectivos de Fase 2E fueron verificados en solo lectura;
- los bloqueantes 2F-a/2F-b están cerrados;
- el cron de payouts está inactivo o controlado;
- hay pruebas del flujo canónico y del retry;
- hay monitoreo de errores y pagos no confirmados;
- la evidencia está preservada y la decisión documentada.

---

## 9. Riesgos residuales

| Riesgo | Estado | Impacto |
|---|---|---|
| `/create-payment` sin auth y precio cliente | Abierto | Preferencias reales por montos arbitrarios |
| Netlify legacy sin auth | Abierto | Cobro legacy con monto cliente; posible fallo por drift |
| Edge `create-payment` v84 desconocida | No verificado | Potencial creación de pagos no inventariada |
| Webhook Edge sin firma | Abierto | Confirmación de cotizaciones sin pago correcto |
| `verify-payment` sin auth | Abierto | Exposición de PII |
| `/payment/:id` y documentos sin auth | Abierto | Exposición de datos |
| OAuth token en URL | Abierto | Exposición en logs/historial |
| Retry roto | Abierto | Pago huérfano y booking sin confirmar |
| CheckoutResume sin `notification_url` | Abierto | Pago reanudado sin confirmación |
| Privilegios efectivos de RPC no verificados | Abierto | Verificación de solo lectura |
| Fase 2F no aplicada | Abierto | Payout Edge incompatible; no presentar como listo |
| 2F-a: evento `success` de cliente antes del webhook | Abierto | `23505` benigno sin canonicalizar ni completar elegibilidad |
| 2F-b: `service_role` puede marcar `payout_eligible` sin evento canónico | Abierto | Garantía estricta de evidencia no impuesta |
| Payout Edge incompatible | Abierto | Fallo o payout no controlado |
| Sin staging | Abierto | Cambios no probados contra producción |

---

## 10. Qué no hacer

- No bloquear Netlify antes de migrar `ContactModal`.
- No bloquear `/create-payment` antes de corregir `PaymentFailure`.
- No modificar el webhook firmado del servidor sin una prueba de defecto concreta.
- No desplegar ni retirar la Edge `create-payment` sin fuente y sin inventario de llamadas.
- No restaurar el webhook Edge sin firma.
- No reaplicar Fase 2E; solo verificar privilegios efectivos en solo lectura.
- No presentar Fase 2F como lista mientras 2F-a/2F-b sigan abiertos.
- No exponer PII, tokens ni secretos en documentos, tests o logs.
- No afirmar aislamiento completo sin cumplir los criterios de aceptación.
- No ejecutar los SQL 01–06 como migraciones listas.

---

## 11. Limitaciones

- No se verificó el estado remoto de Netlify, Render, Supabase Edge ni Mercado Pago durante esta consolidación.
- No se descargó la fuente de la Edge `create-payment`.
- No se ejecutaron pruebas de flujo legacy.
- No hay staging.
- Fase 2E está aplicada según el registro autorizado; los privilegios efectivos no se verificaron en esta consolidación.
- Fase 2F no está aplicada y mantiene abiertos los bloqueantes 2F-a/2F-b.
- Los documentos fuente son históricos y pueden contener afirmaciones superadas.
- `consultations=0` corresponde al momento del análisis, no necesariamente al estado actual.

---

## 12. Referencias

- `docs/security/SECURITY_DECISION_RECORD.md`
- `docs/security/FINANCIAL_CONTAINMENT_RUNBOOK.md`
- `docs/security/PHASE_2E_LEGACY_ISOLATION.md`
- `docs/security/PHASE_2E_PRECHECK.md`
- `docs/security/PHASE_2E_IMPLEMENTATION_REPORT.md`
- `docs/security/PHASE_2C_ENDPOINT_INVENTORY.md`
- `docs/security/PHASE_2C_PAYMENT_ENDPOINT_AUDIT.md`
- `docs/security/PHASE_2C_WEBHOOK_REVIEW.md`
- `docs/security/PHASE_2B_PAYMENT_CREATION_AUDIT.md`
- `docs/security/PHASE_2B_WEBHOOK_AUDIT.md`
- `docs/security/PHASE_2D_DEPENDENCY_RISK_MATRIX.md`
- `docs/security/PHASE_2F_PAYOUT_ELIGIBILITY.md`

---

**Fin del documento.** El legacy no debe describirse como aislado hasta cumplir los criterios de aceptación.
