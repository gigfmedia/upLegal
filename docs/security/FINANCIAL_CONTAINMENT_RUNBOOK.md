# Financial Containment Runbook — LegalUp

**Clasificación:** interno y confidencial  
**Fecha:** 26 de noviembre de 2026  
**Versión:** 1.0-draft para revisión  
**Alcance:** contención, reconciliación y habilitación controlada de payouts  
**Modo:** procedimiento documentado. **No ejecutar desde este documento sin autorización expresa.**

---

## 1. Propósito

Evitar que pagos no confirmados, pagos históricos no reconciliados o llamadas no autorizadas se conviertan en transferencias reales.

Este runbook cubre:

- verificación del estado de contención;
- preservación de evidencia;
- reconciliación con Mercado Pago;
- criterios de elegibilidad;
- secuencia de habilitación de payouts;
- criterios GO/NO-GO;
- rollback y respuesta a incidentes.

No reemplaza la revisión legal, contable ni de Mercado Pago.

---

## 2. Regla de oro

**No reactivar el cron, no desplegar el Edge endurecido y no aplicar la migración de elegibilidad de Fase 2F hasta completar preflight, respaldo, reconciliación y autorización registrada.**

Orden correcto (D-009):

**evidencia mínima → contención → reconciliación → migración Fase 2F → verificación → despliegue del Edge → prueba controlada → reactivación autorizada**

Nunca al revés.

**Excepción de riesgo inminente:** si esperar para preservar evidencia aumenta el daño, contener primero. Documentar de inmediato la evidencia no preservada, el motivo y las acciones realizadas; después, completar la preservación posible.

---

## 3. Estado de partida

**Estado confirmado por instrucción para Fase 2E, Fase 2F y cron; el resto según evidencia documental. Confirmar cada fila en el preflight antes de operar.**

| Elemento | Estado actual | Implicancia operativa |
|---|---|---|
| Cron `weekly-payouts` | **Suspendido** | No reactivar, eliminar ni modificar sin autorización |
| Edge `process-weekly-payouts` | v27 desplegada; incompatible con el código local | No desplegar el endurecido todavía |
| Migración Fase 2E | **Aplicada en producción**; SHA `2f0418020ca44d59402f801d8e59a761a853f02937ee7e3d3aaf88b0b9923d2d`; versión remota `20261124183450`; commit `8f79b20` | No reaplicar; verificación de solo lectura de privilegios efectivos pendiente |
| Migración Fase 2F | **Versionada y pusheada, no aplicada** | Bloqueantes 2F-a/2F-b; no existen columnas/triggers de elegibilidad en producción |
| Trigger manual `/api/admin/trigger-payout` | Roto (401) | No usar ni rodear el control |
| Webhook Edge de cotizaciones | Sin firma | No usar como fuente de verdad |
| `payout_logs` | 0 en snapshot histórico | **No** prueba ausencia de pagos |
| Pago real histórico | No conciliado | No marcarlo como elegible ni pagarlo |
| Staging | No disponible | Toda migración es de alto riesgo |

**Bloqueantes de Fase 2F:** 2F-a, un evento `success` de cliente puede ocupar el índice único antes del webhook y el `23505` puede tratarse como duplicado benigno sin canonicalizar ni completar la elegibilidad; 2F-b, `service_role` puede marcar `payout_eligible=true` en un pago `succeeded` sin evidencia de `payment_event` canónico. Fase 2F no está lista para producción.

**Advertencia:** si el cron se suspendió con `alter_job`, el comando y el secreto embebido pueden permanecer. Verificar y rotar por separado; no borrar el job sin preservar evidencia.

---

## 4. Roles y autoridad

| Rol | Responsabilidad |
|---|---|
| Incident Commander | Coordina, decide GO/NO-GO y registra autorizaciones |
| DB Operator | Ejecuta migraciones y verificaciones aprobadas |
| Payments Operator | Reconciliación Mercado Pago y payouts |
| Verifier | Revisa evidencia, montos, moneda, estados e idempotencia |
| Legal/Comms | Decide notificaciones y comunicación externa |

Reglas:

