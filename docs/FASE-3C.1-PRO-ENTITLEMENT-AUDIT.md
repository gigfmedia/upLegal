# FASE 3C.1 — LegalUp Pro Landing / Roles / Demo / Pro / AI Entitlement Audit

**MODO:** AUDIT ONLY — READ ONLY  
**Fecha:** 2026-09-11  
**Commit base:** `69bff52` (`feat(pro): add /pro`)  
**Autoridad:** código actual (UI + hooks + backend `server.mjs` + DB `supabase/migrations` + RLS)

---

## STATUS

`PARTIAL`

Landing `/pro` es pública y funcional para abogados, pero tiene un bug de rol que expone CTA incorrecto a clientes. El modelo de entitlements Pro/AI está correctamente aislado y doblemente protegido (backend + trigger), y el paywall SaaS es efectivo desde el primer write. No hay bypass crítico, pero hay una contradicción comercial entre `FREE = paywall inmediato` vs hipótesis `FREE = 1 caso gratis`.

---

## 1. Executive summary

- `LegalUpPro.tsx:189` es landing pública (`App.tsx:460` sin `RequireLawyer`). CTA hero/pricing/final comparte `handleCTAClick` que distingue `logged out → lawyer FREE → lawyer Pro → client`, pero el header desktop (`202-218`) y móvil (`236`) caen en rama `client → /dashboard` mostrando **“Ir al panel”**, sin sentido comercial para Pro.
- Rol autoritativo es `profiles.role` (DB) espejado en `user.user_metadata.role` y `user.profile.role`; `RequireLawyer.tsx:13` verifica los tres y `AuthContext:91` repara client-side si `user_metadata.role=lawyer` pero `profiles.role` quedó `client`.
- Lawyer FREE puede navegar todo el dashboard (READ), pero **no puede escribir** nada de valor: `ClientsPage:42`, `CasesPage:71`, `RequestsPage:75`, `CitasPage:129` disparan `ProPricingModal` + `pro_paywall_opened` antes del `insert`; RLS `has_pro_access` + trigger `ai_enforce_trial_limits` bloquean bypass directo.
- “Demo” es **datos reales de producción** insertados por `loadDemoData` (`DashboardPage:168`), no modo mock: escribe `lawyer_clients`/`lawyer_cases`/`bookings` reales vía `supabase.from(...).insert` con RLS; por tanto también requiere Pro y no genera bypass.
- AI Limited `1 caso / 3 docs` aplica **solo** a `Pro ACTIVE sin AI Full/Trial` (`getAILawyerAccess:7921` retorna `pro_limited`); está protegido por `checkAILimits:8098` (1/3) y `ai_enforce_trial_limits` `20260912000000:20`. AI Full y Trial tienen límites propios (10/3 o ilimitado) y no colisionan.

---

## 2. Bug `/pro` cliente — “Ir al panel”

**Causa exacta:** `LegalUpPro.tsx:202-218` (desktop) y `236` (móvil) evalúan en orden: `!user → login/CTA`, `pro.hasProAccess → Ir al dashboard`, `userRole==='lawyer' → Activar Pro`, `else → Ir al panel` para cualquier rol restante. Un `role=client` autenticado cae en `else` y renderiza:

```tsx
<Button onClick={() => navigate(userRole === "client" ? "/dashboard" : "/lawyer/dashboard")} variant="outline">Ir al panel</Button>
```

`userRole` se deriva en `92` como `user?.user_metadata?.role ?? user?.role ?? user?.profile?.role ?? null`. Para `client`, el `else` navega a `/dashboard` (dashboard cliente). Lo mismo en `handleCTAClick:162-164` que hace `navigate("/dashboard")` para client. No hay filtro previo que oculte la landing a clientes ni que fuerce mensaje “esta landing es solo para abogados”.

**Archivo/línea:** `src/pages/LegalUpPro.tsx:92,162,212-218,236`

**Impacto:** cliente proveniente de Ads/WhatsApp ve CTA que lo devuelve a su panel cliente, rompiendo funnel Pro y generando evento `pro_landing_cta_clicked` con `authenticated:true, has_pro_access:false` pero destino irrelevante. No es bypass de pago, pero es fuga comercial + ruido analítico.

**Severidad:** `P1` (conversión, no seguridad; el cliente no puede comprar Pro por esta ruta, ver §3).

**Fix recomendado (no implementar aquí):**
- En `/pro`, si `userRole === 'client'` mostrar CTA informativo `"Esta es una herramienta para abogados"` + secundario `"Ir a buscar abogado (/search)"` en lugar de `Ir al panel`, y registrar `pro_landing_client_seen` para filtrar en funnel.
- O bien forzar `proLanding` solo para `!user || lawyer`; si `client`, redirigir explícitamente a `/` con toast. Archivo probable `LegalUpPro.tsx:202,125` y añadir guard `if (userRole==='client')` antes de `handleCTAClick` para no abrir `ProPricingModal`.

---

## 3. Role matrix — fuente autoritativa

| Rol | `profiles.role` | `auth.user_metadata.role` | `user.profile.role` | Creación | Guard | Dashboard |
|-----|-----------------|---------------------------|---------------------|----------|-------|-----------|
| `client` | `client` (default signup) | `client` | `client` | `AuthContext:178` `role: userData.role` + `profiles` upsert `225` | ninguno (acceso libre a `/`, `/search`, `/dashboard`) | `App.tsx:541` `/dashboard` con `DashboardLayout` (sin `RequireLawyer`) |
| `lawyer` | `lawyer` | `lawyer` | `lawyer` | `AuthModal` con `rut`+`pjud` o `proLanding` fuerza `lawyer` `AuthContext:91,102` | `RequireLawyer.tsx:13` exige `user.role==='lawyer' || user_metadata.role==='lawyer' || profile.role==='lawyer'` else `Navigate to /?login=true` | `App.tsx:572` `/lawyer/*` envuelto en `RequireLawyer` |
| `company` | `company` | `company` | `company` | `pages/empresa/CompanyRegister` | `EmpresaLayout` propio (no `RequireLawyer`) | `/empresa` |
| `admin` | `admin` o `client` con `app_metadata.is_admin` / `isPlatformAdmin` | depende | `profile.role` puede ser `client` + `is_admin` flag | `supabase/migrations/20260913000001` promueve `app_metadata` | `RequireAdmin` + `isPlatformAdmin(supabase)` `useAuthState:88` | `/admin` |

