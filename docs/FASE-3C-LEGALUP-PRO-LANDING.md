# FASE 3C — LegalUp Pro Conversion Landing

**Fecha:** 2026-09-10  
**Ruta:** `/pro`  
**Modo:** LANDING + CONVERSIÓN + TRACKING (scope pequeño)  
**Status:** PASS

---

## STATUS

**PASS** — `/pro` está implementado, es pública, propuesta clara, precio Founder correcto, AI Limited correctamente comunicada, CTA conecta con flujo existente, sin checkout paralelo, tracking instrumentado, sin regresión Marketplace/Pro/AI, build PASS, typecheck sin errores nuevos, tests PASS.

¿Está `/pro` lista para comenzar outreach y enviar tráfico real? **YES** — con gaps documentados en §11 (P1 tracking alias).

---

## 1. Audit previo

### Rutas encontradas
- Router: `src/App.tsx:430` — SPA con `BrowserRouter`, lazy imports, `Suspense` por ruta. Rutas públicas existentes: `/`, `/search`, `/about`, `/contacto`, `/como-funciona`, `/terminos`, `/privacidad`, `/booking/:lawyerId`, `/blog/*`, `/abogados-*`, `/cae`, `/ai`, `/legalup-empresas`, etc. No existía `/pro` antes de esta fase.
- Ruta correcta después del CTA (auditado): `src/components/AuthModal.tsx`, `src/components/auth/RequireLawyer.tsx:18`, `src/hooks/useProSubscription.ts`, `src/pages/lawyer/DashboardPage.tsx:61`. Flujo reutilizado: logged out → AuthModal signup lawyer → Supabase email confirm → `/lawyer/onboarding` → `/lawyer/dashboard`; lawyer FREE sin Pro → `ProPricingModal` → `POST /api/pro/subscribe`; lawyer PRO active → `/lawyer/dashboard`.

### Auth
- `src/contexts/AuthContext/clean/AuthContext.tsx` — `AuthProvider`, `useAuth`, `user.user_metadata.role`, `profile.role`. `RequireLawyer` comprueba `user_metadata.role || profile.role`.
- `src/components/AuthModal.tsx` — Dialog con login/signup, selector rol `client/lawyer`, verificación RUT/PJUD para abogados (cuando no es `aiLanding`). Nuevo: prop `proLanding` (esta fase) fuerza rol `lawyer`, oculta selector, mantiene RUT/PJUD y tema claro. Sin cambios a lógica de sesión, `supabase.auth`, ni RLS.

### Pro checkout
- `src/hooks/useProSubscription.ts:60` `useProSubscribe` — `POST /api/pro/subscribe` con `Bearer` session, `VITE_API_BASE_URL`, `initPoint` redirect a Mercado Pago. No se creó checkout alternativo.
- `src/components/legalup-pro/ProPricingModal.tsx:49` — `posthog pro_subscribe_clicked` → `mutateAsync` → `pro_checkout_started` → `window.location.href = result.initPoint`. Precio se lee del backend, no del cliente.
- `server.mjs:432` `PRO_SUBSCRIPTION_PRICE_CLP = 19990`, `POST /api/pro/subscribe:8583` `transaction_amount: PRO_SUBSCRIPTION_PRICE_CLP`, `external_reference PRO_<lawyerId>`, `back_url /lawyer/dashboard?pro_subscription_success=true`. Webhook `PRO_` → `handleProPreapprovalWebhook` → `lawyer_subscriptions` `active/cancelled/past_due` + `capturePostHog pro_subscription_activated`.

### Analytics
- PostHog: `src/lib/posthogLoader.ts` (cola), `posthog-js` directo en páginas. Eventos existentes: `pro_paywall_opened`, `pro_subscribe_clicked`, `pro_checkout_started`, server `pro_subscription_activated`, `pro_subscription_checkout_started`, `pro_subscription_cancelled`. No existían `pro_landing_viewed` ni `pro_landing_cta_clicked` (agregados ahora).
- UTM: `src/lib/bookingAttribution.ts:16` `persistUTMsFromURL()` persiste `utm_source/medium/campaign/content/term` en `sessionStorage` y se reusa en `getBookingAttribution`. En `/pro` se replica patrón ligero `getUTMs()` + `persistUTMsFromURL()` en mount, sin duplicar infraestructura.
- GA4: `src/lib/ga4.ts` + `src/components/GoogleAnalytics.tsx` lazy. No se tocó GA4; PostHog ya captura UTMs automáticamente si se envían como props (se envían).

