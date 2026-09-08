export async function cancelMpPreapproval({ preapprovalId, accessToken, fetchImpl = fetch }) {
  const url = `https://api.mercadopago.com/preapproval/${preapprovalId}`;
  try {
    const res = await fetchImpl(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, status: res.status, body };
    }
    const bodyStr = JSON.stringify(body).toLowerCase();
    const alreadyCancelled = body?.status === 'cancelled' || bodyStr.includes('already cancelled') || bodyStr.includes('already canceled') || (res.status === 404 && bodyStr.includes('not found'));
    // For 404 + not found, we try GET reconciliation instead of treating as already cancelled directly
    if (alreadyCancelled && body?.status === 'cancelled') {
      return { ok: true, status: res.status, body, alreadyCancelled: true };
    }
    // If PUT says already cancelled via message, reconcile with GET
    if (bodyStr.includes('already cancelled') || bodyStr.includes('already canceled')) {
      return { ok: false, status: res.status, body, alreadyCancelledHint: true };
    }
    return { ok: false, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, error: e, networkError: true };
  }
}

export async function reconcileMpPreapprovalStatus({ preapprovalId, accessToken, fetchImpl = fetch }) {
  try {
    const res = await fetchImpl(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body?.status === 'cancelled') return { cancelled: true, body };
    return { cancelled: false, status: res.status, body };
  } catch (e) {
    return { cancelled: false, error: e, networkError: true };
  }
}