- Doble control para cualquier acción que pueda mover dinero.
- Ninguna persona debe autorizar y ejecutar sola un payout.
- Las credenciales de `service_role`, Mercado Pago y cron no se comparten por chat ni se incluyen en documentos.
- Toda acción debe quedar en el registro de evidencia.

---

## 5. Preflight obligatorio

No avanzar si falta cualquier elemento.

| # | Verificación | Evidencia esperada | Responsable |
|---|---|---|---|
| 1 | Confirmar rama y commit | Rama de trabajo y HEAD registrados | DB Operator |
| 2 | Confirmar estado del cron | Job identificado; `active=false` o ausencia justificada | DB Operator |
| 3 | Confirmar estado de migraciones | Fase 2E aplicada con SHA/registro remoto; Fase 2F ausente; solo lectura | DB Operator |
| 4 | Confirmar versión del Edge | Versión desplegada y fuente revisada | Payments Operator |
| 5 | Respaldar esquema y datos | Snapshot cifrado de pagos, eventos, payouts, bookings y cron | DB Operator |
| 6 | Preservar logs | Ventana disponible, hash y cadena de custodia | Incident Commander |
| 7 | Reconciliar Mercado Pago | Extracto/consulta de liquidaciones y pagos | Payments Operator |
| 8 | Verificar cuenta MP | Cuenta correcta, saldo, transferencias recientes | Payments Operator |
| 9 | Definir ventana | Fecha, hora, duración, responsables y rollback | Incident Commander |
| 10 | Autorización registrada | Aprobación explícita para cada acción | Founder/Ops |

**No hacer:**

- no ejecutar `cron.unschedule` ni borrar el job;
- no ejecutar `update` o `delete` sobre pagos, eventos o payouts;
- no aplicar la migración “para probar”;
- no desplegar el Edge para “ver si funciona”;
- no usar el trigger manual;
- no transferir dinero para “validar”.

---

## 6. Preservación de evidencia

Conforme a D-009, antes de cambiar cualquier control se debe preservar la evidencia mínima disponible:

1. Exportar a un lugar cifrado y con acceso restringido:
   - `payments`
   - `payment_events`
   - `payout_logs`
   - `service_quote_requests`
   - `bookings`
   - `mercadopago_accounts` (sin imprimir tokens)
   - `cron.job` (redactar secretos)
   - `cron.job_run_details`
   - logs disponibles de Supabase, Render y Mercado Pago
2. Calcular hash SHA-256 de cada export.
3. Registrar quién exportó, cuándo, desde dónde y con qué autorización.
4. No incluir tokens, payloads legales, PII ni datos de tarjeta en el reporte.
5. No borrar filas ni “limpiar” datos para facilitar el análisis.

**Excepción de riesgo inminente:** si esperar aumenta el daño, contener primero y documentar de inmediato la evidencia no preservada, el motivo y las acciones realizadas. Después, completar la preservación posible.

**Nota:** los logs de plataforma pueden tener retención corta; preservar primero la ventana disponible.

---

## 7. Contención

Cada acción requiere autorización y verificación. No ejecutar en paralelo sin coordinación.

| Orden | Acción | Autorización | Verificación | Rollback |
|---|---|---|---|---|
| 1 | Preservar evidencia | Incident Commander | Hash y registro | N/A |
| 2 | Confirmar cron inactivo | Founder | Job sin ejecución activa | No aplica |
| 3 | Verificar privilegios efectivos de RPC financieras (Fase 2E aplicada; solo lectura) | Founder + DB | Clientes sin EXECUTE; servidor con `service_role` | No aplica; escalar discrepancia |
| 4 | Bloquear `/create-payment` legacy | Founder + Ops | Retry redirigido o bloqueado | Reabrir ruta |
| 5 | Retirar o bloquear Netlify legacy | Ops | Sin llamadas vivas | Redeploy |
| 6 | Deshabilitar Edge sin firma / PII | Founder + Ops | Webhook canónico sigue operativo | Redeploy |
| 7 | Rotar secretos expuestos | Founder + Ops | Nuevos secretos activos; viejos revocados | Irreversible |
| 8 | Reconciliar pagos | Payments Operator | Cada pago clasificado | N/A |
| 9 | Cerrar 2F-a/2F-b y aplicar migración de elegibilidad | Founder + DB | Bloqueantes cerrados; columnas/triggers/guardia/cola en 0 | Rollback documentado |
| 10 | Desplegar Edge endurecido | Founder + Ops | Versión y health check | Revertir Edge |
| 11 | Prueba controlada | Founder + Payments | Pago autorizado, monto mínimo, trazabilidad | Revertir y contener |
| 12 | Reactivar cron | Founder | Job activo, monitoreo y límites | Suspender de nuevo |

