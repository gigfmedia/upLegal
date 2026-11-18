import { normalizeDomain, normalizeEmail } from './validation.mjs';
import { createProspectingLedger } from './ledger.mjs';
import {
  QUALITY_RULES_VERSION,
  assessCandidateQuality,
  buildDomainKey,
  buildPersonKey,
  isManualReviewReason,
  manualReviewCode,
  manualReviewReason,
  selectQualityEligibleContacts,
} from './quality.mjs';

const HISTORICAL_CONTACT_STATUSES = new Set(['sent', 'delivered', 'bounced', 'complained', 'unknown']);
const IN_FLIGHT_SEND_STATUSES = new Set(['queued', 'sending']);
const DOMAIN_BLOCKING_SEND_STATUSES = new Set([...HISTORICAL_CONTACT_STATUSES, ...IN_FLIGHT_SEND_STATUSES]);

const SETTINGS_FIELDS = [
  'enabled',
  'dry_run',
  'daily_target',
  'max_sends_per_run',
  'max_sends_per_day',
  'schedule_time',
  'timezone',
  'sender_name',
  'sender_email',
  'reply_to',
  'app_url',
  'allow_multiple_contacts_per_firm',
];

export function createProspectingRepository({ supabase, logger = console, ledger = null } = {}) {
  if (!supabase) throw new Error('supabase client required');
  const ledgerClient = ledger || createProspectingLedger({ supabase, logger });

  function db(table) {
    return supabase.from(table);
  }

  function fail(context, error) {
    const message = error?.message || String(error);
    logger.error?.('[Prospecting] repository error', { context, error: message });
    const wrapped = new Error(`${context}: ${message}`);
    wrapped.cause = error;
    throw wrapped;
  }

  async function getSettings() {
    const { data, error } = await db('prospecting_settings').select('*').eq('id', 1).maybeSingle();
    if (error) fail('getSettings', error);
    return data || null;
  }

  async function updateSettings(patch, actorId = null) {
    const clean = {};
    for (const field of SETTINGS_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(patch, field)) clean[field] = patch[field];
    }
    if (Object.keys(clean).length === 0) return getSettings();
    clean.updated_at = new Date().toISOString();
    clean.updated_by = actorId;
    const { data, error } = await db('prospecting_settings')
      .update(clean)
      .eq('id', 1)
      .select('*')
      .single();
    if (error) fail('updateSettings', error);
    return data;
  }

  async function claimRun({ runKey, trigger, mode, actorId = null }) {
    const { data, error } = await supabase.rpc('prospecting_claim_run', {
      p_run_key: runKey,
      p_trigger: trigger,
      p_mode: mode,
      p_actor: actorId,
    });
    if (error) fail('claimRun', error);
    return Array.isArray(data) ? data[0] : data;
  }

  async function releaseLock(lockToken) {
    if (!lockToken) return;
    const { error } = await supabase.rpc('prospecting_release_lock', { p_lock_token: lockToken });
    if (error) logger.warn?.('[Prospecting] releaseLock failed', { error: error.message });
  }

  async function recoverStaleRuns() {
    try {
      const result = await ledgerClient.recoverStale({
        now: new Date().toISOString(),
        markReady: false,
      });
      return { ...result, recovered: Number(result?.runs || 0) };
    } catch (error) {
      fail('recoverStaleRuns', error);
    }
  }

  async function getCapacity(now = null) {
    try {
      return await ledgerClient.getCapacity({ now });
    } catch (error) {
      fail('getCapacity', error);
    }
  }

  async function claimSendAttempt({ sendId, runId = null, now = null }) {
    try {
      return await ledgerClient.claimSendAttempt({ sendId, runId, now });
    } catch (error) {
      fail('claimSendAttempt', error);
    }
  }

  async function revalidateAttemptDay({ attemptId, now = null }) {
    try {
      return await ledgerClient.revalidateAttemptDay({ attemptId, now });
    } catch (error) {
      fail('revalidateAttemptDay', error);
    }
  }

  async function finalizeSendAttempt(args) {
    try {
      return await ledgerClient.finalizeSendAttempt(args);
    } catch (error) {
      fail('finalizeSendAttempt', error);
    }
  }

  async function markSendSkipped(sendId, reason, now = null) {
    try {
      return await ledgerClient.markSendSkipped({ sendId, reason, now });
    } catch (error) {
      fail('markSendSkipped', error);
    }
  }

  async function ingestProviderEvent(args) {
    try {
      return await ledgerClient.ingestProviderEvent(args);
    } catch (error) {
      fail('ingestProviderEvent', error);
    }
  }

  async function applyProviderEvent(args) {
    try {
      return await ledgerClient.applyProviderEvent(args);
    } catch (error) {
      fail('applyProviderEvent', error);
    }
  }

  async function reprocessProviderEvents(limit = 50, now = null) {
    try {
      return await ledgerClient.reprocessProviderEvents({ limit, now });
    } catch (error) {
      fail('reprocessProviderEvents', error);
    }
  }

  async function applyUnsubscribe(args) {
    try {
      return await ledgerClient.applyUnsubscribe(args);
    } catch (error) {
      fail('applyUnsubscribe', error);
    }
  }

  async function getOperationalHealth() {
    const { data, error } = await db('prospecting_operational_health').select('*').maybeSingle();
    if (error) fail('getOperationalHealth', error);
    return data || null;
  }

  async function updateRun(runId, patch) {
    const { data, error } = await db('prospecting_runs')
      .update(patch)
      .eq('id', runId)
      .select('*')
      .maybeSingle();
    if (error) fail('updateRun', error);
    return data;
  }

  async function getRun(runId) {
    const { data, error } = await db('prospecting_runs').select('*').eq('id', runId).maybeSingle();
    if (error) fail('getRun', error);
    return data;
  }

  async function listRuns(limit = 50) {
    const { data, error } = await db('prospecting_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(clamp(limit, 1, 200));
    if (error) fail('listRuns', error);
    return data || [];
  }

  async function getLatestRun() {
    const { data, error } = await db('prospecting_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) fail('getLatestRun', error);
    return data || null;
  }

  async function filterNewCandidates(candidates, { runId, allowMultipleContactsPerFirm = false } = {}) {
    const assessed = candidates.map((candidate) => (
      candidate
        ? assessCandidateQuality(candidate, { pageUrl: candidate.source_url || candidate.website || null })
        : candidate
    ));
    const unique = [];
    const seen = new Set();
    for (const candidate of assessed) {
      if (!candidate?.dedupe_key || seen.has(candidate.dedupe_key)) continue;
      seen.add(candidate.dedupe_key);
      unique.push(candidate);
    }
    if (unique.length === 0) return { accepted: [], rejected: [], inserted: [] };

    const rejected = [];
    const byKey = new Map(unique.map((candidate) => [candidate.dedupe_key, candidate]));
    const emails = unique.map((candidate) => normalizeEmail(candidate.email)).filter(Boolean);
    const emailOwner = new Map();

    const existing = await selectIn('prospects', 'dedupe_key', [...byKey.keys()], 'dedupe_key, id, email_normalized');
    for (const row of existing) {
      emailOwner.set(row.dedupe_key, row);
      const candidate = byKey.get(row.dedupe_key);
      rejected.push({ dedupe_key: row.dedupe_key, email: candidate?.email || null, reason: 'duplicate_prospect' });
      byKey.delete(row.dedupe_key);
    }

    if (emails.length > 0) {
      const existingEmails = await selectIn('prospects', 'email_normalized', emails, 'id, dedupe_key, email_normalized, status');
      const existingEmailSet = new Set(existingEmails.map((row) => row.email_normalized));
      for (const [key, candidate] of [...byKey.entries()]) {
        const email = normalizeEmail(candidate.email);
        if (email && existingEmailSet.has(email)) {
          rejected.push({ dedupe_key: key, email, reason: 'duplicate_email' });
          byKey.delete(key);
        }
      }

      const suppressed = await selectIn('prospecting_suppressions', 'email_normalized', emails, 'email_normalized, reason');
      const suppressedSet = new Map(suppressed.map((row) => [row.email_normalized, row.reason]));
      for (const [key, candidate] of [...byKey.entries()]) {
        const email = normalizeEmail(candidate.email);
        if (email && suppressedSet.has(email)) {
          rejected.push({ dedupe_key: key, email, reason: `suppressed:${suppressedSet.get(email)}` });
          byKey.delete(key);
        }
      }
    }

    const registered = await getRegisteredContacts();
    for (const [key, candidate] of [...byKey.entries()]) {
      const email = normalizeEmail(candidate.email);
      const website = normalizeDomain(candidate.website);
      if (email && registered.emails.has(email)) {
        rejected.push({ dedupe_key: key, email, reason: 'registered_user' });
        byKey.delete(key);
        continue;
      }
      if (website && registered.websites.has(website)) {
        rejected.push({ dedupe_key: key, email: email || null, reason: 'registered_firm' });
        byKey.delete(key);
      }
    }

    const seenPeople = new Set();
    const seenDomains = new Set();
    for (const [key, candidate] of [...byKey.entries()]) {
      const excluded = candidate.status === 'excluded' || candidate.validation_status === 'invalid';
      if (excluded) continue;
      const manualReview = candidate.review_required || isManualReviewReason(candidate.rejection_reason);
      if (manualReview) continue;
      const personKey = candidate.person_key || buildPersonKey(candidate.contact_name);
      const domainKey = candidate.domain_key || buildDomainKey({ email: candidate.email, website: candidate.website });
      if (personKey && seenPeople.has(personKey)) {
        rejected.push({ dedupe_key: key, email: candidate.email || null, reason: 'duplicate_person_same_run' });
        byKey.delete(key);
        continue;
      }
      if (!allowMultipleContactsPerFirm && domainKey && seenDomains.has(domainKey)) {
        rejected.push({ dedupe_key: key, email: candidate.email || null, reason: 'duplicate_firm_same_run' });
        byKey.delete(key);
        continue;
      }
      if (personKey) seenPeople.add(personKey);
      if (!allowMultipleContactsPerFirm && domainKey) seenDomains.add(domainKey);
    }

    const evaluatedAt = new Date().toISOString();
    const rows = [...byKey.values()].map((candidate) => ({
      dedupe_key: candidate.dedupe_key,
      email: candidate.email || null,
      contact_name: candidate.contact_name || null,
      role: candidate.role || null,
      firm_name: candidate.firm_name || 'Sin nombre',
      website: candidate.website || null,
      linkedin_url: candidate.linkedin_url || null,
      city: candidate.city || null,
      specialties: candidate.specialties || [],
      description: candidate.description || null,
      source: candidate.source || 'public_web',
      source_url: candidate.source_url || null,
      validation_status: candidate.validation_status || 'pending',
      status: candidate.status || 'new',
      validated_at: candidate.validated_at || null,
      notes: candidate.notes || null,
      email_kind: candidate.email_kind || null,
      org_type: candidate.org_type || null,
      rejection_reason: candidate.rejection_reason || null,
      discovery_query: candidate.discovery_query || null,
      search_rank: Number.isFinite(Number(candidate.search_rank)) ? Number(candidate.search_rank) : null,
      person_key: candidate.person_key || buildPersonKey(candidate.contact_name),
      domain_key: candidate.domain_key || buildDomainKey({ email: candidate.email, website: candidate.website }),
      mailbox_verified: false,
      quality_evaluated_at: evaluatedAt,
      quality_rules_version: QUALITY_RULES_VERSION,
      discovered_run_id: runId || null,
    }));

    if (rows.length === 0) return { accepted: [], rejected, inserted: [] };

    const inserted = [];
    for (const chunk of chunks(rows, 50)) {
      const { data, error } = await db('prospects')
        .upsert(chunk, { onConflict: 'dedupe_key', ignoreDuplicates: true })
        .select('id, dedupe_key, email, firm_name, contact_name, status, send_status');
      if (error) fail('filterNewCandidates.insert', error);
      inserted.push(...(data || []));
    }

    const insertedKeys = new Set(inserted.map((row) => row.dedupe_key));
    for (const row of rows) {
      if (!insertedKeys.has(row.dedupe_key)) {
        rejected.push({ dedupe_key: row.dedupe_key, email: row.email, reason: 'duplicate_race' });
      }
    }
    return { accepted: inserted, rejected, inserted };
  }

  async function getRegisteredContacts() {
    const { data, error } = await db('profiles')
      .select('id, email, website, first_name, last_name, role')
      .not('email', 'is', null)
      .limit(5000);
    if (error) fail('getRegisteredContacts', error);
    const emails = new Set();
    const websites = new Set();
    for (const profile of data || []) {
      const email = normalizeEmail(profile.email);
      if (email) emails.add(email);
      const website = normalizeDomain(profile.website);
      if (website) websites.add(website);
    }
    return { emails, websites };
  }

  async function listContactedDomains(rows) {
    const domains = [...new Set(rows
      .map((row) => row.domain_key || buildDomainKey({ email: row.email, website: row.website }))
      .filter(Boolean))];
    if (domains.length === 0) return new Set();

    const domainProspects = await selectIn(
      'prospects',
      'domain_key',
      domains,
      'id, domain_key, email, website',
    );
    const prospectsById = new Map([...domainProspects, ...rows].map((row) => [row.id, row]));
    const contacted = await selectIn(
      'prospecting_sends',
      'prospect_id',
      [...prospectsById.keys()],
      'prospect_id, status',
    );
    const contactedIds = contacted
      .filter((row) => DOMAIN_BLOCKING_SEND_STATUSES.has(row.status))
      .map((row) => row.prospect_id);
    const contactedDomains = new Set();
    for (const prospectId of contactedIds) {
      const prospect = prospectsById.get(prospectId);
      const domainKey = prospect?.domain_key || buildDomainKey({
        email: prospect?.email,
        website: prospect?.website,
      });
      if (domainKey) contactedDomains.add(domainKey);
    }
    return contactedDomains;
  }

  async function listEligibleForRun(runId, options = {}) {
    // No se limita al run actual: un dry-run inserta prospectos válidos y no
    // debe consumirlos. La cola real toma el backlog pendiente más antiguo,
    // manteniendo una sola campaña por prospecto vía unique(prospect_id).
    const { limit = 500, allowMultipleContactsPerFirm = false } = typeof options === 'number'
      ? { limit: options }
      : options;
    const target = clamp(limit, 1, 500);
    const windowSize = 500;
    const maxScan = 2000;
    const scanned = [];
    const registered = await getRegisteredContacts();
    let offset = 0;

    while (offset < maxScan) {
      const { data, error } = await db('prospects')
        .select('*')
        .eq('validation_status', 'valid')
        .eq('send_status', 'not_sent')
        .eq('org_type', 'law_firm')
        .eq('email_kind', 'personal')
        .eq('quality_rules_version', QUALITY_RULES_VERSION)
        .not('quality_evaluated_at', 'is', null)
        .is('rejection_reason', null)
        .in('status', ['new', 'validated'])
        .not('email', 'is', null)
        .order('discovered_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + windowSize - 1);
      if (error) fail('listEligibleForRun', error);
      const rows = data || [];
      if (rows.length === 0) break;

      const withSends = new Set(
        (await selectIn('prospecting_sends', 'prospect_id', rows.map((row) => row.id), 'prospect_id'))
          .map((row) => row.prospect_id),
      );
      const emails = rows.map((row) => normalizeEmail(row.email)).filter(Boolean);
      const suppressed = await selectIn('prospecting_suppressions', 'email_normalized', emails, 'email_normalized');
      const suppressedSet = new Set(suppressed.map((row) => row.email_normalized));
      const contactedDomains = allowMultipleContactsPerFirm
        ? new Set()
        : await listContactedDomains(rows);

      for (const row of rows) {
        if (withSends.has(row.id)) continue;
        if (suppressedSet.has(normalizeEmail(row.email))) continue;
        const email = normalizeEmail(row.email);
        const website = normalizeDomain(row.website);
        const domainKey = row.domain_key || buildDomainKey({ email: row.email, website: row.website });
        if (registered.emails.has(email) || registered.websites.has(website)) continue;
        if (!allowMultipleContactsPerFirm && domainKey && contactedDomains.has(domainKey)) continue;
        scanned.push(row);
      }
      if (selectQualityEligibleContacts(scanned, { allowMultipleContactsPerFirm, limit: target }).length >= target) break;
      if (rows.length < windowSize) break;
      offset += windowSize;
    }

    return selectQualityEligibleContacts(scanned, { allowMultipleContactsPerFirm, limit: target });
  }

  async function listPendingContact(limit = 100) {
    const { data, error } = await db('prospects')
      .select('*')
      .eq('status', 'pending_contact')
      .order('discovered_at', { ascending: false })
      .limit(clamp(limit, 1, 200));
    if (error) fail('listPendingContact', error);
    return data || [];
  }

  async function createSend({ runId, prospect, subject, html, idempotencyKey }) {
    const row = {
      run_id: runId,
      prospect_id: prospect.id,
      to_email: normalizeEmail(prospect.email),
      subject,
      html,
      idempotency_key: idempotencyKey,
      status: 'queued',
    };
    const { data, error } = await db('prospecting_sends').insert(row).select('*').single();
    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: existingError } = await db('prospecting_sends')
          .select('*')
          .eq('prospect_id', prospect.id)
          .maybeSingle();
        if (existingError) fail('createSend.existing', existingError);
        return { send: existing || null, created: false };
      }
      fail('createSend', error);
    }
    return { send: data, created: true };
  }

  async function listRetryableSends(limit = 20) {
    const { data, error } = await db('prospecting_sends')
      .select('*')
      .eq('status', 'failed')
      .eq('last_error_transient', true)
      .lt('attempt', 3)
      .order('updated_at', { ascending: true })
      .limit(clamp(limit, 1, 100));
    if (error) fail('listRetryableSends', error);
    return data || [];
  }

  async function addSuppression({ email, reason, source = 'system', note = null, createdBy = null }) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const id = await ledgerClient.upsertSuppression({
      email: normalized,
      reason,
      source,
      note,
      createdBy,
    });
    if (!id) return null;
    const { data, error } = await db('prospecting_suppressions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) fail('addSuppression', error);
    return data;
  }

  async function removeSuppression(id) {
    const { data, error } = await db('prospecting_suppressions').delete().eq('id', id).select('*').maybeSingle();
    if (error) fail('removeSuppression', error);
    return data;
  }

  async function listSuppressions(limit = 200) {
    const { data, error } = await db('prospecting_suppressions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(clamp(limit, 1, 500));
    if (error) fail('listSuppressions', error);
    return data || [];
  }

  async function findSendByProviderMessageId(providerMessageId) {
    if (!providerMessageId) return null;
    const { data, error } = await db('prospecting_sends')
      .select('*')
      .eq('provider_message_id', providerMessageId)
      .maybeSingle();
    if (error) fail('findSendByProviderMessageId', error);
    return data || null;
  }

  async function count(table, apply) {
    let query = db(table).select('*', { count: 'exact', head: true });
    if (apply) query = apply(query);
    const { count: value, error } = await query;
    if (error) fail(`count.${table}`, error);
    return value || 0;
  }

  async function getOverviewCounts({ dayStartIso, monthStartIso }) {
    const [
      totalProspects,
      pendingContact,
      validToday,
      sentToday,
      deliveredToday,
      bouncedToday,
      complainedToday,
      failedToday,
      suppressions,
    ] = await Promise.all([
      count('prospects'),
      count('prospects', (q) => q.eq('status', 'pending_contact')),
      count('prospects', (q) => q.eq('validation_status', 'valid').gte('discovered_at', dayStartIso)),
      count('prospecting_sends', (q) => q.in('status', ['sent', 'delivered', 'bounced', 'complained']).gte('sent_at', dayStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'delivered').gte('delivered_at', dayStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'bounced').gte('bounced_at', dayStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'complained').gte('complained_at', dayStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'failed').gte('updated_at', dayStartIso)),
      count('prospecting_suppressions'),
    ]);

    const [monthSent, monthDelivered, monthBounced, monthComplained] = await Promise.all([
      count('prospecting_sends', (q) => q.in('status', ['sent', 'delivered', 'bounced', 'complained']).gte('sent_at', monthStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'delivered').gte('delivered_at', monthStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'bounced').gte('bounced_at', monthStartIso)),
      count('prospecting_sends', (q) => q.eq('status', 'complained').gte('complained_at', monthStartIso)),
    ]);

    return {
      total_prospects: totalProspects,
      pending_contact: pendingContact,
      valid_today: validToday,
      sent_today: sentToday,
      delivered_today: deliveredToday,
      bounced_today: bouncedToday,
      complained_today: complainedToday,
      failed_today: failedToday,
      suppressions,
      month: {
        sent: monthSent,
        delivered: monthDelivered,
        bounced: monthBounced,
        complained: monthComplained,
      },
    };
  }

  async function listProspects({ status = null, search = null, page = 1, pageSize = 50 } = {}) {
    const size = clamp(pageSize, 1, 200);
    const from = (Math.max(1, page) - 1) * size;
    let query = db('prospects').select('*', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (search) {
      const term = String(search).replace(/[%,()]/g, ' ').trim();
      if (term) query = query.or(`firm_name.ilike.%${term}%,contact_name.ilike.%${term}%,email.ilike.%${term}%`);
    }
    const { data, error, count: total } = await query
      .order('discovered_at', { ascending: false })
      .range(from, from + size - 1);
    if (error) fail('listProspects', error);
    return { rows: data || [], total: total || 0, page: Math.max(1, page), page_size: size };
  }

  async function listSends({ status = null, page = 1, pageSize = 50 } = {}) {
    const size = clamp(pageSize, 1, 200);
    const from = (Math.max(1, page) - 1) * size;
    let query = db('prospecting_sends')
      .select('*, prospects(firm_name, contact_name, email, source_url)', { count: 'exact' });
    if (status) query = query.eq('status', status);
    const { data, error, count: total } = await query
      .order('created_at', { ascending: false })
      .range(from, from + size - 1);
    if (error) fail('listSends', error);
    return { rows: data || [], total: total || 0, page: Math.max(1, page), page_size: size };
  }

  async function findProspect(prospectId) {
    const { data, error } = await db('prospects').select('*').eq('id', prospectId).maybeSingle();
    if (error) fail('findProspect', error);
    return data || null;
  }

  async function findProspectByEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { data, error } = await db('prospects')
      .select('*')
      .eq('email_normalized', normalized)
      .maybeSingle();
    if (error) fail('findProspectByEmail', error);
    return data || null;
  }

  async function selectIn(table, column, values, columns = '*') {
    const list = [...new Set((values || []).filter(Boolean))];
    const output = [];
    for (const chunk of chunks(list, 100)) {
      const { data, error } = await db(table).select(columns).in(column, chunk);
      if (error) fail(`selectIn.${table}`, error);
      output.push(...(data || []));
    }
    return output;
  }

  async function insertManualProspect(candidate) {
    const assessed = assessCandidateQuality(candidate, {
      pageUrl: candidate.source_url || candidate.website || null,
    });
    const email = normalizeEmail(candidate.email);
    const definitiveExclusion = assessed.status === 'excluded' || assessed.validation_status === 'invalid';
    const manual = !definitiveExclusion && (
      assessed.review_required
      || isManualReviewReason(assessed.rejection_reason)
      || !email
    );
    const reviewReason = assessed.review_reason
      || manualReviewCode(assessed.rejection_reason)
      || (email ? 'manual_review' : 'no_email');
    const evaluatedAt = new Date().toISOString();
    const evaluationComplete = !manual
      && !definitiveExclusion
      && assessed.org_type === 'law_firm'
      && assessed.email_kind === 'personal'
      && Boolean(email);
    const status = manual
      ? (!email
        ? 'pending_contact'
        : (['new', 'validated', 'pending_contact'].includes(assessed.status)
          ? assessed.status
          : 'validated'))
      : (evaluationComplete && !['new', 'validated'].includes(assessed.status)
        ? 'validated'
        : assessed.status);

    const { data, error } = await db('prospects')
      .insert({
        dedupe_key: candidate.dedupe_key || `manual:${email}`,
        email: candidate.email || null,
        contact_name: assessed.contact_name || null,
        role: candidate.role || null,
        firm_name: assessed.firm_name || candidate.firm_name || 'Sin nombre',
        website: candidate.website || null,
        linkedin_url: candidate.linkedin_url || null,
        city: candidate.city || null,
        specialties: candidate.specialties || [],
        description: candidate.description || null,
        source: 'manual',
        source_url: candidate.source_url || null,
        validation_status: manual ? 'pending' : (evaluationComplete ? 'valid' : assessed.validation_status),
        status,
        notes: candidate.notes || null,
        email_kind: assessed.email_kind,
        org_type: assessed.org_type,
        rejection_reason: manual
          ? manualReviewReason(reviewReason)
          : assessed.rejection_reason,
        discovery_query: candidate.discovery_query || null,
        search_rank: Number.isFinite(Number(candidate.search_rank)) ? Number(candidate.search_rank) : null,
        person_key: assessed.person_key,
        domain_key: assessed.domain_key,
        mailbox_verified: false,
        quality_evaluated_at: manual ? null : evaluatedAt,
        quality_rules_version: manual ? null : QUALITY_RULES_VERSION,
      })
      .select('*')
      .single();
    if (error) fail('insertManualProspect', error);
    return data;
  }

  return {
    getSettings,
    updateSettings,
    claimRun,
    releaseLock,
    recoverStaleRuns,
    getCapacity,
    claimSendAttempt,
    revalidateAttemptDay,
    finalizeSendAttempt,
    markSendSkipped,
    updateRun,
    getRun,
    listRuns,
    getLatestRun,
    filterNewCandidates,
    getRegisteredContacts,
    listEligibleForRun,
    listPendingContact,
    createSend,
    listRetryableSends,
    addSuppression,
    removeSuppression,
    listSuppressions,
    findSendByProviderMessageId,
    ingestProviderEvent,
    applyProviderEvent,
    reprocessProviderEvents,
    applyUnsubscribe,
    getOperationalHealth,
    getOverviewCounts,
    listProspects,
    listSends,
    findProspect,
    findProspectByEmail,
    insertManualProspect,
    ledger: ledgerClient,
  };
}

function chunks(list, size) {
  const output = [];
  for (let index = 0; index < list.length; index += size) {
    output.push(list.slice(index, index + size));
  }
  return output;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}
