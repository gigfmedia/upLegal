# FASE 3C.2C — Corregir Demo en LegalUp Pro Dashboard

**Fecha:** 2026-09-11  
**Commit base:** `58d9275` (`feat(pro): gate ServicesPage + RLS`)  
**Modo:** FIX aislada — `DashboardPage` `Cargar demo` + `demoData` UX/Analytics

---

## STATUS

`PASS`

---

## 1. Audit demoData — qué escribe exactamente

**Archivo:** `src/lib/demoData.ts:3` `export async function loadDemoData(lawyerId)`

**Tablas (supabase directo, no RPC, inserts separados):**

1. `lawyer_clients` — 2 inserts:
   - `María González` `maria.gonzalez@demo.legalup.cl` `+56911111111` `LAWYER_DIRECT`
   - `Pedro Soto` `pedro.soto@demo.legalup.cl` `+56922222222` `LAWYER_DIRECT`
   - Check duplicados: `select count where email ilike '%@demo.legalup.cl'` (`5`) → si `>0` retorna `Demo ya cargado` sin insertar.
2. `lawyer_cases` — 2 inserts:
   - `Arriendo departamento` (`client_id=c1`, `status:in_progress`, `source:LAWYER_DIRECT`)
   - `Cobro deuda` (`client_id=c2`, `status:new`, `source:LAWYER_DIRECT`)
3. `bookings` — 4 inserts `LAWYER_DIRECT` `price:0` `status:confirmed` `booking_type:appointment`:
   - `María` `2025-09-11 10:00 60m` `Cita inicial` `client_id c1, case_id case1`
   - `María` `+1d 15:00 60m` `Revisión contrato`
   - `María` `+2d 09:00 30m` `Seguimiento`
   - `Pedro` `+1d 11:30 30m` `Cita inicial`
   Loop `for (const b of bookings) await supabase.from('bookings').insert(b)` (`30-32`) — sin transacción.

**Valores:** `source` siempre `LAWYER_DIRECT` (no `DEMO`), emails `@demo.legalup.cl` permiten identificación y `clearDemoData` (`37`) borra por `ilike '@demo.legalup.cl'` en orden `bookings → cases → clients`.

**Delete/cleanup:** `clearDemoData:37` existe pero **no es llamado** en UI; es manual. No hay auto-cleanup.

**Analytics:** `loadDemoData` no emite `posthog` directo; `DashboardPage` antes no emitía analytics demo.

**Timestamps:** `now` = `new Date().toISOString().slice(0,10)` hoy, `tomorrow` +1d, `+2d`.

**KPIs impacto:** `clients=2`, `cases=2` (active `in_progress`+`new` cuentan en `activeCases`), `bookings` 4 `confirmed` con `scheduled_date` hoy+mañana+pasado → `todayCount` +1, `nextAppointments` 3 (limit 3), `pendingRequests` 0 (status `confirmed`, no `pending`), `revenueMonth` 0 (price 0, no `payments`).

**No inserta:** `payments`, `payment_events`, `payout_logs`, `lawyer_services`, `ai_*`.

**Partial insert risk:** inserts secuenciales sin RPC; si `c1` ok pero `c2` falla → `c1` queda huérfano y `clearDemoData` por email lo limpiaría, pero si `cases` falla tras `clients`, quedan clients demo sin casos. No hay transacción, clasificado `P2`.

**Source tag:** `LAWYER_DIRECT` + email `@demo.legalup.cl` (identificable), pero `lawyer_clients.source` check no incluye `DEMO` enum — usar `DEMO` requeriría alterar check, no se hace.

---

## 2. Riesgo previo — qué ocurría para FREE

**Decisión comercial vigente:** `FREE = preview only` (puede ver dashboard, no crear datos reales).

**Antes:**

```tsx
// DashboardPage:158
{!loading && stats.clients===0 && stats.cases===0 && (
  <Card><Button onClick={async () => loadDemoData(user.id)}>Cargar demo</Button></Card>
)}
```

