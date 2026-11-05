import { normalizeDomain, normalizeEmail } from './validation.mjs';

const SEND_STATUS_RANK = { queued: 0, sending: 1, sent: 2, delivered: 3, unknown: 3, failed: 4, bounced: 5, complained: 6 };

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
];

export function createProspectingRepository({ supabase, logger = console } = {}) {
  if (!supabase) throw new Error('supabase client required');

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

  async function recoverStaleRuns(timezone) {
    const { data, error } = await supabase.rpc('prospecting_recover_stale_runs', { p_timezone: timezone });
    if (error) {
      logger.warn?.('[Prospecting] recoverStaleRuns failed', { error: error.message });
      return { recovered: 0 };
    }
    return data || { recovered: 0 };
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

  async function filterNewCandidates(candidates, { runId } = {}) {
    const unique = [];
    const seen = new Set();
    for (const candidate of candidates) {
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

    const rows = [...byKey.values()].map((candidate) => ({
      dedupe_key: candidate.dedupe_key,
      email: candidate.email || null,
      contact_name: candidate.contact_name || null,
      role: candidate.role || null,
      firm_name: candidate.firm_name,
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

  async function listEligibleForRun(runId, limit) {
    // No se limita al run actual: un dry-run inserta prospectos válidos y no
    // debe consumirlos. La cola real toma el backlog pendiente más antiguo,
    // manteniendo una sola campaña por prospecto vía unique(prospect_id).
    const target = clamp(limit, 1, 500);
    const windowSize = 500;
    const maxScan = 2000;
    const eligible = [];
    let offset = 0;

    while (eligible.length < target && offset < maxScan) {
      const { data, error } = await db('prospects')
        .select('*')
        .eq('validation_status', 'valid')
        .eq('send_status', 'not_sent')
        .in('status', ['new', 'validated'])
        .not('email', 'is', null)
        .order('discovered_at', { ascending: true })
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

      for (const row of rows) {
        if (withSends.has(row.id)) continue;
        if (suppressedSet.has(normalizeEmail(row.email))) continue;
        eligible.push(row);
        if (eligible.length >= target) break;
      }
      if (rows.length < windowSize) break;
      offset += windowSize;
    }

    return eligible;
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

  async function claimSend(sendId) {
    const now = new Date().toISOString();
    const { data, error } = await db('prospecting_sends')
      .update({ status: 'sending', updated_at: now })
      .eq('id', sendId)
      .in('status', ['queued', 'failed'])
      .select('*')
      .maybeSingle();
    if (error) fail('claimSend', error);
    if (!data) return null;
    const nextAttempt = Number(data.attempt || 0) + 1;
    const { data: updated, error: updateError } = await db('prospecting_sends')
      .update({ attempt: nextAttempt, updated_at: now })
      .eq('id', sendId)
      .select('*')
      .single();
    if (updateError) fail('claimSend.attempt', updateError);
    return updated;
  }

  async function markSendResult(sendId, { status, providerMessageId = null, error = null, transient = false, sentAt = null }) {
    const patch = {
      status,
      provider_message_id: providerMessageId || null,
      last_error: error ? String(error).slice(0, 2000) : null,
      last_error_transient: Boolean(transient),
      updated_at: new Date().toISOString(),
    };
    if (sentAt) patch.sent_at = sentAt;
    if (status === 'delivered') patch.delivered_at = patch.updated_at;
    if (status === 'bounced') patch.bounced_at = patch.updated_at;
    if (status === 'complained') patch.complained_at = patch.updated_at;
    const { data, error: updateError } = await db('prospecting_sends')
      .update(patch)
      .eq('id', sendId)
      .select('*')
      .single();
    if (updateError) fail('markSendResult', updateError);
    return data;
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

  async function markProspectFailed(prospectId) {
    const now = new Date().toISOString();
    const { data, error } = await db('prospects')
      .update({ send_status: 'failed', status: 'failed', updated_at: now })
      .eq('id', prospectId)
      .select('*')
      .maybeSingle();
    if (error) fail('markProspectFailed', error);
    return data;
  }

  async function markProspectContacted(prospect) {
    const now = new Date().toISOString();
    const { data, error } = await db('prospects')
      .update({
        status: 'contacted',
        send_status: 'sent',
        last_contacted_at: now,
        campaign_count: Number(prospect.campaign_count || 0) + 1,
        updated_at: now,
      })
      .eq('id', prospect.id)
      .select('*')
      .maybeSingle();
    if (error) fail('markProspectContacted', error);
    return data;
  }

  async function updateProspectStatus(prospectId, { status, sendStatus, notes } = {}) {
    const patch = { updated_at: new Date().toISOString() };
    if (status) patch.status = status;
    if (sendStatus) patch.send_status = sendStatus;
    if (notes !== undefined) patch.notes = notes;
    const { data, error } = await db('prospects').update(patch).eq('id', prospectId).select('*').maybeSingle();
    if (error) fail('updateProspectStatus', error);
    return data;
  }

  async function addSuppression({ email, reason, source = 'system', note = null, createdBy = null }) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    const { data, error } = await db('prospecting_suppressions')
      .upsert({
        email_normalized: normalized,
        reason,
        source,
        note,
        created_by: createdBy,
      }, { onConflict: 'email_normalized', ignoreDuplicates: false })
      .select('*')
      .single();
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

  async function recordProviderEvent({ providerEventId, eventType, providerMessageId, email, payload }) {
    const { data, error } = await db('prospecting_events')
      .insert({
        provider_event_id: providerEventId,
        event_type: eventType,
        provider_message_id: providerMessageId || null,
        email_normalized: normalizeEmail(email) || null,
        payload: payload || {},
      })
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') return { event: null, duplicate: true };
      fail('recordProviderEvent', error);
    }
    return { event: data, duplicate: false };
  }

  async function deleteProviderEvent(providerEventId) {
    const { error } = await db('prospecting_events')
      .delete()
      .eq('provider_event_id', providerEventId);
    if (error) fail('deleteProviderEvent', error);
  }

  async function applyProviderEvent({ send, status, email }) {
    if (!send) return null;
    const now = new Date().toISOString();
    const currentRank = SEND_STATUS_RANK[send.status] ?? 0;
    const nextRank = SEND_STATUS_RANK[status] ?? 0;
    const applyStatus = nextRank >= currentRank;
    const patch = { updated_at: now };
    if (applyStatus) patch.status = status;
    if (status === 'sent' && !send.sent_at) patch.sent_at = now;
    if (applyStatus) {
      if (status === 'delivered' && !send.delivered_at) patch.delivered_at = now;
      if (status === 'bounced' && !send.bounced_at) patch.bounced_at = now;
      if (status === 'complained' && !send.complained_at) patch.complained_at = now;
    }
    const { data, error } = await db('prospecting_sends')
      .update(patch)
      .eq('id', send.id)
      .select('*')
      .maybeSingle();
    if (error) fail('applyProviderEvent.send', error);

    if (applyStatus) {
      const prospectPatch = { updated_at: now };
      if (status === 'bounced') {
        prospectPatch.status = 'bounced';
        prospectPatch.send_status = 'bounced';
      } else if (status === 'complained') {
        prospectPatch.status = 'complained';
        prospectPatch.send_status = 'complained';
      } else if (status === 'delivered') {
        prospectPatch.send_status = 'delivered';
      }
      const { error: prospectError } = await db('prospects')
        .update(prospectPatch)
        .eq('id', send.prospect_id);
      if (prospectError) fail('applyProviderEvent.prospect', prospectError);
    }

    if (status === 'bounced' || status === 'complained') {
      await addSuppression({
        email: email || send.to_email,
        reason: status === 'bounced' ? 'bounce' : 'complaint',
        source: 'resend_webhook',
        note: status === 'bounced' ? 'Rebote reportado por Resend' : 'Queja de spam reportada por Resend',
      });
    }
    return data;
  }

  async function getTodaySendCount(dayStartIso) {
    const { count, error } = await db('prospecting_sends')
      .select('*', { count: 'exact', head: true })
      .in('status', ['sent', 'delivered', 'bounced', 'complained', 'sending', 'unknown'])
      .gte('created_at', dayStartIso);
    if (error) fail('getTodaySendCount', error);
    return count || 0;
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

  async function markProspectUnsubscribed(prospectId) {
    return updateProspectStatus(prospectId, { status: 'unsubscribed', sendStatus: 'skipped' });
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
    const { data, error } = await db('prospects')
      .insert({
        dedupe_key: candidate.dedupe_key || `manual:${normalizeEmail(candidate.email)}`,
        email: candidate.email || null,
        contact_name: candidate.contact_name || null,
        role: candidate.role || null,
        firm_name: candidate.firm_name || 'Sin nombre',
        website: candidate.website || null,
        linkedin_url: candidate.linkedin_url || null,
        city: candidate.city || null,
        specialties: candidate.specialties || [],
        description: candidate.description || null,
        source: 'manual',
        source_url: candidate.source_url || null,
        validation_status: candidate.validation_status || (candidate.email ? 'valid' : 'no_email'),
        status: candidate.status || (candidate.email ? 'validated' : 'pending_contact'),
        notes: candidate.notes || null,
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
    updateRun,
    getRun,
    listRuns,
    getLatestRun,
    filterNewCandidates,
    getRegisteredContacts,
    listEligibleForRun,
    listPendingContact,
    createSend,
    claimSend,
    markSendResult,
    listRetryableSends,
    markProspectContacted,
    markProspectFailed,
    updateProspectStatus,
    addSuppression,
    removeSuppression,
    listSuppressions,
    findSendByProviderMessageId,
    recordProviderEvent,
    deleteProviderEvent,
    applyProviderEvent,
    getTodaySendCount,
    getOverviewCounts,
    listProspects,
    listSends,
    findProspect,
    findProspectByEmail,
    markProspectUnsubscribed,
    insertManualProspect,
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
