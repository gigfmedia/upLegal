/**
 * 4.38C-C — auto-recuperación ante operación en curso.
 *
 * Cuando el backend responde AI_OPERATION_IN_PROGRESS (409), la operación ya
 * existe y sigue ejecutándose. Reintentar con la MISMA identidad devuelve el
 * resultado terminal cuando está listo (replay idempotente 4.38B); nunca crea
 * una segunda operación ni duplica llamadas al proveedor.
 *
 * La identidad (`aiOperationIdentity`) conserva el UUID hasta ver un resultado
 * terminal, así que repetir el POST con los mismos argumentos es seguro.
 * El polling es acotado: si se agota, se retorna la última respuesta para que
 * la UI muestre el error y el usuario pueda reintentar (replay seguro).
 */

export const AI_OPERATION_IN_PROGRESS = 'AI_OPERATION_IN_PROGRESS';

/** Delays entre rondas: ~33s totales antes de devolver el control a la UI. */
export const IN_PROGRESS_POLL_DELAYS_MS = [3000, 5000, 10000, 15000];

function sleepWithSignal(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export type InProgressRound = {
  res: { ok: boolean };
  body: { code?: string };
};

/**
 * Repite `round()` mientras el backend reporte operación en curso, con pausas
 * acotadas. Retorna la primera respuesta terminal (ok o con otro código).
 */
export async function pollTerminalResult<T extends InProgressRound>(
  round: () => Promise<T>,
  opts: { signal?: AbortSignal | null; delaysMs?: number[] } = {}
): Promise<T> {
  const delays = opts.delaysMs ?? IN_PROGRESS_POLL_DELAYS_MS;
  // La primera ronda siempre se ejecuta; luego hasta delays.length reintentos.
  for (let i = 0; ; i++) {
    const out = await round();
    if (out.res.ok) return out;
    if (out.body?.code !== AI_OPERATION_IN_PROGRESS) return out;
    if (i >= delays.length) return out;
    await sleepWithSignal(delays[i], opts.signal);
  }
}

/** Copy para cuando el polling se agota y la operación sigue en curso. */
export function inProgressExhaustedMessage(): string {
  return 'La solicitud sigue en curso. Espera unos momentos y vuelve a intentarlo: tu consulta no se duplicará.';
}