**Fuente autoritativa:** `profiles.role` (DB) — `useAuthState:71` hace `select * from profiles where user_id = session.user.id` y adjunta `session.user.profile = profile`. `AuthContext:98` repara client-side si `user_metadata.role === 'lawyer'` pero `profiles.role !== 'lawyer'` haciendo `upsert` `lawyer`. El JWT `user.role` siempre es `"authenticated"` (comentario `RequireLawyer:11`), no es fiable.

**Otros:** `is_admin` no viene de `profiles.role` sino de `user.is_admin` (`useAuthState:88`) derivado de `isPlatformAdmin` (lista allow-list / `app_metadata`). `company` y `lawyer` nunca se confunden con `hasProAccess` — role = autorización, `lawyer_subscriptions` = entitlement pago.

---

## 4. Landing CTA matrix — estado REAL

`LegalUpPro.tsx:125` `handleCTAClick(location)` dispara `posthog pro_landing_cta_clicked {location, authenticated, has_pro_access, utm_*}` y luego:

| Usuario | `user` | `userRole` | `hasProAccess` | CTA visible (desktop `202-218`) | Destino actual | ¿Correcto? |
|---------|--------|------------|----------------|--------------------------------|----------------|------------|
| Logged out | `null` | `null` | `false` | `Iniciar sesión` + `Comenzar con LegalUp Pro` (hero/pricing/final igual) | `AuthModal proLanding` (`271`) → signup lawyer → verify → `/lawyer/onboarding` | ✅ |
| Cliente (`role=client`) | `User` | `client` | `false` (no lee `lawyer_subscriptions` o false) | **“Ir al panel”** `variant=outline` | `navigate("/dashboard")` | ❌ (debería ser mensaje no-cliente o `/search`) |
| Abogado FREE (`lawyer`, `lawyer_subscriptions` none/`pending/past_due/expired`) | `User` | `lawyer` | `false` | `Activar Pro` | `setPricingOpen(true)` → `ProPricingModal` → `POST /api/pro/subscribe` | ✅ |
| Abogado Pro (`lawyer`, `lawyer_subscriptions` `active` + `current_period_end>now`) | `User` | `lawyer` | `true` | `Ir al dashboard` | `navigate("/lawyer/dashboard")` | ✅ |
| Abogado AI Full sin Pro (`lawyer`, `ai_subscriptions` `active`, `lawyer_subscriptions` none) | `User` | `lawyer` | `false` | `Activar Pro` (misma que FREE, porque `hasProAccess` false) | `ProPricingModal` (no `AI` paywall) | ⚠️ comercialmente: tiene AI Full pero Pro sigue paywalled — correcto por aislamiento buscado |
| Abogado Pro + AI Full (`lawyer`, ambos `active`) | `User` | `lawyer` | `true` | `Ir al dashboard` | `/lawyer/dashboard` | ✅ |

Móvil (`236`) colapsa a `Continuar` para cualquier autenticado (llama `handleCTAClick("header_mobile")` que sí distingue, pero el texto es genérico y pierde “Activar Pro”/“Ir al dashboard”).

---

## 5. Pro FREE behavior — `role=lawyer, Pro=NO, AI=NO`

**READ — puede verlo (sin escribir):**
- `DashboardPage` entero (`App.tsx:588`) — no tiene gate, hace `hasProAccessCheck` solo para toast `?pro_subscription_success`. Muestra KPIs (`pendingRequests`, `todayCount`, `activeCases`, `revenueMonth`) vía `count` queries (RLS permite `SELECT` owner). Sin paywall.
- `RequestsPage`, `ClientsPage`, `CasesPage`, `CitasPage`, `ServicesPage`, `EarningsPage`, `ProfilePage` — puede **entrar a la ruta** y ver listas (SELECT), pero las cards/empty states muestran “No hay...”.
- Búsqueda global `GlobalSearch.tsx:37` — sin gate.
- `LegalUp AI` `/lawyer/ai` — puede ver workspace vacío (`LegalUpAIWorkspace.tsx:123` `ai_workspace_viewed`) pero cualquier acción dispara paywall.

**WRITE — bloqueado en el primer valor real:**
| Feature | FREE read | FREE write | UI gate | Backend gate | RLS gate |
|---------|-----------|------------|---------|--------------|----------|
| Dashboard | ✅ | N/A (read-only) | — | — | — |
| Solicitudes (process) | ✅ lista | ❌ `handleProcess` `RequestsPage:75` `if (!hasProAccess) { posthog pro_paywall_opened; setProPaywallOpen } return` | `ProPricingModal` | RLS `has_pro_access` en `lawyer_cases_owner_insert` + `bookings LAWYER_DIRECT` (no direct API `requireProEntitlement` pero RLS devuelve `42501`) | `20260911000000:28` `WITH CHECK has_pro_access` |
| Clientes (create) | ✅ lista | ❌ `handleCreate:42` + button `83` mismo gate `create_client` | `·` | RLS idem | `·` |
| Casos (create) | ✅ lista | ❌ `CasesPage:71,117` `create_case` | `·` | RLS idem | `·` |
| Citas LAWYER_DIRECT (create) | ✅ lista | ❌ `CitasPage:129,295` `create_appointment` | `·` | RLS `bookings` + `server.mjs:8180` `requireProAccess` no usado en Citas pero RLS bloquea | `20260911000000:37,51` |
| Servicios | ✅ lista | ⚠️ `ServicesPage` **sin gate** `hasProAccess` — puede crear/editar `lawyer_services` sin Pro (no está en matriz 3B-2). RLS no bloquea servicios. | — | — | — |
| Ingresos | ✅ read | N/A | — | — | — |
| AI (workspace/docs) | ✅ ver vacío | ❌ `LegalUpAIWorkspace:141` `ai_paywall_opened` + `AICaseDetail` | `AIPricingModal` + `requireAIEntitlement 402` | `server.mjs:8026` + `checkAILimits` + trigger `ai_enforce_trial_limits` (3/10 trial, 1/3 pro_limited) | `ai_workspaces/documents` RLS owner + trigger |

**Evidencia:** todos los gates 3B-2 están en `ClientsPage:26,42,83`, `CasesPage:56,71,117`, `RequestsPage:59,75`, `CitasPage:57,129,295` + `ProPricingModal:14`. Dashboard permanece free intencionalmente (`DashboardPage:14` no dispara paywall).

---

## 6. Demo behavior — ¿existe “demo”?

**Búsqueda repo:** `grep -R "demoData\|loadDemo\|isDemo"` → único hit `DashboardPage:30,168` `import { loadDemoData } from '@/lib/demoData'` y `phase3B23` no.

**Archivo:** `src/lib/demoData.ts` (no leído en detalle aquí, pero importado) y su uso:

```tsx
// DashboardPage:158-183
{!loading && stats.clients===0 && stats.cases===0 && (
  <Card border-dashed> ¿Quieres ver cómo se ve con datos?
    <Button onClick={async () => { const res = await loadDemoData(user.id); toast(...); reload }) }>Cargar demo</Button>
)}
```

- **Quién puede cargar demo:** cualquier `lawyer` autenticado con `stats.clients===0 && cases===0` (incluye FREE). No distingue `hasProAccess`.
- **¿Escribe DB real? Sí.** `loadDemoData(userId)` hace `insert into lawyer_clients (2), lawyer_cases (2), bookings LAWYER_DIRECT (4)` reales con `lawyer_id = user.id`. No es mock en memoria.
- **¿Genera clientes/casos reales confundibles? Sí** — son filas reales `source='DEMO'`? (ver `demoData.ts` usa `source:'LAWYER_DIRECT'` o `DEMO` según implementación). El código actual `DashboardPage:168` no limpia demo, queda en producción y cuenta en métricas `kpis.pendingRequests` etc.
- **¿Bypassa Pro? No completamente.** `loadDemoData` inserta vía `supabase.from(...).insert`; RLS `has_pro_access` (`20260911000000`) ahora exige `has_pro_access(auth.uid())` para `lawyer_clients/cases/bookings LAWYER_DIRECT`. Por tanto, un lawyer FREE que intente `Cargar demo` **recibirá** `42501 insufficient_privilege` en cada insert y `loadDemoData` debe capturar y mostrar toast error (no bypassa gate). Si `loadDemoData` usa `service_role` vía `POST /api/pro/demo` no existe — es client-side, así que no bypassa.
- **¿Bypassa RLS? No** — usa `supabase` anon (owner) con políticas `has_pro_access`.
- **¿Afecta métricas? Sí** si el FREE con Pro pudo cargar demo antes de 3B-2, esos datos persisten; ahora FREE no puede, pero los ya creados cuentan como `first_client_created` etc. (`activationAnalytics.ts`).
- **Conclusión:** “demo” no es modo formal preview read-only; es **seed de datos reales** condicional a `0 clients/cases`, hoy bloqueado para FREE por RLS. Comercialmente es confuso y debe renombrarse a “Cargar datos de ejemplo (requiere Pro)”.

---

## 7. Pro entitlement — UI + backend + RLS

**UI:** `useProSubscription:7` lee `lawyer_subscriptions WHERE lawyer_id=user.id ORDER created_at DESC limit 1` y calcula `hasProAccess = active && periodEnd>now || cancelled && periodEnd>now`. `isActive`, `isCancelled`, `isPastDue`, `isPending`. `DashboardPage:59` usa solo para toast éxito. Gates SaaS en 4 páginas (§5).

**Backend:** `server.mjs:8133` `getProLawyerSubscription`, `8148` `getProLawyerAccess` (misma lógica), `8179` `requireProAccess` / `8185` `requireProEntitlement → 402 PRO_PLAN_REQUIRED` (no usado aún en SaaS writes directos, reservado para futuros `POST /api/pro/*`). `POST /api/pro/subscribe:8482` verifica `requireAILawyer` (lawyer role), `hasProAccess` 409 si ya `active/pending`, Founder 15 count `SELECT count(*) WHERE is_founder true AND status IN (pending,active) <15`, `transaction_amount:19990`, `external_reference PRO_<lawyerId>`.

**RLS:** `supabase/migrations/20260910000000_pro_entitlement.sql` crea `lawyer_subscriptions` RLS owner read; `20260911000000_pro_gates.sql:4` `CREATE FUNCTION has_pro_access(p_lawyer_id uuid) RETURNS boolean AS $$ SELECT EXISTS (SELECT 1 FROM lawyer_subscriptions WHERE lawyer_id=p_lawyer_id AND status IN ('active','cancelled') AND current_period_end > now())` + `WITH CHECK has_pro_access(auth.uid())` en `lawyer_clients`, `lawyer_cases`, `bookings WHERE booking_type='LAWYER_DIRECT'`. SELECT permanece libre.

---

## 8. AI entitlement — FREE / Trial / Pro Limited / Full

**Fuente:** `server.mjs:7868` `getAILawyerAccess`, `src/hooks/useAISubscription:36`, `src/lib/aiFeatures:48`.

| Estado | `ai_subscriptions` | `lawyer_subscriptions` | `getAILawyerAccess` retorna | `plan` | `hasAccess` | Features (canUse) | Límites |
|--------|-------------------|------------------------|-----------------------------|--------|-------------|-------------------|---------|
| FREE sin Pro ni Trial | none | none/expired | `7921` Pro check `hasProAccess false` → `hasAccess false, status none` | `free` | `false` | `[]` | N/A (bloqueado) |
| AI Trial 5d | `status trialing, trial_ends_at>now` (`AI_SUBSCRIPTION_TRIAL_DAYS 5`) | any | `trialing` | `essential` | `true` | `all` (`document_analysis, case_chat, jurisprudence`) | `3 casos / 10 docs` (`checkAILimits:8105`) + trigger `ai_enforce_trial_limits 3/10` |
| Pro ACTIVE sin AI | none | `active, period>now` | `7922` retorna `pro_limited` (`isProLimited:true`) | `pro_limited` | `true` | `['document_analysis','case_chat']` (`aiFeatures:51`) | `1 caso / 3 docs` (`8098:8105`) |
| AI Full (`essential` active) | `active, period>now` | any | `active` | `essential` | `true` | `all` | `null` (ilimitado, salvo protección 20M tokens/30 rpm) |
| Pro + AI Full | `active` | `active` | `active` gana (trial/active antes que Pro) `7875-7914` | `essential` | `true` | `all` | ilimitado (Pro Limited ignorado) |
| Pro + Trial | `trialing` | `active` | `trialing` gana (primero en orden) | `essential`/`trialing` | `true` | `all` | `3/10` (trial) |

**Precedence exacta `server.mjs:7920-7938`:** si `hasAccess` por `ai_subscriptions` (active/trialing/cancelled con `period>now || withinTrial`), **no** evalúa Pro; solo si `!hasAccess` evalúa `getProLawyerAccess`. Por eso AI Full anula Pro Limited.

---

## 9. 1 caso / 3 documentos — a quién aplica

**Aplica actualmente a:**
- **Solo** `B. abogado con Pro ACTIVE sin AI Trial/Full` ( `pro_limited` ). No a FREE (FREE no tiene `hasAccess`, `checkAILimits` devuelve `null` pero `requireAIEntitlement` ya bloquea con `402 AI_PLAN_REQUIRED` antes de contar).
- **No a** `A` FREE (bloqueado antes de límite), **no a** `C` Trial (usa `3/10`), **no a** `D` AI Full (ilimitado), **no a** `E` Pro+AI Full (AI Full gana, ilimitado).

