# FASE 3C.2B — Gate de `ServicesPage` con LegalUp Pro

**Fecha:** 2026-09-11  
**Commit base:** `ec965bb` (`fix(pro): client role on /pro`)  
**Modo:** FIX aislada — `ServicesPage` create/edit/delete + RLS

---

## STATUS

`PASS`

---

## 1. Audit previo

**Archivo:** `src/pages/lawyer/ServicesPage.tsx:41` (811 líneas)

**Handlers encontrados:**

* `handleAddService:93` — crea `editingService` vacío (`id:null`) y abre `Dialog` `isModalOpen=true`. Sin gate previo, sin `hasProAccess`, sin `posthog`.
* `handleEditService:108` — parsea `delivery_time` (`|`), carga `setEditingService({ id, title, ... })` y abre modal. Sin gate.
* `handleSaveService:163` — valida `title/description/price`, construye `serviceData` (`title, description, price_clp, delivery_time, features, available, requires_quote`), luego `if (editingService.id) UPDATE` else `INSERT` con `lawyer_user_id=user.id`. Direct `supabase.from('lawyer_services')`. Sin gate.
* `handleDeleteClick:308` — `setServiceToDelete(id)` + `setIsDeleteDialogOpen(true)`. Sin gate.
* `handleDeleteService:313` — `supabase.from('lawyer_services').delete().eq('id', serviceToDelete)`. Sin gate.
* `fetchServices:64` — `useEffect` `supabase.from('lawyer_services').select('*').eq('lawyer_user_id', user.id)`. SELECT free, sin gate (correcto).

**Hook/query:** `useAuth` + `supabase` directo, no `useProSubscription`. No `ProPricingModal`.

**Tabla:** `lawyer_services` (`lawyer_user_id uuid FK profiles, title, description, price_clp, delivery_time, features[], available, requires_quote, created_at`).

**RLS actual (antes):** `supabase/migrations/20260907000000_rls_gap_closure.sql:30-56`

* `lawyer_services_public_select` `FOR SELECT TO anon,authenticated USING (true)` — público marketplace.
* `lawyer_services_owner_insert` `WITH CHECK (auth.uid()::text = lawyer_user_id::text)` — solo owner, **sin** `has_pro_access`.
* `lawyer_services_owner_update` `USING + WITH CHECK (auth.uid()::text = lawyer_user_id::text)` — owner, sin Pro.
* `lawyer_services_owner_delete` `USING (auth.uid()::text = lawyer_user_id::text)` — owner, sin Pro.

→ FREE podía `INSERT/UPDATE/DELETE` directo vía Supabase, bypass frontend (fuga confirmada FASE 3C.1 §8).

**Analytics existentes:** ninguno Pro en esta página (solo `useToast`). Resto SaaS usa `pro_paywall_opened` (`ClientsPage:42` etc), patrón reutilizable.

**Cómo abre `ProPricingModal` en otros:** `ClientsPage:26,42` `const {hasProAccess}=useProSubscription(); const [proPaywallOpen,setProPaywallOpen]=useState(false); if(!hasProAccess){posthog.capture('pro_paywall_opened',{action:'create_client'}); setProPaywallOpen(true); return;}` + `<ProPricingModal open={proPaywallOpen} triggerAction="create_client"/>`.

---

## 2. Archivos modificados

| Archivo | Acción | Líneas |
|---------|--------|--------|
| `src/pages/lawyer/ServicesPage.tsx` | EDIT | + import `useProSubscription`, `ProPricingModal`, `posthog`; + state `hasProAccess`, `proPaywallOpen`, `proPaywallAction`; gate `handleAddService` `create_service`, `handleEditService` `edit_service`, `handleSaveService` (ambos caminos) + `handleDeleteClick`/`handleDeleteService` `delete_service`; + `<ProPricingModal>` |
| `supabase/migrations/20260916000000_pro_gate_lawyer_services.sql` | **CREADO** | 36 líneas — nuevas políticas `has_pro_access` para `lawyer_services` |
| `src/__tests__/phase3C2B.test.ts` | **CREADO** | 13 tests |
| `docs/FASE-3C.2B-PRO-SERVICES-GATE.md` | **CREADO** | este informe |