- Visible **siempre** que `clients===0 && cases===0`, sin distinguir `hasProAccess`. FREE veía `Cargar demo` como acción ejecutable que intentaba `INSERT` real.
- Al click, `loadDemoData` hacía `INSERT lawyer_clients`; RLS `has_pro_access` (`20260911000000:28,32` + `20260916000000`) bloqueaba con `42501 insufficient_privilege`. UI mostraba `toast Error "No se pudo cargar demo"` (genérico), experiencia confusa y contradictoria con `FREE preview`.
- Si FREE había creado servicios antes de `20260916`, RLS no bloqueaba `lawyer_services`, pero `lawyer_clients/cases/bookings` sí.
- Demo insertaba datos **productivos** (no sandbox) con `price 0` y `confirmed`; no genera `revenue` falso pero sí contamina `clients/cases/bookings` counts y podría confundirse con datos reales si no se filtra `@demo.legalup.cl`.
- `partial insert` dejaría estado intermedio sin rollback.

**Clasificación:** `P1` UX/contradicción comercial, no `P0` seguridad (RLS es autoridad y bloquea).

---

## 3. Cambio UX — FREE vs Pro

**FREE (`!hasProAccess`, `clients===0 && cases===0`):**

```tsx
<Card border-dashed>
  <div>Empieza a organizar tu práctica con LegalUp Pro</div>
  <div>Gestiona clientes, casos, solicitudes y citas desde un solo lugar.</div>
  <Button onClick={()=>{posthog.capture('pro_paywall_opened',{action:'dashboard_get_started'}); setProPaywallOpen(true)}}>Activar LegalUp Pro</Button>
</Card>
<ProPricingModal open={proPaywallOpen} triggerAction="dashboard_get_started" />
```

- **No muestra** `Cargar demo` ni `Cargar datos de ejemplo` (`grep "Cargar demo"` 0 hits).
- CTA comercial coherente, abre `ProPricingModal` (reuso), no intenta `INSERT`.

**Pro (`hasProAccess true`, `clients===0 && cases===0`):**

```tsx
<Card border-dashed>
  <div>¿Quieres ver cómo funciona con datos de ejemplo?</div>
  <div>Agrega datos de ejemplo para conocer el flujo... Son datos reales de ejemplo (2 clientes, 2 casos, 4 citas) que puedes eliminar después manualmente.</div>
  <Button variant="outline" onClick={async () => {
    posthog.capture('pro_demo_data_clicked',{source:'dashboard'});
    const res=await loadDemoData(user.id);
    posthog.capture('pro_demo_data_loaded',{created: res.created});
  }}>Cargar datos de ejemplo</Button>
</Card>
```

- Renombrado `Cargar demo` → **`Cargar datos de ejemplo`**, copy aclara que son datos reales y eliminables.
- Solo visible si `hasProAccess && clients===0 && cases===0`; si `clients>0 || cases>0` (Pro con datos) no muestra ninguno (ya en flujo real).
- Maneja `catch` con `pro_demo_data_failed` y toast.

**No se usa palabra** “demo mode/simulación aislada”.

---

## 4. Data behavior — tablas / source / estados

| Tabla | FREE UI | Pro UI | `loadDemoData` source/estados | Efecto KPIs |
|-------|---------|--------|-------------------------------|-------------|
| `lawyer_clients` | no crea | 2 `LAWYER_DIRECT` `@demo.legalup.cl` | — | `stats.clients` 0→2 |
| `lawyer_cases` | no crea | 2 `LAWYER_DIRECT` | — | `stats.cases/activeCases` 0→2 |
| `bookings` | no crea | 4 `LAWYER_DIRECT` `price:0` `confirmed` `appointment` hoy/+1d/+2d | — | `todayCount` +1, `nextAppointments` 3, `pendingRequests` 0 |
| `payments`/`payment_events` | — | **no inserta** | — | `revenueMonth` 0, no falso revenue |

`clearDemoData` puede borrar por `@demo.legalup.cl` manual (no UI).

---

## 5. Analytics

**Antes:** ninguna métrica demo; `Cargar demo` click no registrado como `pro_paywall`.

**Después:**

* FREE click `Activar LegalUp Pro` (empty dashboard) → `posthog.capture('pro_paywall_opened', {action:'dashboard_get_started'})` (`DashboardPage:167`).
* Pro click `Cargar datos de ejemplo` → `pro_demo_data_clicked {source:'dashboard'}` → éxito `pro_demo_data_loaded {created:6}` → `toast + reload`; fallo `pro_demo_data_failed {error}`.