**Prioridad si no hay ventana para todo:** 1, 2, 3, 4 y 6. La verificación 3 confirma el corte ya aplicado por Fase 2E; 1, 2, 4 y 6 reducen la superficie restante.

**No bloquear a ciegas:** `PaymentFailure` y `ContactModal` todavía pueden depender de rutas legacy. Bloquear antes de migrar rompe reintentos o cobros de contacto. Ver `LEGACY_PAYMENT_ISOLATION.md`.

---

## 8. Reconciliación con Mercado Pago

### 8.1 Objetivo

Determinar, pago por pago:

- si existe en Mercado Pago;
- si el monto y la moneda coinciden;
- si está aprobado, pendiente, rechazado, reembolsado o en disputa;
- si tiene `payment_gateway_id` y referencia externa trazable;
- si ya fue transferido;
- si existe en la base de datos;
- si es elegible para payout.

### 8.2 Clasificación obligatoria

| Clase | Definición | Acción |
|---|---|---|
| **Confirmado canónico** | Pago aprobado en MP, monto/moneda CLP correctos, gateway ID y evidencia de webhook firmado | Candidato a elegibilidad, sujeto a migración y verificación |
| **Aprobado sin evidencia local** | Existe en MP, pero falta gateway/evento/booking en base | No elegible; investigar y reconciliar |
| **Local succeeded sin gateway** | Base dice `succeeded`, pero no hay gateway ID ni evidencia MP | No elegible; tratar como inconsistencia |
| **Pendiente** | MP o base en estado pendiente | No elegible |
| **Rechazado/reembolsado/disputa** | Estado terminal o disputa | No elegible; revisar impacto |
| **Duplicado** | Varias filas para el mismo pago/booking | No elegible; resolver antes de pagar |
| **Huérfano** | Sin booking, usuario o referencia válida | No elegible; escalar |
| **Transferencia manual** | Transferencia fuera del flujo canónico | No elegible; preservar comprobante y escalar |
| **Desconocido** | Evidencia insuficiente | No elegible; NO-GO |

### 8.3 Reglas

- No crear pagos `succeeded` manualmente para “cuadrar” la base.
- No hacer backfill de `payment_gateway_id`, `confirmed_at`, `confirmation_source` ni `payout_eligible` sin evidencia de MP y aprobación separada.
- No usar `payout_logs=0` como prueba de que no hubo transferencias.
- No revertir transferencias sin autorización legal/ops.
- No pagar un pago clasificado como desconocido, duplicado, huérfano o manual.
- Documentar cada caso con evidencia redactada, sin exponer PII ni tokens.

---

## 9. Criterios de elegibilidad

Después de aplicar Fase 2F, un pago solo puede ser elegible si cumple **todas** las condiciones:

- `status='succeeded'`;
- `confirmed_at` no nulo;
- `confirmation_source='mercadopago_webhook'`;
- `payment_gateway_id` no nulo y no vacío;
- `currency='CLP'`;
- `lawyer_id` no nulo;
- `lawyer_amount > 0`;
- `amount > 0`;
- evidencia canónica exclusiva de `payment_events.success` con `source=webhook`, insertado por `service_role`; no se aceptan `completed` ni otros eventos como equivalentes;
- reconciliación con Mercado Pago completada.

**No habilitado:** los bloqueantes 2F-a y 2F-b siguen abiertos; esta lista describe el objetivo posterior al cierre, no el estado actual.

**No elegible por defecto:**

