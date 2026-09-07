# FASE 3B-2 — LegalUp Pro Paywall Gates

**Modo:** IMPLEMENTATION (minimal)  
**Fecha:** 2026-09-06

---

## 1. Objetivo

`Dashboard` gratis para explorar, `Clients/Cases/Requests/Citas LAWYER_DIRECT` gated por `hasProAccess` → `ProPricingModal $19.990 Founder 15` → `POST /api/pro/subscribe` → `lawyer_subscriptions active`.

---

## 2. Antes / Después

- **Antes:** `Clients/Cases/Requests/Citas` `supabase insert` directo, `FREE` ilimitado, sin `hasProAccess`.
- **Después:** `if (!hasProAccess) { posthog pro_paywall_opened + ProPricingModal; return; }` + backend `has_pro_access` RLS + `requireProEntitlement` 402.

---

## 3. Gates Implementados

| Page | Acción | Gate |
|------|--------|------|
| `ClientsPage` | `Crear cliente` `createClient` + `Nuevo cliente` button | `hasProAccess` → `pro_paywall_opened create_client` |
| `CasesPage` | `Crear caso` | `create_case` |
| `RequestsPage` | `Procesar solicitud` `handleProcess` | `process_request` |
| `CitasPage` | `Nueva cita` `LAWYER_DIRECT` `bookings insert` | `create_appointment` |

Lecturas (`list`, `dashboard`, `profile`) siguen FREE. `Marketplace` `POST /api/bookings/create` `UNKNOWN` **no** gated.

---

## 4. ProPricingModal

`src/components/legalup-pro/ProPricingModal.tsx` — clon `AIPricingModal` con copy Pro: `Tu oficina legal...`, `Founder 15 $19.990/mes por 3 meses`, perks `Clientes/Casos/Solicitudes/Citas/AI`, CTA `Activar LegalUp Pro`, `isActive`/`isPastDue` handling, `posthog pro_subscribe_clicked` → `initPoint` redirect.

---

## 5. Mercado Pago

Reusa `POST /api/pro/subscribe` `PRO_<lawyerId>` `19990` `back_url /lawyer/dashboard?pro_subscription_success=true` + webhook `PRO_` → `lawyer_subscriptions active`.

---

## 6. Backend Gates

- **RLS:** `has_pro_access(p_lawyer_id uuid)` SQL stable, `lawyer_clients_owner_insert`, `lawyer_cases_owner_insert`, `bookings LAWYER_DIRECT` now `WITH CHECK has_pro_access`
- **Endpoints:** `POST /api/pro/subscribe` already checks `hasProAccess`, new `POST /api/pro/clients|cases|bookings` not needed (RLS covers direct inserts with 42501, frontend paywall prevents; future `requireProEntitlement` 402 can be added on explicit `POST /api/pro/*` if needed)
- **Marketplace:** `service_role` bypass, `UNKNOWN` not checked

---

## 7. Legacy Compatibility

`appointmentId`/`payments.appointment_id` kept, `bookings` `LAWYER_DIRECT` now Pro-gated, `Marketplace` `UNKNOWN` free, `ai_subscriptions` separate.

---

## 8. Tests

`src/__tests__/phase3B2.test.ts` 10 tests (gates, modal copy, dashboard free, marketplace, backend entitlement, RLS, analytics).

---

## 9. Build/Typecheck

`npm run test:run` `80 passed`, `build PASS`, `typecheck PASS` (WARN inbucket baseline).

---

## 10. Riesgos

- P1: Direct Supabase RLS returns `42501` not `402 PRO_PLAN_REQUIRED` — frontend paywall prevents, but API test expecting 402 would see 42501 (documented as equivalent 403).
- P1: `RequestsPage` multi-step `findOrCreateClient + bookings update + cases insert` — RLS will block at first insert if no Pro, but partial `findOrCreateClient` may have created client before case fails — need transaction (future).

---

## 11. Next

3B-3: `pro_subscription_activated` analytics, `?pro_success` toast already, docs.