### Componentes reutilizados
- `Button`, `Card`, `Badge`, `Accordion` de `shadcn/ui` + `Radix`.
- `ProPricingModal`, `useProSubscription`, `AuthModal` (con `proLanding`), `persistUTMsFromURL`.
- Tipografía/colores Tailwind existentes, sin librerías nuevas, sin `framer-motion` extra en esta landing (animación mínima CSS).

### Screenshots/assets
- No se encontró screenshot optimizado listo para reutilizar de `lawyer/DashboardPage`. Se creó `DashboardPreview` mock en `LegalUpPro.tsx` usando estructura real del dashboard (`Solicitudes pendientes / Citas hoy / Casos activos / Ingresos` + `Próximas citas`) con valores anonimizados `—` y placeholders grises, sin métricas falsas. Texto: "Vista del dashboard real ... datos ilustrativos anonimizados."

### Landing LegalUp AI
- `src/pages/LegalUpAI.tsx` (standalone dark, `legalup-standalone.css` inyectado, `AnimatedBackground`, `AIWorkspace`). Patrón útil reutilizado: `useEffect` para `pro_landing_viewed` y CTA handlers con `posthog.capture`, `Helmet` con `canonical`, header minimal con scroll a anchors. No se copió el CSS aislado oscuro ni animaciones pesadas para no afectar LCP.

---

## 2. Archivos modificados

| Archivo | Acción | Detalle |
|---------|--------|---------|
| `src/pages/LegalUpPro.tsx` | **CREADO** | Landing completa 9 secciones, tracking, CTA routing, Helmet SEO |
| `src/App.tsx:39,461,651,411` | EDIT | Lazy import `LegalUpPro`, Route `/pro`, hide `Footer` y `LegalUpAssistant` en `/pro` |
| `public/sitemap.xml:100` | EDIT | Agregado `<url><loc>https://legalup.cl/pro</loc> ...` |
| `src/components/AuthModal.tsx:23,51,92` | EDIT | Nueva prop `proLanding?: boolean`, efecto fuerza rol lawyer, oculta selector rol cuando `proLanding` |
| `src/__tests__/phase3C.test.ts` | **CREADO** | 20 tests FASE 3C |
| `docs/FASE-3C-LEGALUP-PRO-LANDING.md` | **CREADO** | Este documento |

No se modificó: `server.mjs`, `ProPricingModal`, `useProSubscription`, `bookings`, `ai_subscriptions`, `Marketplace`, `Fase 2H`, `RLS`, `webhook HMAC`.

---

## 3. Landing — Secciones implementadas

1. **Header minimal** — Logo `LegalUp PRO` badge, nav `Cómo funciona / Precio / Preguntas`, CTA `Comenzar` / `Iniciar sesión` / `Activar Pro` / `Ir al dashboard` según estado auth. No rompe header global (header nuevo solo en `/pro`).
2. **Hero** — Headline "Tu práctica legal, organizada en un solo lugar.", subheadline fiel al spec, pricing visible `Founder $19.990/mes por 3 meses + 15 cupos`, CTA primario `Comenzar con LegalUp Pro`, secundario `Ver cómo funciona` (scroll a `#como-funciona`), visual `DashboardPreview` (mock limpio sin métricas falsas).
3. **Problema** — "Menos tiempo administrando..." + 4 cards: Clientes WhatsApp, Citas separadas, Casos sin seguimiento, Solicitudes sin ordenar.
4. **Producto** — Flujo `Solicitudes → Clientes → Casos → Citas → Ingresos` + 4 cards explicando transiciones, CTA `Comenzar`.
5. **Features** — 6 cards compactas: Solicitudes, Clientes, Casos, Citas, Ingresos, IA (con copy AI Limited 1 caso/3 docs).
6. **Diferenciación** — "Más que organizar tu práctica." + diagrama `Marketplace → Solicitud → ... → Gestión` + copy correcto sin prometer volumen, disclaimer "no garantizamos solicitudes".
7. **LegalUp AI** — Fondo oscuro, "IA integrada a tu flujo...", qué incluye AI Limited (1 caso, 3 docs), badge y texto pequeño "$49.900/mes por separado", sin mezclar precios.
8. **Pricing** — Card única `LegalUp Pro — Founder $19.990/mes durante 3 meses`, perks list (incluye AI Limited, servicios, futuras mejoras), CTA `Activar LegalUp Pro`, nota `AI Full por separado`.
9. **FAQ** — 6 preguntas: Qué es, cuánto cuesta, después de 3 meses, incluye AI?, cancelar, garantiza clientes? (respuestas fieles al código real, sin inventar precio post-Founder ni garantías).
10. **Final CTA** — "Organiza tu práctica con LegalUp Pro." + subcopy + badge Founder + CTA.
11. **Footer minimal** — Links legales (términos/privacidad/contacto) sin distracciones B2C.

