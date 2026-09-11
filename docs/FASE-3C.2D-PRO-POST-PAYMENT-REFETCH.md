# FASE 3C.2D — Post-payment refetch / activación inmediata de Pro

**Fecha:** 2026-09-11  
**Commit base:** `22ccdde` (`fix(pro): correct demo CTA`)  
**Modo:** FIX aislada — `useProSubscription` + `DashboardPage` polling acotado

---

## STATUS

`PASS`

---

## 1. Estado previo — cómo funcionaba retorno antes

**Hook:** `src/hooks/useProSubscription.ts:11` `useQuery` con `queryKey ['pro-subscription', user.id]`, `enabled !!user.id`, sin `staleTime` explícito, `refetchOnWindowFocus` default `false` (QueryClient), solo expone `data, isLoading`, no `refetch`/`isFetching`. Invalida en `useProSubscribe:onSuccess`.

**Dashboard:** `src/pages/lawyer/DashboardPage.tsx:61-75`

```tsx
const {hasProAccess:hasProAccessCheck}=useProSubscription();
useEffect(()=>{
  if(searchParams.get('pro_subscription_success')==='true'){
    if(hasProAccessCheck) toast('¡Pro activado!');
    else toast('Verificando pago');
    const newParams=...; delete('pro_subscription_success');
    navigate('/lawyer/dashboard?...',{replace:true});
  }
},[searchParams, hasProAccessCheck]);
```

- Detecta `pro_subscription_success=true` pero **limpia query inmediatamente** antes de confirmar acceso.
- Solo un `hasProAccessCheck` sin `refetch()` — si webhook aún no actualizó `lawyer_subscriptions`, muestra `Verificando` y **no reintenta**; queda en cache `false` hasta `refetchOnWindowFocus` o reload manual.
- Race: MP `back_url` `server.mjs:8583` es `/lawyer/dashboard?pro_subscription_success=true` correcto, pero `lawyer_subscriptions.status` pasa a `active` async vía webhook `handleProPreapprovalWebhook:5493` (30d). Usuario ve botones paywalleados hasta siguiente `select`.

---

## 2. Root cause — cache / refetch race

`useQuery` cachea `lawyer_subscriptions` fila `pending` (tras `POST /api/pro/subscribe`). Webhook actualiza DB a `active`, pero **ningún `invalidate`/`refetch` se dispara en el retorno**; `hasProAccess` permanece `false` hasta que React Query refetchee por `focus` o `interval`. Limpieza inmediata de `searchParams` impide reintentar.

---

## 3. Implementación — hook + dashboard

**Hook (`useProSubscription.ts:11`):**

```tsx
const { data: subscription, isLoading, isFetching, refetch } = useQuery({...});
return { subscription, hasProAccess, ..., isLoading, isFetching, refetch, ... };
```

Expone `refetch` (fuerza `select` Supabase) e `isFetching` para UI.

**Dashboard (`DashboardPage.tsx:61-115`):**

```tsx
const {hasProAccess, refetch:refetchPro, isFetching:isFetchingPro} = useProSubscription();
const hasProAccessCheck = hasProAccess;
const [proVerificationState,setProVerificationState]=useState<'idle'|'verifying'|'timeout'>('idle');
const [proVerificationAttempts,setProVerificationAttempts]=useState(0);
const isProReturn = searchParams.get('pro_subscription_success')==='true';

useEffect(()=>{
  if(!isProReturn) return;
  if(hasProAccessCheck){
    posthog.capture('pro_checkout_returned',{status:'success'});
    posthog.capture('pro_access_confirmed',{attempts:0, elapsed_ms:0});
    toast('¡LegalUp Pro activado!','Ya puedes gestionar...');
    navigate(clean,{replace:true}); setProVerificationState('idle'); return;
  }
  let cancelled=false; const start=Date.now();
  const run=async()=>{
    posthog.capture('pro_checkout_returned',{status:'success'});
    setProVerificationState('verifying');
    for(let i=0;i<5;i++){
      if(cancelled) return;
      setProVerificationAttempts(i+1);
      const result:any=await refetchPro();
      const sub=result.data;
      const periodEndMs=sub?.current_period_end?Date.parse(sub.current_period_end):0;
      const isActiveNow=sub && (sub.status==='active'||sub.status==='cancelled') && periodEndMs>Date.now();
      if(isActiveNow){
        posthog.capture('pro_access_confirmed',{attempts:i+1, elapsed_ms:Date.now()-start});
        toast('¡LegalUp Pro activado!','Ya puedes gestionar...');
        navigate(clean,{replace:true}); setProVerificationState('idle'); return;
      }
      if(i<4) await new Promise(r=>setTimeout(r,1500));
    }
    if(!cancelled){ setProVerificationState('timeout'); posthog.capture('pro_access_verification_timeout',{attempts:5}); }
  };
  run(); return()=>{cancelled=true;};
},[isProReturn, hasProAccessCheck, refetchPro,...]);
```