- pagos históricos;
- pagos con moneda distinta de CLP;
- pagos sin gateway;
- pagos sin evento canónico;
- pagos con `booking_id` vacío;
- pagos con `lawyer_amount` o `platform_fee` nulos;
- pagos con transferencia manual;
- pagos duplicados o huérfanos.

---

## 10. Secuencia de habilitación de payouts

**Procedimiento futuro condicionado a autorización. No implica que Fase 2F esté aplicada ni que el Edge pueda desplegarse actualmente.**

1. **Fase 2E aplicada; verificación de solo lectura completada:** RPC financieras sin EXECUTE para `PUBLIC`, `anon` y `authenticated`; `service_role` conserva acceso.
2. **Reconciliación cerrada y verificaciones previas completadas:** todos los pagos históricos clasificados; ningún pago desconocido en la cola; evidencia preservada.
3. **Bloqueantes 2F-a/2F-b cerrados.**
4. **Fase 2F aplicada y verificada:** columnas, constraint, triggers e índice presentes; históricos con `payout_eligible=false`; cola elegible en 0.
5. **Edge endurecido desplegado:** solo después de aplicar y validar la migración; versión revisada, health check y logs sin secretos.
6. **Prueba controlada:** pago autorizado, monto mínimo, beneficiario de prueba, trazabilidad completa.
7. **Monitoreo:** alertas de error, transferencias duplicadas, pagos no elegibles y diferencias de saldo.
8. **Reactivación del cron:** solo con aprobación de Founder, ventana definida y rollback listo.
9. **Revisión post-ejecución:** conciliar transferencias, actualizar `payout_logs`, cerrar evidencia.

**Regla:** si cualquier paso falla, detenerse. No “compensar” con un payout manual.

---

## 11. GO/NO-GO

| Criterio | GO | NO-GO |
|---|---|---|
| Cron | Inactivo y verificado | Activo, modificado o estado desconocido |
| Fase 2E | Aplicada; privilegios efectivos verificados (solo lectura) | No verificada |
| Bloqueantes 2F-a/2F-b | Cerrados | Abiertos |
| Fase 2F | Aplicada y verificada | No aplicada o con históricos elegibles |
| Edge | Versión revisada y compatible | v27 o fuente desconocida |
| Cola elegible | 0 antes de prueba | >0 sin reconciliar |
| Pago real histórico | Reconciliado | No conciliado |
| `payout_logs` | Conciliado con MP | 0 usado como prueba |
| Staging | Pruebas realizadas | Sin staging y sin prueba controlada |
| Secretos | Rotados y fuera de documentos | Secretos embebidos o expuestos |
| Autorización | Registrada y doble control | Verbal, ambigua o inexistente |

**Cualquier NO-GO detiene la habilitación.**

---

## 12. Rollback

| Acción | Rollback |
|---|---|
| Suspensión del cron | Mantener inactivo; no reactivar hasta nuevo GO |
| Verificación/corrección de privilegios RPC (Fase 2E) | No reaplicar Fase 2E; escalar y corregir solo con autorización |
| Bloqueo legacy | Reabrir ruta solo con autorización y evidencia de necesidad |
| Deshabilitación de Edge | Redeploy de la versión anterior solo si es segura; no restaurar webhook sin firma |
| Migración Fase 2F | Revertir Edge primero; mantener cron inactivo; luego rollback de columnas/triggers |
| Rotación de secretos | No reversible; actualizar consumidores y verificar |
| Transferencia errónea | Detener, preservar evidencia, escalar a legal/ops; no revertir sin autorización |

**Nunca** revertir columnas mientras el Edge desplegado las consulta.

---

## 13. Respuesta a incidente financiero

Conforme a D-002/D-009, si se detecta o sospecha una transferencia no autorizada:

1. Preservar la evidencia mínima disponible: pagos, eventos, payouts, logs, extractos MP y estado del cron.
2. **Excepción de riesgo inminente:** si esperar aumenta el daño, contener primero; documentar de inmediato la evidencia no preservada, el motivo y las acciones realizadas. Después, completar la preservación posible.
3. Confirmar que el cron permanece suspendido. Si estuviera activo, suspenderlo solo como contención urgente bajo la excepción del paso 2. No reactivarlo ni eliminarlo; cualquier otra modificación requiere autorización.
4. Revocar credenciales comprometidas y verificar/ajustar privilegios RPC.
5. Deshabilitar Edge de payout y webhooks no firmados.
6. No borrar filas ni “corregir” estados.
7. Escalar a Founder, legal y Payments Operator.
8. Reconciliar cuenta MP y transferencias.
9. Evaluar notificación a Mercado Pago, clientes y autoridad según corresponda.
10. Documentar decisión y evidencia.
11. No reactivar ni eliminar el cron hasta completar revisión y autorización.

---

## 14. Verificación de solo lectura

Ejecutar solo con autorización y en el entorno correcto. No usar para modificar datos.

```sql
-- Estado del cron
select jobid, jobname, schedule, active
from cron.job
where jobname = 'weekly-payouts';

-- Privilegios efectivos de RPC (solo lectura; Fase 2E ya aplicada)
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_payment_secure',
    'update_payment_gateway_id',
    'claim_pro_founder_slot',
    'reserve_pro_founder_slot',
    'reconcile_pro_founders',
    'get_company_metrics'
  )
order by p.proname;

-- Conteos de control
select 'payments' as tabla, count(*) from public.payments
union all
select 'payment_events', count(*) from public.payment_events
union all
select 'payout_logs', count(*) from public.payout_logs
union all
select 'service_quote_requests', count(*) from public.service_quote_requests;

-- Cola candidata histórica (solo lectura)
select count(*) as candidatos
from public.payments
where status = 'succeeded'
  and payout_status = 'pending';
```

Resultado esperado de privilegios: `anon_execute=false` en las seis; `authenticated_execute=false` salvo `get_company_metrics`; `service_role_execute=true` en todas. Cualquier discrepancia es NO-GO.

Después de Fase 2F, agregar la verificación de elegibilidad:

```sql
select count(*) as elegibles
from public.payments
where status = 'succeeded'
  and payout_status = 'pending'
  and payout_eligible;
```

Resultado esperado antes de cualquier prueba: **0**.

**No ejecutar** `update`, `delete`, `cron.unschedule`, `cron.alter_job` ni transferencias desde este documento.

---

## 15. Registro de evidencia

Cada acción debe registrar:

- fecha y hora;
- operador y autorizador;
- entorno;
- acción ejecutada;
- estado anterior y posterior;
- consulta o evidencia usada;
- hash de export;
- rollback disponible;
- incidente/observación.

Sin registro no hay GO.

---

## 16. Limitaciones

- No hay staging.
- No se verificó producción en vivo durante la redacción.
- No se ejecutaron tests ni SQL.
- Fase 2E está aplicada según el registro autorizado; los privilegios efectivos no se verificaron en esta consolidación.
- Fase 2F no está aplicada y mantiene abiertos los bloqueantes 2F-a/2F-b.
- La migración Fase 2F no se probó contra una copia real de producción.
- La RLS de `payment_events` sigue permisiva.
- El webhook no fue modificado.
- El pago real histórico sigue sin conciliación completa.
- La cuenta Mercado Pago no fue auditada en esta consolidación.

---

## 17. Referencias

- `docs/security/SECURITY_DECISION_RECORD.md`
- `docs/security/PHASE_2E_PAYOUT_CONTAINMENT.md`
- `docs/security/PHASE_2E_IMPLEMENTATION_REPORT.md`
- `docs/security/PHASE_2F_PAYOUT_ELIGIBILITY.md`
- `docs/security/PHASE_2C_EMERGENCY_CONTAINMENT.md`
- `docs/security/PHASE_2D_REAL_PAYMENT_RECONCILIATION.md`
- `docs/security/PHASE_2D_SELECTIVE_CONTAINMENT_PLAN.md`
- `docs/security/PHASE_2B_PAYOUT_CRON_ASSESSMENT.md`
- `supabase/migrations/20261125120000_phase2f_payout_eligibility.sql`

---

**Fin del runbook.** No ejecutar acciones destructivas sin autorización y evidencia.