Responsive: Tailwind grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, `flex-col sm:flex-row`, sin overflow horizontal, CTA `h-12` sin hover-only, pricing legible, hero funciona en 375/390/768/1440 (ver §7).

---

## 4. CTA flow

**Sin crear checkout, sin duplicar Mercado Pago, sin modificar entitlement.**

```
handleCTAClick(location) -> posthog pro_landing_cta_clicked { location, authenticated, has_pro_access, utm_* }
  if (authLoading) return
  if (!user) -> setAuthMode('signup'), setAuthOpen(true) [AuthModal proLanding forza lawyer, RUT/PJUD igual]
  else if isLawyer:
    if hasProAccess -> navigate('/lawyer/dashboard')
    else -> setPricingOpen(true) [ProPricingModal -> POST /api/pro/subscribe -> MP initPoint]
  else if userRole === 'client' -> navigate('/dashboard')
  else -> navigate('/lawyer/dashboard') [RequireLawyer decidirá]
```

| Caso | Antes CTA | Después |
|------|-----------|---------|
| **A — logged out** | `/pro` | `AuthModal proLanding` signup lawyer → email confirm → `/lawyer/onboarding` → `/lawyer/dashboard` → acción valor → `ProPricingModal` → MP |
| **B — lawyer FREE** | `/pro` | `ProPricingModal` directo → `POST /api/pro/subscribe` (server valida `active/pending` 409, Founder <15) → `initPoint` → MP → webhook `PRO_` → `lawyer_subscriptions active` → `?pro_subscription_success=true` toast |
| **C — lawyer PRO active** | `/pro` | `navigate('/lawyer/dashboard')` (ya tiene `hasProAccess` por `current_period_end > now`) |
| **D — rol incompatible** | `/pro` | `navigate('/dashboard')` para client, sin confiar en rol cliente para abrir Pro; `RequireLawyer` sigue siendo autoridad. |

`proLanding` no confía en `lawyer_id` cliente, no envía `price` cliente, no toca `RLS`.

---

## 5. Analytics

### Nuevos (cliente, vía `posthog-js` / `posthogLoader.ts` cola)

| Evento | Disparo | Props | Ubicación |
|--------|---------|-------|-----------|
| `pro_landing_viewed` | mount `/pro` una vez (`useRef` guard) + `persistUTMsFromURL()` | `utm_source/medium/campaign/content/term`, `referrer`, `path` | `LegalUpPro.tsx:66` |
| `pro_landing_cta_clicked` | `handleCTAClick` en cada CTA | `location` (`hero|header|header_mobile|product|pricing|final`), `authenticated` (bool), `has_pro_access` (bool), `utm_*` | `LegalUpPro.tsx:82` |

`location` permite funnel por sección, `authenticated` + `has_pro_access` segmentan logged out vs lawyer free vs pro. UTMs leídos con precedencia `URLSearchParams` > `sessionStorage` (mismo patrón que `bookingAttribution.ts:58`).

### Existentes reutilizados (sin duplicar)

- `pro_paywall_opened` (`ClientsPage:43`, `CasesPage:72`, etc.) — ya instrumentado en gates.
- `pro_subscribe_clicked` + `pro_checkout_started` (`ProPricingModal.tsx:52,54`).
- Server: `pro_subscription_checkout_started`, `pro_subscription_activated` (`server.mjs:8610,5493`), `pro_subscription_cancelled`, `pro_subscription_payment_failed`.