- Solo cuando `isProReturn && !hasProAccess`.
- Usa `refetchPro()` (no `invalidateQueries` manual) y verifica `result.data` (misma lógica `active/cancelled + period>now` que hook).

**No toca `server.mjs`** (no P0). `service_role`, `PRO_SUBSCRIPTION_PRICE_CLP`, webhook HMAC intactos.

---

## 4. Polling — intervalo / intentos / stop conditions

- **Intervalo:** `1500 ms` (`await new Promise(setTimeout 1500)`) entre intentos.
- **Máximo:** `5` intentos (`for i<5`) → total `0 + 4*1500 = 6000 ms` + latencias → ~7–8s ventana.
- **Start:** solo si `isProReturn === true` y `hasProAccess === false` y `user` lawyer (Dashboard ya es `RequireLawyer`).
- **Stop success:** `result.data` es `active/cancelled` con `period>now` → `pro_access_confirmed`, toast, `navigate(clean)`, `idle`.
- **Stop cancelled:** `useEffect cleanup` `cancelled=true` al desmontar/navegar.
- **Timeout:** tras 5 fallos → `proVerificationState='timeout'`, `pro_access_verification_timeout`, no limpia query (deja `?pro_subscription_success=true` para retry manual), no inicia nuevo checkout.
- **No global:** no `setInterval` permanente, no `refetchInterval` en hook, solo efecto acotado.

---

## 5. UX states — success / verifying / timeout

**Success (ya active o se activa en polling):**

- Toast `¡LegalUp Pro activado!` + subcopy `Ya puedes gestionar clientes, casos, solicitudes, citas y usar AI Limited.`
- `navigate("/lawyer/dashboard",{replace:true})` limpia `?pro_subscription_success`.
- No reload.

**Verifying (polling activo):**

```tsx
{isProReturn && proVerificationState==='verifying' && (
  <Card bg-amber-50><Loader2/> Estamos verificando tu pago / Esto puede tardar unos segundos. Intento {n}/5</Card>
)}
```

**Timeout (5 intentos sin active):**

```tsx
{isProReturn && timeout && (
  <Card bg-amber-50>Tu pago está siendo procesado / Si Mercado Pago aprobó... Puedes actualizar en unos segundos.
    <Button onClick={async()=>{ setVerifying; await refetchPro(); if(active) success else timeout }}>Verificar nuevamente</Button>
  </Card>
)}
```

- No `error`/`pago fallido`/`rechazado`.
- No checkout duplicado: durante `pending`, no se muestra `Activar Pro` como primer feedback (verifying banner tiene prioridad); `ProPricingModal` sigue existiendo pero no se abre automáticamente.

---

## 6. Analytics

| Evento | Cuándo | Props |
|--------|--------|-------|
| `pro_checkout_returned` (`DashboardPage:80,84`) | entra con `?pro_subscription_success=true` (una vez por run) | `status:'success'` |
| `pro_access_confirmed` | `hasProAccess` ya true al montar (0 intentos) o durante polling (i+1) | `attempts`, `elapsed_ms` |
| `pro_access_verification_timeout` | tras 5 intentos sin active | `attempts:5` |