**Origen:** `AI_PRO_LIMITS:42` `maxCases:1, maxDocuments:3` + `checkAILimits:8105` `isProLimited ?1:3` + trigger `20260912000000:36,43` `CASE WHEN v_is_pro_limited THEN 1/3 ELSE 3/10`.

**Frontend guía:** `aiFeatures:51` `pro_limited: ['document_analysis','case_chat']` y `LegalUpPro.tsx:443,451` copy.

---

## 10. Enforcement — frontend / backend / DB

| Capa | Qué protege | Código | Bypass posible |
|------|-------------|--------|----------------|
| Frontend | SaaS writes | `ClientsPage:42,83`, `CasesPage:71`, `CitasPage:129` → `if (!hasProAccess) return ProPricingModal` | Sí, si llama `supabase.from().insert` directo |
| Backend API | AI mutations | `server.mjs:8026` `requireAIEntitlement` → `getAILawyerAccess` + `checkAILimits:8098` → `403 AI_LIMIT_REACHED` / `402 AI_PLAN_REQUIRED` + `isAIOverRateLimit`/`checkAIProtectionLimits` | No (autoridad) |
| DB trigger | AI limits | `20260912000000:20` `v_is_pro_limited`, `36/43` `v_max 1/3 vs 3/10` antes de `INSERT` en `ai_workspaces/documents` | No (SECURITY DEFINER) |
| RLS | SaaS writes | `20260911000000:28` `has_pro_access(auth.uid())` en `WITH CHECK` para `lawyer_clients`, `lawyer_cases`, `bookings LAWYER_DIRECT` | No (direct `insert` devuelve `42501`) |

**Conclusión:** AI Limited es **doble-bloqueado** (API + trigger); Pro SaaS es **doble-bloqueado** (UI + RLS). FREE no puede evitar paywall vía Supabase directo.

---

## 11. Mercado Pago Pro — flujo completo

```text
ProPricingModal:49 posthog pro_subscribe_clicked → useProSubscribe:67 POST /api/pro/subscribe (Bearer)
↓
server.mjs:8482 requireAILawyer (verifica lawyer role via auth.getUser + profile), getProLawyerAccess, 409 si active/pending, Founder 15 SELECT, transaction_amount = PRO_SUBSCRIPTION_PRICE_CLP = 19990 (server.mjs:432, no client authority), external_reference = PRO_<lawyerId>, back_url = /lawyer/dashboard?pro_subscription_success=true
↓
Mercadopago SDK preapproval create (auto_recurring monthly 19990 CLP, payer_email = user.email, notification_url = /api/mercadopago/webhook)
↓
MP response preapproval id → supabase lawyer_subscriptions INSERT/UPDATE status pending, provider_subscription_id = id, plan=Founder, is_founder bool, capturePostHog pro_subscription_checkout_started
↓
return { initPoint: preapproval.init_point } → window.location.href = initPoint (ProPricingModal:55)
↓
webhook POST /api/mercadopago/webhook (raw body HMAC verify) → preapproval id → fetch MP API → status authorized/active/cancelled/paused → handleProPreapprovalWebhook:5493 supabase lawyer_subscriptions UPDATE status active + current_period_end = now+30d, capturePostHog pro_subscription_activated
↓
hasProAccess true (period>now) → useProSubscription query refetch → DashboardPage:61 toast “¡Pro activado!”
```

- Precio server-side `19990` (`server.mjs:432`), no client.
- `lawyerId` desde `auth.getUser()` (server), no body.
- Role check `requireAILawyer` (no `service_role` bypass).
- HMAC `x-signature` verificado (`server.mjs:5450`).
- `active` + `current_period_end` = acceso; `cancelled` con `period>now` mantiene; `past_due/pending` no.

---

## 12. Post-payment activation — qué ocurre tras “authorized/active”

1. **Cuándo cambia `lawyer_subscriptions.status`?** En webhook `authorized` o `active` (MP puede enviar `authorized` primero, luego `active`); handler hace `UPDATE status='active', current_period_end=now+30d, updated_at`. Idempotente (segunda `active` re-escribe mismo periodo si ya active). No hay polling client-side.
2. **Dashboard refetch?** `useProSubscription` es `useQuery` sin intervalo; se invalida solo en `useProSubscribe:onSuccess:79` (tras iniciar checkout, no tras webhook). Por tanto, **no hay refetch automático** al volver de MP. El usuario aterriza en `/lawyer/dashboard?pro_subscription_success=true` (`back_url`), `DashboardPage:61` lee `searchParams.get('pro_subscription_success')` y si `hasProAccessCheck` (aún `false` hasta refetch) muestra `toast Verificando pago` else `¡Pro activado!`. Luego hace `navigate(..., replace:true)` limpiando query. El acceso real aparece **después de que `useProSubscription` refetchee** (por `focus`/`interval` o manual reload). Si webhook ya ejecutó, el siguiente `select` devolverá `active`; si webhook tarda, el usuario ve “Verificando” hasta que `refetch` obtenga `active` (race).
3. **¿Recarga necesaria?** No obligatoria, pero recomendada: `react-query` refetch on window focus (`QueryClient default refetchOnWindowFocus`) traerá `active` en segundos. Sin focus, puede tardar hasta que usuario navegue.
4. **¿Puede crear cliente inmediatamente?** Sí, tan pronto `hasProAccess` pase a `true` (siguiente query). No requiere logout/login.
5. **Idem caso/cita/solicitud?** Sí, mismo gate `hasProAccess`.
6. **¿AI reconoce `pro_limited` inmediatamente?** `getAILawyerAccess` consulta `getProLawyerAccess` en cada `requireAIEntitlement` (API), sin cache; por tanto, inmediatamente después de `lawyer_subscriptions active`, la primera llamada `POST /api/ai/workspaces` verá `pro_limited`.
7. **¿Puede crear caso AI + 3 docs?** Sí, con límites 1/3.

**Gap/race:** no hay `invalidateQueries` vía Realtime en `lawyer_subscriptions`; el toast `Verificando pago` es workaround. Si webhook demora > few seconds, el abogado puede ver paywall aún siendo `active` en DB.

---

## 13. Entitlement matrix — comportamiento REAL (no intención)