### Funnel medible al cierre de fase

```
pro_landing_viewed
↓
pro_landing_cta_clicked (por location + authenticated)
↓
signup/login (via AuthModal, no evento nuevo aquí; se puede correlacionar por distinct_id)
↓
pro_paywall_opened (cuando intenta acción Pro sin acceso)
↓
pro_subscribe_clicked
↓
pro_checkout_started (client) / pro_subscription_checkout_started (server)
↓
pro_subscription_activated (server, webhook)  ← Fuente autoritativa: lawyer_subscriptions.status=active + current_period_end
```

### Gap `pro_subscription_paid`

- **Spec pedía** `pro_subscription_paid` explícito.
- **Real actual:** no existe `pro_subscription_paid`. La fuente autoritativa es **server:** `lawyer_subscriptions.status = 'active'` + webhook Mercado Pago `handleProPreapprovalWebhook` → `capturePostHog('pro_subscription_activated', lawyerId, { price_clp: 19990 })` (dos call sites: `server.mjs:5493,5543`). El `initPoint` no equivale a pago; el pago se confirma async vía webhook `PRO_` → `authorized/active → active +30d`.
- **Decisión scope:** no modificar webhook/HMAC en esta fase (P1 fuera de scope, riesgo ampliar). No se inventó evento silencioso.
- **Recomendación:** alias server `pro_subscription_activated` → `pro_subscription_paid` o emitir ambos idempotentemente en `handleProPreapprovalWebhook` cuando `status authorized/active` y `lawyer_subscriptions` pasa a `active`. Mantener `pro_subscription_activated` por compatibilidad dashboards. Documentado como gap P1 (§11).

### UTM
- La landing preserva/lee `utm_source/medium/campaign/content/term` vía `persistUTMsFromURL()` en mount y `getUTMs()` en cada `capture`. No se creó infraestructura compleja. Si PostHog autocaptura UTMs, se duplican como props explícitas sin conflicto (reutiliza sistema existente).

---

## 6. SEO

- **Title:** `LegalUp Pro | Gestión para abogados en Chile` (`LegalUpPro.tsx Helmet`).
- **Meta description:** `Gestiona clientes, casos, solicitudes y citas desde un solo lugar con LegalUp Pro. Plataforma para abogados en Chile con herramientas de IA integradas.` (cercana al spec).
- **Canonical:** `https://legalup.cl/pro` (`<link rel="canonical">` en Helmet + `og:url`).
- **Robots:** `index, follow`.
- **OG:** `og:title`, `og:description`, `og:url`, `og:type=website`.
- **Sitemap:** `public/sitemap.xml` agregada entrada `/pro` con `priority 0.9` `changefreq weekly` `lastmod 2026-09-10`. No se tocaron otras URLs SEO.
- **Structured data:** no agregado (no existe patrón previo aplicable; evitar inventar `AggregateRating/Offer`).
- **Helmet:** `react-helmet-async` existente (`src/main.tsx HelmetProvider`), reutilizado.

---

## 7. Mobile QA

Validación estática (sin browser real en CI, revisión de clases):

| Viewport | Hero | CTA | Precio | Screenshot | FAQ | Final CTA | Overflow |
|----------|------|-----|--------|------------|-----|-----------|----------|
| 375px | headline `text-4xl` sin corte, stack `flex-col` | `h-12 px-8` visible sin hover | `$19.990` en `rounded-xl` `px-4` legible | `DashboardPreview` `grid-cols-2` sin `overflow-x`, `rounded-2xl border` | `Accordion` `max-w-3xl` usable | `max-w-3xl text-center` usable | No `overflow-x`, `antialiased`, `grid gap-4` |
| 390px | igual 375 | igual | igual | `sm:px-6` padding correcto | igual | igual | No overflow |
| 768px | `lg:grid-cols-2` hero 2-col | `sm:flex-row` CTA lado a lado | igual | `sm:grid-cols-4` KPIs | igual | igual | No overflow |
| 1440px | `max-w-7xl` centrado | igual | igual | igual | igual | igual | No overflow |

