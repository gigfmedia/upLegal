/**
 * FASE 4.42A — admin lawyer magic-link onboarding (pure helpers).
 *
 * Contract:
 * - NEW emails only. Any canonical identity (auth.users OR profiles) → conflict.
 * - Invitation marker in user_metadata distinguishes invite-created identities
 *   (safe resend path) from pre-existing accounts (409, never touch).
 * - Invitation grants NO Pro / Founder / trial / AI entitlement — only the
 *   default free entitlement every new lawyer gets.
 * - action_link is server-only memory: never returned, never logged.
 * - Resend template is owner-managed; id + variables only (no Supabase
 *   `{{ .ConfirmationURL }}` syntax anywhere near email delivery).
 */

export const INVITE_MARKER = 'admin_lawyer_magic_link';
export const INVITE_VERSION = 1;

export const CONFLICT_CODE = 'LAWYER_EMAIL_ALREADY_EXISTS';

/** Sender must stay the verified production sender (see module docs). */
export const INVITE_FROM = 'LegalUp <hola@mg.legalup.cl>';
export const INVITE_REPLY_TO = 'hola@mg.legalup.cl';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_NAME_LENGTH = 120;
/** Per-email resend cooldown (double-click protection; single instance). */
export const INVITE_COOLDOWN_MS = 30_000;

/** trim + lowercase. Returns '' when unusable. */
export function normalizeEmail(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

export function isValidEmail(email) {
  return typeof email === 'string' && email.length > 0 && email.length <= 320 && EMAIL_RE.test(email);
}

/** Best-effort split for profile columns; never validated, never authoritative. */
export function splitName(raw) {
  const clean = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH) : '';
  if (!clean) return { displayName: '', firstName: null, lastName: null };
  const parts = clean.split(' ');
  return {
    displayName: clean,
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : null,
  };
}

/**
 * Decide the path from existence evidence.
 * - 'conflict': any canonical identity WITHOUT our invite marker → 409.
 * - 'resend': identity carries our marker → fresh link, no duplicate profile.
 * - 'create': nothing exists → full provisioning.
 */
export function decideInvitePath({ authUser, profile }) {
  if (authUser || profile) {
    const marker = authUser?.user_metadata?.[INVITE_MARKER];
    if (marker && typeof marker === 'object' && marker.v === INVITE_VERSION) {
      return 'resend';
    }
    return 'conflict';
  }
  return 'create';
}

/** Invite marker written server-side at provisioning (never client input). */
export function buildInviteMarker(adminUserId) {
  return {
    [INVITE_MARKER]: { v: INVITE_VERSION, by: adminUserId || null, at: new Date().toISOString() },
  };
}

/** In-memory per-email cooldown store (injectable for tests). */
export function createCooldownStore() {
  return new Map();
}

export function checkInviteCooldown(store, email, now = Date.now()) {
  const last = store.get(email) || 0;
  if (now - last < INVITE_COOLDOWN_MS) return false;
  store.set(email, now);
  return true;
}

/**
 * Rollback ownership proof (§19): deleteUser is allowed ONLY when ALL hold:
 * 1. userId is the exact id captured from THIS request's generateLink response.
 * 2. re-read user (getUserById) has the same id AND the same normalized email.
 * 3. created_at falls inside this request window (race guard).
 * 4. no profile row exists for the id (nothing else adopted the identity).
 * Timestamp alone is never sufficient.
 */
export function ownsInviteIdentity({ userId, freshUser, email, profile, reqStart, windowMs = 120000 }) {
  if (!userId || !freshUser || freshUser.id !== userId) return false;
  if (normalizeEmail(freshUser.email) !== email) return false;
  const createdAt = freshUser.created_at ? new Date(freshUser.created_at).getTime() : 0;
  if (!createdAt || createdAt < reqStart - windowMs) return false;
  if (profile) return false;
  return true;
}

/** Process-wide store for the route (single instance). Reset only in tests. */
const routeCooldowns = createCooldownStore();

export function checkRouteCooldown(email, now) {
  return checkInviteCooldown(routeCooldowns, email, now);
}

export function __resetRouteCooldowns() {
  routeCooldowns.clear();
}

/**
 * Resend payload for the owner-managed template. Variables only — the
 * template owns subject/design. Never Supabase `{{ .ConfirmationURL }}`.
 */
export function buildInviteEmail({ templateId, magicLink, lawyerName }) {
  return {
    from: INVITE_FROM,
    to: undefined, // set by caller (recipient)
    reply_to: INVITE_REPLY_TO,
    template: {
      id: templateId,
      variables: {
        MAGIC_LINK: magicLink,
        LAWYER_NAME: lawyerName || '',
      },
    },
  };
}

/** Safe admin audit fields — never the link or token. */
export function buildInviteAudit({ adminUserId, email, status, resent }) {
  return {
    admin_user_id: adminUserId || null,
    target_email: email,
    status,
    resent: !!resent,
    at: new Date().toISOString(),
  };
}
