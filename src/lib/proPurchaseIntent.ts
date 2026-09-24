/**
 * PRO.2.3 — intención de compra Pro a través del auth (solo frontend).
 *
 * El signup/login redirige a onboarding → dashboard, así que la intención
 * ("quería comprar Pro") se conserva en sessionStorage y la consume quien
 * corresponda: LegalUpPro (si el usuario sigue ahí) o el dashboard (destino
 * post-onboarding), que abre el modal de compra existente. Sin backend.
 */

const KEY = "pro_pending_action";

export type ProPendingAction = "checkout" | null;

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
    return value === "checkout" ? "checkout" : null;
  } catch {
    return null;
  }
}

/** Solo lectura (para tests/UI sin consumir). */
export function peekProPendingAction(): ProPendingAction {
  try {
    return storage()?.getItem(KEY) === "checkout" ? "checkout" : null;
  } catch {
    return null;
  }
}