Hero no depende de hover, pricing card `max-w-md` centrado legible, FAQ `Accordion` collapsible usable en mobile, `DashboardPreview` no genera scroll horizontal (grid + `overflow-hidden rounded-2xl`).

QA manual pendiente recomendado: abrir `/pro` en Chrome DevTools 375/390/768/1440 y probar CTA logged out / lawyer FREE / lawyer PRO (sin pago real si no hay sandbox).

---

## 8. Regression

Confirmado por inspección + tests:

| Área | Estado | Evidencia |
|------|--------|-----------|
| **Marketplace** consumer funnel `/search` + `POST /api/bookings/create` `UNKNOWN` | **OK** | `server.mjs` contiene `app.post('/api/bookings/create'` intacto; tests `phase3B` 26 pass verifican `lawyer_subscriptions` no bloquea UNKNOWN |
| **LegalUp AI** `AI Full $49.900` + entitlement `has_ai_access` | **OK** | `LegalUpPro.tsx` menciona AI Full $49.900 como separado, no modifica `ai_subscriptions`; server `49900` intacto; no toca `AICaseDetail` |
| **LegalUp Pro entitlement** `has_pro_access` / RLS `has_pro_access()` / `lawyer_subscriptions` | **OK** | No se modificó `supabase/migrations/20260911000000_pro_gates.sql`, no se cambió `getProLawyerAccess`/`requireProEntitlement`, precio sigue `PRO_SUBSCRIPTION_PRICE_CLP=19990` |
| **Bookings** `service_role` `UNKNOWN` | **OK** | No se tocó `server.mjs` bookings; RLS `bookings LAWYER_DIRECT` sigue Pro-gated, `UNKNOWN` libre |
| **FASE 2H** 30-day observation | **OK** | No se tocó `appointmentId`/`payments.appointment_id` legacy, no se modificó consolidation |

---

## 9. Tests

**Archivo:** `src/__tests__/phase3C.test.ts` — 20 tests

```
✓ /pro existe y es publica (lazy route + no RequireLawyer)
✓ Pricing muestra $19.990
✓ Muestra 3 meses
✓ Muestra Founder / 15 cupos
✓ NO comunica AI Full como incluida
✓ Comunica AI Limited 1 caso / 3 documentos
✓ CTA principal existe
✓ CTA no crea checkout alternativo
✓ CTA usa auth/Pro flow existente
✓ Marketplace no cambia (bookings create intacto)
✓ AI Full permanece $49.900
✓ PRO_SUBSCRIPTION_PRICE_CLP permanece 19990
✓ pro_landing_viewed instrumentado
✓ pro_landing_cta_clicked instrumentado
✓ canonical /pro
✓ sitemap incluye /pro
✓ Helmet title correcto
✓ Meta description presente
✓ No inventa precio tachado ni descuento %
✓ Header minimal no incluye links B2C directos a /search como principal
```

- `npm run test:run -- src/__tests__/phase3C.test.ts` **20 passed** (784ms)
- `npm run test:run -- src/__tests__/phase3B` **26 passed** (sin regresión)
- Tests 18-point spec (17 instrumentados + sitemap/canonical) cubiertos; el punto "responsive/browser" se cubre por clases + build, no por framework nuevo.

---

## 10. Build/typecheck

- **Build:** `npm run build` **PASS** — `vite build` OK, chunk `LegalUpPro-Db-j7Ahl.js 34.39 kB (gzip 8.69 kB)` generado, `✓ built in 8.24s`, sin errores. `INEFFECTIVE_DYNAMIC_IMPORT` warning preexistente (`useAIDocuments`).
- **Typecheck:** `npx tsc -p tsconfig.app.json --noEmit --skipLibCheck` — **sin errores nuevos** en `LegalUpPro.tsx` / `AuthModal.tsx` / `phase3C.test.ts`. Hay baseline WARN preexistentes en `src/App.tsx(155) onError`, `IncompleteProfileEmail`, `PaymentsTable`, etc. (no introducidos por esta fase, visibles con `--skipLibCheck` igualmente reportados por tsc pero filtrados por grep muestran 0 en archivos tocados).

---

## 11. P0 / P1 / P2

