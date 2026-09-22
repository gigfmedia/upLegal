// Persist only an opaque request fingerprint + UUID, never legal text or credentials.
// Network ambiguity reuses the key; a terminal result closes this user action.
const memory = new Map<string, string>();
export async function aiOperationIdentity(scope: string, input: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify([scope, input]));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const fingerprint = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  const storageKey = `ai-operation:${fingerprint}`;
  let id = memory.get(storageKey);
  try { id ||= sessionStorage.getItem(storageKey) || undefined; } catch { /* storage unavailable */ }
  if (!id) id = crypto.randomUUID();
  memory.set(storageKey, id);
  try { sessionStorage.setItem(storageKey, id); } catch { /* preserve in-memory retry */ }
  return {
    id,
    complete(body: { ai_operation?: { terminal?: boolean } }) {
      if (!body?.ai_operation?.terminal) return;
      memory.delete(storageKey);
      try { sessionStorage.removeItem(storageKey); } catch { /* storage unavailable */ }
    },
  };
}