Preservados: `pro_subscription_activated` (server webhook `server.mjs:5493`), `pro_checkout_started` etc. Diferencia: `pro_subscription_activated` = provider, `pro_access_confirmed` = frontend usable.

---

## 7. AI interaction

- Una vez `hasProAccess true`, `getAILawyerAccess()` (`server.mjs:7921`) retorna `pro_limited` (`1 caso / 3 docs`) en **siguiente** `POST /api/ai/*`; no cache persistente. UI AI (`useAISubscription`) no se invalida automáticamente en este fix (no hay `queryClient.invalidateQueries(['ai-subscription'])`), pero al navegar a `/lawyer/ai` hará `useQuery` fresco y verá `pro_limited`. Documentado como P2: si `useAISubscription` está `stale` tras activar Pro y ya estaba en `/lawyer/ai`, bastaría con `invalidateQueries(['ai-subscription'])` al confirmar Pro (trivial, no incluido para no ampliar scope; workaround: navegar).

---

## 8. Regression

| Área | Estado |
|------|--------|
| Marketplace `/search` + `/api/bookings/create` | no tocado |
| Pricing `19990` (`PRO_SUBSCRIPTION_PRICE_CLP`) | no tocado |
| RLS `has_pro_access` + `lawyer_services` gate (`3C.2B`) | no tocado |
| Pro gates `Clients/Cases/Requests/Citas` | no tocado |
| Demo `FREE preview` / `PRO datos ejemplo` (`3C.2C`) | no tocado |
| `/pro` landing | no tocado |
| `lawyer_subscriptions` webhook HMAC `/lawyer/dashboard?pro_subscription_success=true` back_url | no tocado (`server.mjs:8583`) |

---

## 9. Tests

**Archivo:** `src/__tests__/phase3C2D.test.ts` — **14 tests**

```
✓ hook expone refetch e isFetching
✓ T1 normal sin query no polling (if !isProReturn)
✓ T2 return + active muestra success y limpia query
✓ T3 return false→true polling 5 intentos, refetch + timeout 1500
✓ T4 máximo 5, no while(true)/setInterval
✓ T5 timeout Tu pago está siendo procesado
✓ verifying Estamos verificando
✓ T6 manual Verificar nuevamente + refetch
✓ T7 no duplicate checkout (/api/pro/subscribe)
✓ T8 analytics checkout_returned/confirmed/timeout
✓ Hook no polling global
✓ T11-13 AI/Marketplace/pricing intactos
✓ back_url ?pro_subscription_success=true
✓ success limpia query replace:true
```

- `npm run test:run -- src/__tests__/phase3C2D.test.ts` → **14 passed**
- `src/__tests__/phase3C*` (5 suites) → **73 passed**
- Suites `phase3B` 26 intactas.

---

## 10. Build / typecheck

- **Build:** `npm run build` → `✓ built in ~10s`, chunk `DashboardPage` actualizado, sin errores, `INEFFECTIVE_DYNAMIC_IMPORT` preexistente único warning.
- **Typecheck:** `useProSubscription` ahora expone `isFetching: boolean` + `refetch: () => Promise<QueryObserverResult>` tipados por `useQuery`; `DashboardPage` usa `refetchPro` tipado `any` para `result.data`, compatible con `skipLibCheck` baseline (WARN `App.tsx:155 onError` etc., ningún error nuevo).

---

## 11. Git status

**Sin commit / push** (restricción fase):

```
 M src/hooks/useProSubscription.ts
 M src/pages/lawyer/DashboardPage.tsx
?? src/__tests__/phase3C2D.test.ts
?? docs/FASE-3C.2D-PRO-POST-PAYMENT-REFETCH.md
```

Base `22ccdde` intacta; no deploy.

---

*Fin FASE 3C.2D — retorno MP ahora es robusto sin Realtime, casi inmediato si webhook ya está, con polling acotado y UX no alarmista.*