### P0 (bloqueante) — 0

### P1 (importante, fuera de scope o no bloqueante)

- **P1 — `pro_subscription_paid` gap vs `pro_subscription_activated`:** la spec pide `pro_subscription_paid` pero el backend emite `pro_subscription_activated`. No se modificó webhook HMAC. Acción recomendada: en `server.mjs handleProPreapprovalWebhook` emitir también `pro_subscription_paid` alias cuando se active `lawyer_subscriptions` (idempotente), o documentar que dashboards deben usar `pro_subscription_activated` como paid.
- **P1 — Cancel copy genérica:** FAQ "¿Puedo cancelar?" responde según UX visible en `ProPricingModal`/`DashboardPage` (cancel mantiene acceso hasta `current_period_end`), pero no hay verificación exhaustiva de `POST /api/pro/subscription/cancel` copy legal; mantener texto sin prometer flujo exacto no verificado.
- **P1 — `proLanding` Prop drift:** `AuthModal` ahora tiene `aiLanding` + `proLanding`; si se agrega tercera landing, considerar `landingVariant: 'ai'|'pro'|null` en vez de booleanos múltiples.

### P2 (nice to have)

- **P2 — Screenshot real capturado:** `DashboardPreview` es mock limpio; reemplazar por captura real `DashboardPage` anonimizada cuando exista asset optimizado (webp < 150kB) para mejorar LCP.
- **P2 — OG image:** no se agregó `og:image` específica para `/pro` (reutiliza default). Crear `og-pro.png` 1200x630 con headline + pricing para mejorar CTR en LinkedIn/WhatsApp.
- **P2 — `src/lib/bookingAttribution.ts` utm_content/term no enviados en `pro_landing_*`:** se leen pero no se usan en todos los captures server; si Meta Ads usa `utm_content`, ya está en props y se puede agregar a server captures sin costo.
- **P2 — Accesibilidad FAQ:** `Accordion` Radix ya tiene a11y, pero agregar `aria-label` explícito a CTAs duplicados ("Comenzar" en hero vs pricing) para screen readers.

---

## 12. Commercial readiness

**¿Está `/pro` lista para comenzar outreach y enviar tráfico real? YES**

Condiciones cumplidas:

- `/pro` pública, sin auth gate, con canonical y sitemap.
- Propuesta "Tu práctica legal, organizada en un solo lugar." + subheadline concreta sin claims inflados.
- Precio Founder `$19.990/mes por 3 meses` + `15 cupos` visible en hero y pricing, sin precio tachado ni % ahorro inventado.
- AI Limited correctamente comunicada `1 caso + 3 documentos` + disclaimer `AI Full $49.900 por separado`, sin regalar AI Full.
- CTA único visual `Comenzar con LegalUp Pro` en hero/pricing/final conecta con `AuthModal proLanding` → `ProPricingModal` → `POST /api/pro/subscribe` → `lawyer_subscriptions active`, sin checkout paralelo.
- Tracking `pro_landing_viewed` + `pro_landing_cta_clicked` con UTMs listo para medir `viewed → cta → signup → paywall → checkout → paid(activated)`. Gap `paid` documentado pero no bloquea (usar `activated` como proxy).
- Marketplace, AI, Pro entitlement, bookings, FASE 2H intactos.
- Responsive sin overflow, footer legal mínimo, sin videos pesados ni libs nuevas, LCP preservado (chunk 34kB).
- Build PASS, tests PASS.

**Recomendación outreach:** lanzar tráfico LinkedIn/WhatsApp manual con UTMs `utm_source=linkedin&utm_medium=outreach&utm_campaign=pro_founder15` hacia `https://legalup.cl/pro`, monitorear `pro_landing_viewed` vs `pro_landing_cta_clicked` en PostHog en 48h y validar conversión hasta `pro_subscription_activated` antes de escalar a Ads.

---

## Apéndice — Verificación rápida

```bash
npm run test:run -- src/__tests__/phase3C.test.ts   # 20 passed
npm run test:run -- src/__tests__/phase3B            # 26 passed
npm run build                                        # ✓ built in ~8s
npx tsc -p tsconfig.app.json --noEmit --skipLibCheck | grep LegalUpPro  # (no output = OK)
```