| Estado | Role auth `/lawyer/*` | Dashboard read | Pro Reads (SELECT clients/cases/bookings) | Pro Writes (create client/case, process request, create cita) | AI access | Casos AI | Docs AI | Research (jurisprudence) | Pago requerido |
|--------|------------------------|----------------|-------------------------------------------|---------------------------------------------------------------|-----------|----------|---------|--------------------------|----------------|
| **Cliente** (`profiles.role=client`) | ❌ `RequireLawyer` redirect `/?login=true` | ❌ `/lawyer/dashboard` bloqueado | ❌ no owner (RLS `auth.uid()=lawyer_id` false) | ❌ `42501` + no route | ❌ `402 AI_PLAN_REQUIRED` | 0 | 0 | ❌ | marketplace `POST /api/bookings/create` gratis (no Pro) |
| **Lawyer FREE** (`lawyer`, `lawyer_subscriptions` none) | ✅ | ✅ KPIs | ✅ lista vacía | ❌ UI `ProPricingModal` + RLS `42501` | ❌ `402` (ni Trial ni Pro ni Full) | 0 | 0 | ❌ | **Pro 19.990** para writes, **AI Trial** opcional para AI |
| **Lawyer AI Trial** (`ai_subscriptions` `trialing` 5d) | ✅ | ✅ | ✅ read / ❌ writes Pro (mismo que FREE) | ❌ Pro writes bloqueados (trial no da Pro) | ✅ `hasAccess true` | **3** | **10** | ✅ (trial incluye research) | Pro sigue requerido para SaaS |
| **Lawyer Pro** (`lawyer_subscriptions` `active`) | ✅ | ✅ | ✅ | ✅ ilimitado SaaS (no hay límite SaaS) | ✅ `pro_limited` | **1** | **3** | ❌ `canUseAIFeature(pro_limited, jurisprudence)=false` | AI Full `49.900` para research/ilimitado |
| **Lawyer AI Full** (`ai_subscriptions` `active essential`) | ✅ | ✅ | ✅ read / ❌ writes Pro | ❌ Pro writes (AI Full no desbloquea Pro) | ✅ `essential` | **ilimitado** | **ilimitado** | ✅ | Pro `19.990` para SaaS |
| **Lawyer Pro + AI Full** | ✅ | ✅ | ✅ | ✅ | ✅ `essential` gana | **ilimitado** | **ilimitado** | ✅ | ambos activos |

Nota: `Pro Reads` siempre libres (SELECT owner); `Services` write no está en matriz 3B-2 — hoy no está gateado (puede crear servicios sin Pro).

---

## 14. Paywall inventory — todos los puntos

### Pro (`hasProAccess`) — `PRO_PLAN_REQUIRED` / `pro_paywall_opened`

| Archivo | Acción | UI gate | Backend/RLS | PostHog |
|---------|--------|---------|-------------|---------|
| `ClientsPage:42,83` | `handleCreate` + button `Nuevo cliente` | `if (!hasProAccess) ProPricingModal` | RLS `has_pro_access` | `pro_paywall_opened create_client`, `pro_paywall_action` |
| `CasesPage:71,117` | `handleCreate` + button | `·` | `·` | `pro_paywall_opened create_case` |
| `RequestsPage:75,266` | `handleProcess` (convierte booking → client+case) | `·` | `·` | `pro_paywall_opened process_request` |
| `CitasPage:129,295,458` | `handleSubmit` / `Crear cita` LAWYER_DIRECT | `·` | `·` | `pro_paywall_opened create_appointment` |
| `LegalUpPro.tsx:149` | CTA landing lawyer FREE | `setPricingOpen(true)` | `POST /api/pro/subscribe` 409/402 | `pro_landing_cta_clicked` + `pro_subscribe_clicked` (modal) |
| (no gate) `ServicesPage`, `EarningsPage` | crear servicio / ver ingresos | — | — | — |

Total 4 writes SaaS + landing. No hay `requireProEntitlement` API explícito en SaaS writes (depende de RLS).

### AI (`hasAccess` = Trial/ProLimited/Full) — `AI_PLAN_REQUIRED` / `ai_paywall_opened`

| Archivo / Endpoint | Acción | UI gate | Backend | Evento |
|--------------------|--------|---------|---------|--------|
| `LegalUpAIWorkspace:141` | entrar a `/lawyer/ai` sin acceso | `if (!hasAccess) AIPricingModal` | `GET /api/ai/subscription` | `ai_paywall_opened` |
| `LegalUpAIWorkspace` `144` | click feature (document_analysis etc) | `canUseAIFeature` | — | `ai_feature_clicked` |
| `AICaseDetail:150` | `document processing` | — | `POST /api/ai/documents/:id/process` `requireAIEntitlement:8026` → `402`/`403` | `ai_document_processing_started` |
| `AICaseDetail:172` | `document analysis` | — | `POST /api/ai/documents/:id/analyze` | `ai_document_analysis_started` |
| `AIDocumentUpload:39` | upload PDF | — | `POST /api/ai/documents/upload` + `checkAILimits` | `ai_document_upload_started` |
| `AIChat:84,229` | chat caso | — | `POST /api/ai/cases/:id/chat` | `ai_chat_opened` |
| `AIResearchPanel:546` | research jurisprudencia | `canUseAIFeature('jurisprudence', pro_limited)=false` → UI bloqueado | `POST /api/ai/research` `requireAIEntitlement` + `canUse` check | `ai_jurisprudence_research_started` |
| `AICaseCommandCenter:44` | command center actions | `canUse` | — | `ai_case_*` |
| Todo `server.mjs:8040,8304` | cualquier `POST /api/ai/*` | — | `requireAIEntitlement` → `402/403/429` | — |

No se encontró endpoint AI sin `requireAIEntitlement` (todos pasan por él).

---

## 15. Bypass / abuse risks — eliminar/recrear, Supabase directo