No tocado: `pricing`, `PRO_SUBSCRIPTION_PRICE_CLP`, `server.mjs` MP `PRO_`, `lawyer_subscriptions`, `ai_*`, `demoData`, `/pro`, `/api/bookings/create`, `Founder 15`.

---

## 3. Frontend gate — create / edit / delete

**Hook:** `const { hasProAccess } = useProSubscription();` (`ServicesPage:44`) — autoridad `lawyer_subscriptions` `active/cancelled+period>now`.

**State:** `proPaywallOpen` + `proPaywallAction: 'create_service'|'edit_service'|'delete_service'` para `triggerAction`.

**Create (`handleAddService:93`):**

```tsx
if (!hasProAccess) {
  posthog.capture('pro_paywall_opened', {action:'create_service'});
  setProPaywallAction('create_service'); setProPaywallOpen(true); return;
}
setEditingService({...}); setIsModalOpen(true);
```

Button `Nuevo Servicio` (`467`) y empty-state `Nuevo Servicio` (`639`) pasan por este handler.

**Edit (`handleEditService:108`, `handleSaveService:163`):** `handleEditService` gatea antes de parsear `delivery_time`; `handleSaveService` gatea al inicio (`if (!hasProAccess) capture edit/create + modal return`) antes de cualquier `supabase.from(...).update/insert`, evitando bypass via Dialog abierto previamente.

**Delete (`handleDeleteClick:308`, `handleDeleteService:313`):** ambos gatean `delete_service` antes de `setServiceToDelete`/`supabase.delete`.

**Read:** `fetchServices:64` SELECT sin gate, `services.map` render sin gate. FREE ve lista y empty state.

**Modal:** `<ProPricingModal open={proPaywallOpen} onOpenChange={setProPaywallOpen} triggerAction={proPaywallAction}/>` (`845`) reutiliza existente sin copiar pricing.

---

## 4. DB enforcement — policies nuevas

**Migración:** `supabase/migrations/20260916000000_pro_gate_lawyer_services.sql` (timestamp `20260916` siguiente a `20260915000004`).

Reusa `public.has_pro_access(auth.uid())` (`20260911000000:4`).

```sql
DROP POLICY "lawyer_services_owner_insert";
CREATE POLICY "lawyer_services_owner_insert" FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = lawyer_user_id::text AND has_pro_access(auth.uid()));

DROP POLICY "lawyer_services_owner_update";
CREATE POLICY "lawyer_services_owner_update" FOR UPDATE TO authenticated
USING (auth.uid()::text = lawyer_user_id::text AND has_pro_access(auth.uid()))
WITH CHECK (auth.uid()::text = lawyer_user_id::text AND has_pro_access(auth.uid()));

DROP POLICY "lawyer_services_owner_delete";
CREATE POLICY "lawyer_services_owner_delete" FOR DELETE TO authenticated
USING (auth.uid()::text = lawyer_user_id::text AND has_pro_access(auth.uid()));
-- SELECT queda intacta: lawyer_services_public_select USING (true) anon,authenticated
```

* No edita migraciones históricas, no rompe `service_role` (bypass RLS), no toca Marketplace (SELECT sigue público).
* Servicios existentes FREE quedan visibles (SELECT) pero no editables/borrables hasta `has_pro_access true` (no se borra data, no se oculta).

---

## 5. Analytics

**Para FREE:**

* Crear: `posthog.capture('pro_paywall_opened', {action:'create_service'})` (`handleAddService:96` + `handleSaveService:167` cuando `id==null`)
* Editar: `pro_paywall_opened {action:'edit_service'}` (`handleEditService:111` + `handleSaveService:167` cuando `id!=null`)
* Eliminar: `pro_paywall_opened {action:'delete_service'}` (`handleDeleteClick:311` + `handleDeleteService:318`)

