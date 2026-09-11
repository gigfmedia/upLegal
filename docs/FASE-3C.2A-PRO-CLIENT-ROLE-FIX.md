# FASE 3C.2A — Fix rol cliente en `/pro`

**Fecha:** 2026-09-11  
**Commit base:** `69bff52`  
**Modo:** FIX aislada — CTA / copy / navegación / analytics cliente

---

## STATUS

`PASS`

---

## 1. Root cause

**Archivo/línea:** `src/pages/LegalUpPro.tsx:92,125-167,202-230,236-250`

- `userRole` se deriva correctamente (`user_metadata.role || user.role || profile.role`), pero el `else` del header desktop (`229`) resolvía cualquier rol no-`lawyer`/`!hasProAccess` como:

  ```tsx
  <Button onClick={() => navigate(userRole === "client" ? "/dashboard" : "/lawyer/dashboard")}>Ir al panel</Button>
  ```

  Para `role=client` navegaba a `/dashboard` (dashboard cliente) y contaba como conversión Pro.
- `handleCTAClick` (`160-167` antes) tenía rama `client → /dashboard` (mismo problema) y emitía `pro_landing_cta_clicked` también para clientes, contaminando funnel.
- Header móvil (`248`) usaba texto genérico `Continuar` para cualquier autenticado, sin distinguir cliente.
- No existía bloque visible explicando que `LegalUp Pro es para abogados`.

**Severidad audit:** P1 conversión (no P0 seguridad — `POST /api/pro/subscribe` ya rechaza cliente con `403 NOT_LAWYER:8233`).

---

## 2. Cambio

**Archivo único modificado:** `src/pages/LegalUpPro.tsx` (3 áreas)

### a) `handleCTAClick` — early return cliente antes de `pro_landing_cta_clicked`

```tsx
if (userRole === "client") {
  posthog.capture("pro_landing_client_excluded", {
    location, authenticated:true, role:"client", path, utm_source, utm_medium, utm_campaign
  });
  navigate("/search");
  return;
}
// luego sí pro_landing_cta_clicked para el resto
...
if (!user) → AuthModal
if (isLawyer && hasProAccess) → /lawyer/dashboard
if (isLawyer) → ProPricingModal
else (company/admin/unknown) → "/"
```

- Elimina rama `client → /dashboard` y fallback `lawyer/dashboard`.
- No abre `ProPricingModal` ni dispara `pro_landing_cta_clicked` para cliente.

### b) Header desktop (`214-231`)

```tsx
!user ? (Iniciar + Comenzar)
: userRole==="client" ? (<Button onClick={()=>handleCTAClick("header")}>Buscar abogado</Button>)
: pro.hasProAccess ? (Ir al dashboard → /lawyer/dashboard)
: userRole==="lawyer" ? (Activar Pro → ProPricingModal)
: (Volver a LegalUp → "/")
```

- Elimina `Ir al panel`, reemplaza por `Buscar abogado` (client) y `Volver a LegalUp` (otros roles).

### c) Header móvil (`242-261`) — misma matriz, texto `Buscar abogado` en lugar de `Continuar`

### d) Bloque visible cliente (nuevo, `265-280`)

```tsx
{userRole === "client" && (
  <section class="bg-amber-50 border-b border-amber-200">
    <h2>LegalUp Pro es para abogados</h2>
    <p>Si necesitas asesoría legal, encuentra un abogado según tu necesidad en LegalUp.</p>
    <Button onClick={()=>handleCTAClick("client_banner")}>Buscar abogado</Button>
    <Button variant="outline" onClick={()=>navigate("/")}>Volver a LegalUp</Button>
  </section>
)}
```

 Hero / Pricing / Final siguen usando `handleCTAClick` → para cliente redirige a `/search` por el early return.

**No tocado:** pricing `19990`, `PRO_SUBSCRIPTION_PRICE_CLP`, RLS `has_pro_access`, `ai_enforce_trial_limits`, Mercado Pago `PRO_` + HMAC, `ServicesPage`, `demoData`, `post-payment refetch`, `RequireLawyer`, `AuthContext`, `profiles.role`.

---

## 3. CTA matrix — después del fix

| Usuario | Header desktop | Header móvil | Hero / Pricing / Final (click) | Destino | Modal |
|---------|----------------|--------------|-------------------------------|---------|-------|
| Logged out | `Iniciar sesión` + `Comenzar con LegalUp Pro` | `Iniciar` + `Comenzar` | `Comenzar con LegalUp Pro` | `AuthModal proLanding` → signup lawyer | `AuthModal` |
| Cliente (`client`) | **Buscar abogado** | **Buscar abogado** | **Buscar abogado** (via `handleCTAClick` early return) + banner `LegalUp Pro es para abogados` | `/search` | **NO** `ProPricingModal` |
| Abogado FREE (`lawyer`, `hasProAccess false`) | `Activar Pro` | `Activar Pro` | `Comenzar` | `ProPricingModal` | `ProPricingModal` |
| Abogado Pro (`lawyer`, `hasProAccess true`) | `Ir al dashboard` | `Ir al dashboard` | `Ir al dashboard` | `/lawyer/dashboard` | — |
| Otros (`company`/`admin`/`null`) | `Volver a LegalUp` | `Volver a LegalUp` | `/` | `/` | — |

