/**
 * PRO.2.3 — intención de compra Pro a través del auth (solo frontend).
 *
 * El signup/login redirige a onboarding → dashboard, así que la intención
 * ("quería comprar Pro") se conserva en sessionStorage y la consume quien
 * corresponda: LegalUpPro (si el usuario sigue ahí) o el dashboard (destino
 * post-onboarding), que abre el modal de compra existente. Sin backend.
 */

const KEY = "pro_pending_action";

export type ProPendingAction = "checkout" | "checkout_plus" | null;

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Registra intención de checkout Pro antes de mandar a auth. */
export function setProPendingAction(action: Exclude<ProPendingAction, null>): void {
  try {
    storage()?.setItem(KEY, action);
  } catch {
    /* storage no disponible: el flujo sigue sin resume */
  }
}

/** Lee y limpia la intención pendiente (un solo consumo). */
export function takeProPendingAction(): ProPendingAction {
  try {
    const store = storage();
    if (!store) return null;
    const value = store.getItem(KEY);
    store.removeItem(KEY);
    // 4.57D: Plus checkout intent preserved alongside Pro.
    return value === "checkout" || value === "checkout_plus" ? value : null;
  } catch {
    return null;
  }
}

/** Solo lectura (para tests/UI sin consumir). */
export function peekProPendingAction(): ProPendingAction {
  try {
    const value = storage()?.getItem(KEY);
    return value === "checkout" || value === "checkout_plus" ? value : null;
  } catch {
    return null;
  }
}