Preserva `pro_subscribe_clicked` / `pro_checkout_started` en `ProPricingModal` (no duplicado aquí).

---

## 6. Cross-tenant

**Owner check:** `auth.uid()::text = lawyer_user_id::text` permanece en todas las políticas. Lawyer A no puede `INSERT` con `lawyer_user_id=B`, ni `UPDATE/DELETE` fila `lawyer_user_id=B` aunque tenga Pro (USING falla). Test `T11` valida presencia `auth.uid() = lawyer_user_id`.

**Pro + owner:** `AND has_pro_access(auth.uid())` asegura que incluso owner sin Pro es `42501`.

---

## 7. Regression

| Área | Verificado | Resultado |
|------|------------|-----------|
| Marketplace `/search` → `lawyer_services` SELECT público | `lawyer_services_public_select` intacta | ✅ |
| Pro entitlement `hasProAccess` / `lawyer_subscriptions` | `useProSubscription` + `has_pro_access` reused | ✅ |
| AI `1/3` / `checkAILimits` / trigger `ai_enforce_trial_limits` | no tocado | ✅ |
| `/pro` landing `pro_landing_*` | no tocado en esta fase | ✅ |
| `bookings` `LAWYER_DIRECT` Pro gate (`20260911000000`) | no tocado | ✅ |
| Servicios existentes FREE | SELECT true, no migración data | ✅ |

---

## 8. Tests

**Archivo:** `src/__tests__/phase3C2B.test.ts` — **13 tests**

```
✓ T1 — FREE read SELECT sin gate
✓ T2 — FREE create gate create_service + ProPricingModal + proPaywallAction
✓ T3 — FREE edit gate edit_service
✓ T3b — handleSaveService gate antes de insert/update
✓ T4 — FREE delete gate delete_service (both handlers)
✓ T5-7 — PRO flujo insert/update/delete + modal triggerAction
✓ T8-10 — RLS migration has_pro_access en insert/update/delete
✓ T11 — cross-tenant auth.uid() = lawyer_user_id
✓ T12 — SELECT gratis público permanece
✓ T13 — Marketplace /api/bookings/create no afectado
✓ T14 — Pro pricing 19990 sin hardcode en ServicesPage
✓ Analytics + ProPricingModal reuse
```

- `npm run test:run -- src/__tests__/phase3C2B.test.ts` → **13 passed**
- `npm run test:run -- src/__tests__/phase3C.test.ts src/__tests__/phase3C2A.test.ts src/__tests__/phase3C2B.test.ts` → **45 passed** (20+12+13)
- Suites Pro previas (`phase3B` 26) intactas.

---

## 9. Build / typecheck

- **Build:** `npm run build` → `✓ built in ~6.2s`, chunk `ServicesPage` incluido, sin errores, `INEFFECTIVE_DYNAMIC_IMPORT` preexistente único warning.
- **Typecheck:** `ServicesPage.tsx` introduce `useProSubscription` (existente tipado) y `posthog-js` (already used en 4 SaaS pages); build valida tipos. Baseline `tsc --skipLibCheck` mantiene WARN preexistentes `App.tsx:155 onError` etc., ningún error nuevo en `ServicesPage`.

---

## 10. Git status

**Sin commit / push** (restricción fase):

```
 M src/pages/lawyer/ServicesPage.tsx
?? supabase/migrations/20260916000000_pro_gate_lawyer_services.sql
?? src/__tests__/phase3C2B.test.ts
?? docs/FASE-3C.2B-PRO-SERVICES-GATE.md
```

Base `ec965bb` intacta; deploy no ejecutado.

---

*Fin FASE 3C.2B — ServicesPage ahora sigue filosofía FREE preview → primer write Pro, con defensa DB.*