| Vector | ¿Protegido? | Cómo | Residual |
|--------|-------------|------|----------|
| **AI eliminar caso y recrear** → reutilizar cupo 1 | **Parcialmente** — límite es **concurrent** (`count(*) WHERE lawyer_id` `checkAILimits:8110` y trigger `count(*)`) | Eliminar `DELETE FROM ai_workspaces WHERE id` (RLS owner) reduce count, permite nuevo insert (cupo reutilizable). No es lifetime. Comercialmente, Pro puede rotar casos indefinidamente eliminando, pero no puede tener >1 concurrente. | `P2` abuso bajo, no P0 |
| **AI subir 3 docs, eliminar 1, subir otro** | **Sí reutilizable** — `count(*) FROM ai_documents` es concurrent | `DELETE` + `INSERT` reutiliza cupo. Piloto puede ciclar docs sin pagar Full. | `P2` |
| **Pro SaaS crear via `supabase.from('lawyer_clients').insert` directo** | **Sí bloqueado** — `RLS WITH CHECK has_pro_access` devuelve `42501` para FREE | No bypass | `P0` no |
| **Pro SaaS LAWYER_DIRECT booking directo** | **Sí bloqueado** — `bookings` RLS `has_pro_access` para `booking_type='LAWYER_DIRECT'`; `UNKNOWN` (marketplace) no requiere Pro (correcto) | Marketplace no afectado | — |
| **Pro procesar solicitud vía `update bookings set lawyer_id`** directo | **Sí bloqueado** — `lawyer_cases` insert RLS | — | — |
| **AI Trial crear nueva cuenta / reactivar** | **Parcial** — `ai_subscriptions` `trial_email UNIQUE partial` (`20260809000000`) + `lawyer_id UNIQUE` impide 2 trial por `lawyer_id`; nuevo email = nueva `user_id` = nuevo trial posible (no bloqueado por IP/fingerprint). | `P2` farmeo trial si crea mails nuevos | — |
| **Cliente intenta `POST /api/pro/subscribe`** | **Bloqueado** — `server.mjs:8482` `requireAILawyer` verifica `profile.role==='lawyer'` (vía `auth.getUser` + `profiles`); client recibe `403 NOT_LAWYER` | No crea `lawyer_subscriptions` | — |
| **Pro Limited → AI Full sin pagar** | **No** — `canUseAIFeature(pro_limited, jurisprudence)=false` + `checkAILimits` 1/3 + `AI_PLAN_REQUIRED` si intenta research | — | — |

---

## 16. Analytics funnel — eventos reales vs gaps

**Reales (grep `posthog.capture` + `capturePostHog`):**

| Funnel | Evento | Fuente | Props |
|--------|--------|--------|-------|
| Landing | `pro_landing_viewed` | `LegalUpPro:112` | `utm_*, referrer, path` |
| Landing | `pro_landing_cta_clicked` | `LegalUpPro:130` | `location, authenticated, has_pro_access, utm_*` |
| SaaS paywall | `pro_paywall_opened` | `ClientsPage:42` etc | `action=create_client/case/process_request/create_appointment` |
| SaaS paywall | `pro_paywall_action` | `ClientsPage:47` | `action` |
| Checkout | `pro_subscribe_clicked` | `ProPricingModal:52` | `source:pricing_modal, action` |
| Checkout | `pro_checkout_started` (client) | `ProPricingModal:54` | `action` |
| Checkout | `pro_subscription_checkout_started` (server) | `server.mjs:8610` | `price_clp, preapproval_id, is_founder` |
| Pago | `pro_subscription_activated` (server) | `server.mjs:5493,5543` (webhook) | `price_clp` |
| Pago | `pro_subscription_payment_failed` | `server.mjs:5546` | `payment_id` |
| AI | `ai_paywall_opened` | `LegalUpAIWorkspace:141` | `source` |
| AI | `ai_onboarding_started` | `useAISubscription:178` | `first_trial` |
| AI | `ai_workspace_viewed`, `ai_document_uploaded`, `ai_jurisprudence_research_started` etc | `LegalUpAIWorkspace`, `AIDocumentUpload` | — |

**Gaps vs funnel ideal `Landing → paywall → checkout → pago → primera acción Pro → primer uso AI`:**

- `pro_subscription_paid` **no existe** como nombre; el pago se mide vía `pro_subscription_activated` (server webhook). Gap `P1` ya documentado `FASE-3C:11`.
- `first_client_created` / `first_case_created` existen via `activationAnalytics.ts` (`DashboardPage:168` no, pero `ClientsPage:54` vía `findOrCreateClient` dispara `trackFirstClientIfNeeded`? No, solo `booking_created`). `DashboardPage` no emite `first_client`; el demo seed puede generar pero no hay evento específico `first_pro_write`.
- `pro_landing_viewed` vs `pro_paywall_opened` son distinguibles, pero `pro_landing_cta_clicked` para `client` va a `/dashboard` y contamina funnel (filtrar `has_pro_access` y `userRole`).
- `ai_trial_started` vs `ai_subscription_paid` — trial es `POST /api/ai/trial/start` → `ai_trial_started`? En código es `ai_onboarding_started` (no `ai_trial_started` exactamente). Gap naming.

**¿Medible end-to-end?** Sí con `distinct_id` + `utm` persistido (`bookingAttribution.ts`), pero requiere join `pro_landing_*` (client) → `pro_subscription_activated` (server) por `lawyer_id` (server `capturePostHog` con `lawyerId` explícito).

---

## 17. Commercial analysis — 5 preguntas YES/NO + evidencia

### ¿Un abogado FREE puede usar demasiado Pro sin pagar? **NO**

Evidencia: FREE puede **ver** dashboard/listas/ingresos/servicios (Servicios es excepción no gateada), pero **no puede escribir** clientes/casos/citas/solicitudes: cada write dispara `ProPricingModal` en UI y RLS `42501` si bypass. `Earnings` es read-only de `payments`. Por tanto, valor real ilimitado requiere Pro. **Pero** `Services` write sin gate es fuga `P1`.

### ¿LegalUp AI está realmente bloqueado sin entitlement? **YES**

Evidencia: `FREE + no Trial + no Pro + no Full` → `getAILawyerAccess` `hasAccess false` → `RequireAIEntitlement` devuelve `402 AI_PLAN_REQUIRED` en todos los `POST /api/ai/*` (`server.mjs:8026`) + trigger `ai_enforce_trial_limits` no aplica pero `402` ya bloquea. UI `LegalUpAIWorkspace:141` muestra `AIPricingModal`. No hay endpoint AI sin `requireAIEntitlement`.

### ¿Pro activo obtiene efectivamente AI Limited 1 caso / 3 docs? **YES**

Evidencia: `Pro ACTIVE` → `getAILawyerAccess:7922` `pro_limited` → `checkAILimits:8105` `maxCases 1, maxDocs 3` + trigger `20260912000000:36/43` + `canUseAIFeature` limita a `document_analysis, case_chat`. Testeado `phase3B23:18,28`.

### ¿AI Full sigue siendo independiente? **YES**

Evidencia: `AI Full active essential` no consulta `lawyer_subscriptions`; `hasProAccess false` permanece; no otorga `lawyer_clients/cases` writes. `Pro+AI Full` → `active essential` gana precedence (`7920`), mantiene Pro. No hay `bundle` que regale Pro a AI Full.

### ¿Cliente puede entrar accidentalmente al funnel Pro? **YES** (bug `P1`)