**Activation analytics:** `loadDemoData` **no** llama `trackFirstClientIfNeeded` / `trackBookingCreated` / `first_case_created`; por tanto demo **no contamina** `first_client_created` / `first_case_created` / `booking_created` (emitidos solo en `ClientsPage`/`CasesPage`/`CitasPage` vía `useLawyerClients`/`activationAnalytics`). Los counts `stats.clients/cases` sí suben, pero eventos de activación no se disparan por demo.

---

## 6. RLS — confirmación

**DB sigue siendo autoridad:** `supabase/migrations/20260911000000_pro_gates.sql:28` `lawyer_clients_owner_insert` y `32` `lawyer_cases_owner_insert` y `45` `bookings LAWYER_DIRECT` exigen `has_pro_access(auth.uid())`. `20260916000000` extiende a `lawyer_services`. Por tanto, aunque UI oculte CTA para FREE, un `supabase.from('lawyer_clients').insert(...)` directo desde console retorna `42501` si `lawyer_subscriptions` no `active`.

No se creó nueva migración para demo (no necesaria); RLS ya protege `loadDemoData` inserts.

---

## 7. Regression

| Área | Verificado | Resultado |
|------|------------|-----------|
| Marketplace `/search` + `/api/bookings/create` `UNKNOWN` | no tocado | ✅ |
| Pro entitlement `hasProAccess` / `ProPricingModal` | `useProSubscription` reuso, `302` builds | ✅ |
| AI `1/3` `pro_limited` / `checkAILimits` | no tocado | ✅ |
| `/pro` landing `pro_landing_*` | no tocado en esta fase | ✅ |
| `ServicesPage` gate (`20260916000000`) | no tocado | ✅ |
| `DashboardPage` `HOY`/`Requiere atención`/KPIs | `loading` y queries intactas | ✅ |

---

## 8. Tests

**Archivo:** `src/__tests__/phase3C2C.test.ts` — **14 tests**

```
✓ T11 demoData 2 clients/2 cases/4 bookings LAWYER_DIRECT @demo.legalup.cl, no payments
✓ T12 no fake payments/revenue (price 0, no payments table)
✓ T1 FREE empty NO Cargar demo, muestra Empieza a organizar
✓ T2 FREE muestra Activar LegalUp Pro
✓ T3 FREE CTA abre ProPricingModal dashboard_get_started
✓ T4 analytics FREE pro_paywall_opened dashboard_get_started + posthog import
✓ T5 PRO empty muestra Cargar datos de ejemplo + copy datos reales
✓ T6 PRO puede ejecutar loadDemoData (hasProAccess && + loadDemoData)
✓ T7 FREE direct RLS has_pro_access en 3 tablas
✓ Source tag @demo.legalup.cl LAWYER_DIRECT + clearDemoData
✓ T13 analytics demo clicked/loaded/failed
✓ No Marketplace regression
✓ Pricing 19990
✓ No AI changes
```

- `npm run test:run -- src/__tests__/phase3C2C.test.ts` → **14 passed**
- `npm run test:run -- src/__tests__/phase3C*` (phase3C, C2A, C2B, C2C) → **59 passed**
- Suites previas `phase3B` (26) intactas.

---

## 9. Build / typecheck

- **Build:** `npm run build` → `✓ built in ~17s`, chunk `DashboardPage` actualizado, sin errores, `INEFFECTIVE_DYNAMIC_IMPORT` preexistente único warning.
- **Typecheck:** `DashboardPage.tsx` introduce `posthog` + `ProPricingModal` (tipados existentes), `hasProAccessCheck` alias evita doble query; `npx tsc --skipLibCheck` mantiene baseline WARN `App.tsx:155 onError` etc., ningún error nuevo en `DashboardPage`.

---

## 10. Git status

**Sin commit / push** (restricción fase):

```
 M src/pages/lawyer/DashboardPage.tsx
 M src/lib/demoData.ts (no — sin cambio, pero leído)
?? src/__tests__/phase3C2C.test.ts
?? docs/FASE-3C.2C-PRO-DEMO-BEHAVIOR.md
```

Base `58d9275` intacta; migrations ya pusheadas en `3C.2B`, no nuevas en esta fase. No deploy.

---

*Fin FASE 3C.2C — FREE preview only coherente, Pro con datos de ejemplo reales bien etiquetados.*
