/** Only Supabase Auth's server-managed claims may confer platform privileges. */
export function isPlatformAdmin(user) {
  return ['admin', 'superadmin'].includes(user?.app_metadata?.role);
}

/** Validate the token with Auth before evaluating any claims. No local JWT decoding. */
export async function verifyPlatformAdmin(client, authorization) {
  const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(authorization);
  if (!match) return { status: 401, user: null };
  try {
    const { data, error } = await client.auth.getUser(match[1]);
    if (error || !data?.user?.id) return { status: 401, user: null };
    if (!isPlatformAdmin(data.user)) return { status: 403, user: null };
    return { status: 200, user: data.user };
  } catch {
    return { status: 401, user: null };
  }
}