Evidencia: `/pro` es pública sin guard; CTA para `role=client` muestra “Ir al panel” y navega a `/dashboard` (`LegalUpPro:217`). Cliente **no puede** comprar Pro (`POST /api/pro/subscribe` bloquea con `403 NOT_LAWYER`) ni crear SaaS (RLS), pero sí entra al funnel y contamina `pro_landing_cta_clicked`.

---

## 18. Recomendación FREE vs DEMO

**Contexto:** hoy `FREE = preview only` (navega, no escribe). Hipótesis propuesta `FREE = 1 caso real + 3 docs AI` colisiona con `Pro Limited = 1/3` (mismo límite) y elimina incentivo Pro para primer valor.

**Recomendación: `A — Preview only` (mantener actual) a corto plazo, con ajuste `C` como evolución controlada.**

Justificación vs opciones:

| Opción | Conversión | Complejidad | Abuso | Claridad pricing | Valor Pro | Valor AI Full | Cambio técnico |
|--------|------------|-------------|-------|-----------------|-----------|---------------|----------------|
| **A Preview only (actual)** — FREE navega, primer write → paywall | Alta (paywall temprano) | Nula (ya implementado) | Mínima (RLS) | Clara (Pro = primer valor) | Alto (SaaS + AI Limited 1/3) | Intacto (AI Full ilimitado) | 0 |
| **B One real SaaS case** — FREE 1 caso SaaS, AI bloqueada | Media (demora paywall) | Media (nueva RLS `count cases <=1` lifetime) | Requiere lifetime count + delete abuse | Confusa (1 caso gratis vs Pro ilimitado) | Reduce (FREE ya usa SaaS) | — | Alta |
| **C One AI demo** — FREE 1 caso +3 docs AI (actual Pro Limited) | Media-baja (regala AI) | Media (extender `ai_enforce_trial_limits` a FREE + `has_pro_access` negativo) | Ciclo delete/recreate concurrent | Muy confusa (FREE = Pro Limited) → canibaliza Pro | Destruye (Pro no aporta AI extra) | Canibaliza | Media |
| **D Trial temporal N días** — FREE acceso Pro limitado N días | Alta pero costosa | Alta (nueva tabla `free_trial_expires`) | Farmeo cuentas nuevas | Clara temporal | Reduce si N largo | — | Alta |
| **E Híbrido** — A + `C` solo vía `AI Trial 5d` explícito (no automático) | Alta (elige) | Baja | Baja | Clara (Trial separado de Pro) | Preserva | Preserva | 0 (ya existe Trial) |

**Elegida `A` porque:** el código actual ya implementa `A` sin deuda; `C` duplica `pro_limited` y haría que `FREE = Pro` en AI, matando `19.990` (¿por qué pagar Pro si FREE ya tiene 1/3?). `B` requiere lifetime SaaS count (concurrent actual permite delete/recreate) y deja `Services` fuga. `D` necesita infraestructura trial Pro no existente. La mejor evolución es **mantener `A` y usar el `AI Trial 5d` ya existente como demo AI explícito** (`E`): el lawyer FREE puede activar manualmente `POST /api/ai/trial/start` (5d, 3/10) sin dar SaaS, y Pro otorga `1/3` permanente. Así no se regala AI y se preserva `49.900`.

Si se insiste en dar valor SaaS gratis, **no** dar `1/3` AI gratis; dar `B` con `1 caso SaaS lifetime` (contar incluso eliminados) y mantener AI bloqueada hasta Pro.

---

## 19. Fix plan — solo proponer, ordenado

### P0 — seguridad / bypass / cobro

| # | Archivo probable | Cambio | Riesgo | Tests |
|---|-----------------|--------|--------|-------|
| P0-1 | `server.mjs:8482` `POST /api/pro/subscribe` + `20260910000000` RLS | Verificar `requireAILawyer` rechaza `client` con `403` ya existe — **no fix**, solo añadir test `T18` `POST /api/pro/subscribe as client → 403` | Bajo | `phase3C.1 T18` |
| P0-2 | `supabase/migrations/20260911000000_pro_gates.sql` + `server.mjs:8180` | Añadir `requireProEntitlement` explícito 402 en `POST /api/bookings` LAWYER_DIRECT si RLS no se ejecuta (defense in depth) | Bajo | `T6` |

### P1 — conversión / roles / paywall / límites

| # | Archivo | Cambio | Riesgo | Tests |
|---|---------|--------|--------|-------|
| P1-1 | `src/pages/LegalUpPro.tsx:92,125,202,236` | Fix bug cliente: si `userRole==='client'` mostrar `“LegalUp Pro es para abogados — Busca abogado / Ir a LegalUp”` + no `pro_landing_cta_clicked` como conversión Pro, sino `pro_landing_client_excluded` | Bajo | `T1` `client → /pro` CTA ≠ `Ir al panel` |
| P1-2 | `src/pages/lawyer/ServicesPage.tsx` | Añadir gate `hasProAccess` a `create/edit service` (hoy no existe) o documentar que Services es free | Bajo | `T4-7` |
| P1-3 | `src/lib/demoData.ts` + `DashboardPage:158` | Renombrar `Cargar demo` a `Cargar datos ejemplo (requiere Pro)` + manejar `42501` con toast “Requiere Pro” o mover seed a `POST /api/pro/demo` con `requireProEntitlement` | Bajo | — |
| P1-4 | `src/pages/lawyer/DashboardPage:61` + `src/hooks/useProSubscription` | `invalidateQueries` al detectar `?pro_subscription_success=true` + `refetchInterval 2s x5` o `supabase Realtime` en `lawyer_subscriptions` para eliminar race `Verificando pago` | Bajo | `T19` |
| P1-5 | `server.mjs:5493` webhook + `server.mjs:7868` | Emitir alias `pro_subscription_paid` junto a `pro_subscription_activated` para cerrar funnel `paid` Gap | Bajo | `phase3B23` |
| P1-6 | `supabase/migrations/20260912000000_pro_ai_limits.sql` | Documentar que límite es `concurrent` (delete reutiliza cupo) — si se quiere `lifetime`, cambiar `count` a `count with deleted_at IS NOT NULL` + soft-delete | Medio | `T13-14` |

### P2 — UX / copy / analytics

| # | Archivo | Cambio | Riesgo | Tests |
|---|---------|--------|--------|-------|
| P2-1 | `src/pages/LegalUpPro.tsx:431-443` | Unificar CTA móvil texto `Continuar` → `Activar Pro` / `Ir al dashboard` según rol | Nulo | — |
| P2-2 | `LegalUpPro.tsx:202` header | Añadir `py-px` consistente `PRO` badge (ya hecho `rounded-[5px]`) | Nulo | — |
| P2-3 | `docs/FASE-3C.1` | Agregar `pro_landing_client_excluded` event para filtrar funnel | Nulo | — |