---

## 4. Analytics

**Antes:** `pro_landing_cta_clicked` se emitía también para `client` (fuga).

**Después:**
- `userRole==="client"` → **NO** `pro_landing_cta_clicked`. Emite `pro_landing_client_excluded` (`LegalUpPro.tsx:131`):

  ```json
  { "location": "header|hero|pricing|final|client_banner|header_mobile",
    "authenticated": true, "role": "client",
    "path": "/pro",
    "utm_source": "...", "utm_medium": "...", "utm_campaign": "..." }
  ```

  Reusa helper `getUTMs()` (`LegalUpPro.tsx:16`) (misma lógica `persistUTMsFromURL` + `sessionStorage`).
- Resto (`logged out`, `lawyer FREE`, `lawyer Pro`, otros) sigue emitiendo `pro_landing_cta_clicked` (`130-138`) con `location, authenticated, has_pro_access, utm_*` y `pro_landing_viewed` (`112`) intacto.

**Preservados:** `pro_paywall_opened`, `pro_subscribe_clicked`, `pro_checkout_started`, `pro_subscription_activated` (server), `ai_*` sin cambios.

---

## 5. Regression

| Área | Verificado | Resultado |
|------|------------|-----------|
| Marketplace `/search` + `POST /api/bookings/create` `UNKNOWN` | `grep` + `server.mjs` sin cambio | ✅ libre, no gateado |
| Pro entitlement `hasProAccess` / RLS `has_pro_access` / `lawyer_subscriptions` | `useProSubscription` y `20260911000000` intactos | ✅ |
| AI entitlement `free/trial/pro_limited/essential` `1/3` | `getAILawyerAccess:7921` + `checkAILimits:8098` + trigger `20260912000000` intactos | ✅ |
| `lawyer` FREE paywalls (Clients/Cases/Requests/Citas) | `phase3B23` + `phase3C` aún PASS | ✅ |
| `ServicesPage` / `demo` / `post-payment refetch` | **no tocados** por esta fase (restricción) | ✅ |

---

## 6. Tests

**Archivo:** `src/__tests__/phase3C2A.test.ts` (12 tests)

```
✓ T4 — client NO contiene Ir al panel
✓ T4 — client Buscar abogado + navigate /search + Volver a LegalUp
✓ T1 — logged out Comenzar + Iniciar + setAuthOpen
✓ T2 — lawyer FREE Activar Pro + setPricingOpen + userRole lawyer
✓ T3 — lawyer Pro Ir al dashboard -> /lawyer/dashboard + hasProAccess
✓ T5 — client NO abre ProPricingModal (client branch antes de setPricingOpen)
✓ T6 — analytics client pro_landing_client_excluded antes de pro_landing_cta_clicked, role client
✓ Header desktop/mobile Buscar abogado + Volver
✓ Bloque visible LegalUp Pro es para abogados + client_banner
✓ T7 — backend /api/pro/subscribe + NOT_LAWYER + requireAILawyer
✓ T8 — lawyer Pro subscribe 19990 + initPoint + ProPricingModal
✓ Marketplace /search sin gate (no navigate /dashboard)
```

- `npm run test:run -- src/__tests__/phase3C2A.test.ts` → **12 passed**
- `npm run test:run -- src/__tests__/phase3C.test.ts src/__tests__/phase3C2A.test.ts` → **32 passed**
- `phase3B` (26) intactos.

---

## 7. Build / typecheck

- **Build:** `npm run build` → `✓ built in ~8s`, chunk `LegalUpPro` actualizado, `INEFFECTIVE_DYNAMIC_IMPORT` preexistente único warning.
- **Typecheck:** `LegalUpPro.tsx` sin errores nuevos (solo baseline preexistente `App.tsx:155` `onError` etc., no introducidos). `handleCTAClick` tipado `string` OK, `useAuth`/`useProSubscription` sin cambio de firma.

---

## 8. Git status

**Sin commit / push** (restricción fase):

```
 M src/pages/LegalUpPro.tsx
?? docs/FASE-3C.2A-PRO-CLIENT-ROLE-FIX.md
?? src/__tests__/phase3C2A.test.ts
```

Base `69bff52` intacta; esta fase es solo working tree. No deploy.

---

*Fin FASE 3C.2A — fix P1 conversión cliente, sin tocar pricing/entitlement/RLS/MP.*