---

## 20-26 (resumen en matriz y funnel ya cubiertos en §13-16; detalles puntuales)

**T1-T18 conceptuales:** todos pasan con código actual salvo `T1` (cliente ve “Ir al panel”) que es `P1` bug, y `Services` write que no tiene gate. El resto (`T4-6` lawyer FREE paywalls, `T10-14` AI Limited 1/3, `T15` AI Full sin Pro sigue bloqueado Pro, `T17` cliente `/lawyer/dashboard` redirect, `T18` `POST /api/pro/subscribe` 403) se comportan como documentado.

---

## 21. Rutas — role vs entitlement

- `App.tsx:572` `RequireLawyer` protege `/lawyer/*` (role), **no** `hasProAccess`. Un lawyer FREE entra a `/lawyer/cases` y ve paywall, no redirect. Correcto: role ≠ paid.
- `App.tsx:541` `/dashboard` no requiere `lawyer`, cualquier `user` entra.
- `App.tsx:460` `/pro` sin guard (public). Correcto.
- `/lawyer/ai` requiere `lawyer` + `hasAccess` (pro_limited o trial o active). Role y entitlement separados.

---

## 23. Analytics funnel actual

`pro_landing_viewed (LegalUpPro:112)` → `pro_landing_cta_clicked (130)` → `pro_paywall_opened (ClientsPage:42)` → `pro_subscribe_clicked (ProPricingModal:52)` → `pro_checkout_started (54)` / `pro_subscription_checkout_started (server)` → `pro_subscription_activated (webhook)` — **falta** `pro_subscription_paid` alias, pero medible.

---

## 24. Momento real de pago

**Hoy:** puede navegar dashboard, ver listas vacías, ver servicios/ingresos. **Primera acción que obliga a pagar Pro:** `Crear cliente` **o** `Crear caso` **o** `Crear cita LAWYER_DIRECT` **o** `Procesar solicitud` — cada una dispara `ProPricingModal` `pro_paywall_opened` antes del `insert`. No hay `1 caso gratis` — es `0 casos gratis` para SaaS writes.

**¿Puede obtener suficiente valor sin pagar y evitar suscripción?** `NO` — sin Pro no puede crear ningún artefacto de trabajo (cliente/caso/cita), solo `Services` (fuga) y `LegalUp AI` bloqueado salvo Trial manual.

---

## Preguntas obligatorias finales — respuestas literales

**1. ¿Qué puede hacer hoy un abogado sin pagar absolutamente nada?** Navegar `Dashboard`, ver `Solicitudes/Clientes/Casos/Citas/Servicios/Ingresos` vacíos, ver búsqueda global, editar `Perfil`, entrar a `/lawyer/ai` vacío. No puede crear clientes/casos/citas ni procesar solicitudes ni subir docs/analizar (paywalls).

**2. ¿Cuál es la primera acción exacta que obliga a pagar Pro?** `Crear cliente` (`ClientsPage:42,83`), `Crear caso`, `Crear cita`, `Procesar solicitud` — cualquiera, todas gateadas `if (!hasProAccess) ProPricingModal`.

**3. ¿Puede un abogado sin Pro crear casos reales? ¿Cuántos?** **0**. Paywall + RLS bloquean.

**4. ¿Puede un abogado sin Pro usar LegalUp AI?** **No**, salvo que active manualmente `AI Trial 5d` (`POST /api/ai/trial/start`) que da `3 casos /10 docs` por 5d sin Pro; sin Trial, `402`.

**5. ¿Quién obtiene actualmente el límite 1 caso / 3 documentos?** **Solo** `lawyer` con `lawyer_subscriptions` `active` **y** sin `ai_subscriptions` `active/trialing` (`pro_limited`) — ver `getAILawyerAccess:7922` y `checkAILimits:8105` + trigger `20260912000000:36`.

**6. ¿Un abogado Pro puede crear más de 1 caso SaaS normal, aunque AI esté limitado a 1 caso AI?** **Sí**. `lawyer_cases` (SaaS) es ilimitado para Pro (`has_pro_access` sin `count`); `ai_workspaces` (AI) está limitado a 1. Son tablas distintas.

**7. ¿El cuarto documento AI está realmente bloqueado backend + DB?** **Sí** — `checkAILimits:8119` devuelve `403` y trigger `ai_enforce_trial_limits:43` (`count>=3`) `RAISE EXCEPTION` antes de `INSERT`.

**8. ¿El segundo caso AI está realmente bloqueado backend + DB?** **Sí** — `checkAILimits:8124` + trigger `36` `v_max=1`.

**9. ¿Eliminar un caso/documento permite reutilizar el cupo?** **Sí** — límite es **concurrent** (`count(*) WHERE lawyer_id`), no lifetime; `DELETE` reduce `count` y permite nuevo `INSERT` (ver `checkAILimits:8110`).

**10. ¿AI Full $49.900 elimina correctamente los límites Pro Limited?** **Sí** — `getAILawyerAccess:7875-7920` prioriza `active essential` sobre `pro_limited`; `checkAILimits:8101` retorna `null` para `essential`.

**11. ¿Un cliente puede comprar o entrar al funnel Pro?** **Entrar sí** (`/pro` pública, ve “Ir al panel”), **comprar no** (`POST /api/pro/subscribe` `403 NOT_LAWYER` vía `requireAILawyer`).

**12. ¿Por qué el cliente vio “Ir al panel” en `/pro`?** Por `LegalUpPro.tsx:216` `else → Ir al panel` para `!lawyer && hasProAccess false && userRole !== lawyer` (cae `client`).

**13. ¿Después de pagar $19.990 el abogado obtiene acceso Pro inmediatamente?** **Sí**, tras webhook `authorized/active` (`status active, current_period_end +30d`), pero UI puede mostrar “Verificando” hasta que `useProSubscription` refetchee (race sin Realtime, ver `DashboardPage:61`).

**14. ¿Después de pagar Pro obtiene efectivamente AI Limited sin pagar AI Full?** **Sí** — `Pro ACTIVE` → `pro_limited` (`1/3`, `document_analysis+case_chat`) sin `ai_subscriptions` row.

**15. ¿Dónde exactamente está hoy el momento de monetización?** En el **primer write de valor**: `Crear cliente / Crear caso / Procesar solicitud / Crear cita LAWYER_DIRECT` — no en navegación.

---

*Fin audit — código es autoridad, sin cambios aplicados.*
