import crypto from 'crypto';
import { fromZonedTime } from 'date-fns-tz';
import {
  buildLegalUpProUrl,
  buildUnsubscribeUrl,
  createUnsubscribeToken,
  renderProspectEmail,
} from './email.mjs';
import {
  dateKeyInTimezone,
  describeNextRun,
  manualRunKey,
  scheduledRunKey,
  startOfDayUtc,
} from './time.mjs';
import { normalizeEmail } from './validation.mjs';
import { MAX_SEND_ATTEMPTS } from './constants.mjs';

const SEND_DELAY_MS = 1200;
const DEFAULT_SENDER_NAME = 'Juan Guajardo | LegalUp';
const DEFAULT_SENDER_EMAIL = 'juan@legalup.cl';

export function createProspectingEngine({
  repository,
  discovery,
  mailer,
  env = process.env,
  logger = console,
  clock = () => new Date(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  if (!repository) throw new Error('repository required');
  if (!discovery) throw new Error('discovery required');
  if (!mailer) throw new Error('mailer required');

  async function startRun({ trigger = 'manual', mode = 'dry_run', actorId = null, confirm = false, testRecipient = null } = {}) {
    const now = clock();
    const settings = await repository.getSettings();
    if (!settings) throw httpError(503, 'prospecting_settings_missing');

    if (!['dry_run', 'send', 'test'].includes(mode)) throw httpError(400, 'invalid_mode');
    if (mode === 'send' && !confirm && trigger === 'manual') throw httpError(400, 'send_requires_confirmation');
    if (mode === 'send' && trigger === 'manual' && settings.dry_run) throw httpError(409, 'dry_run_enabled');
    if (mode === 'test' && !normalizeEmail(testRecipient)) throw httpError(400, 'test_recipient_required');
    if ((trigger === 'scheduled' || trigger === 'cron') && !settings.enabled) {
      return { run: null, skipped: true, reason: 'automation_disabled' };
    }

    const runKey = trigger === 'scheduled' || trigger === 'cron'
      ? scheduledRunKey(now, settings.timezone)
      : mode === 'test'
        ? `test:${now.toISOString()}:${crypto.randomUUID()}`
        : manualRunKey(now, actorId);

    const claim = await repository.claimRun({ runKey, trigger, mode, actorId });
    if (!claim?.claimed) {
      return {
        run: claim?.run || null,
        skipped: true,
        reason: claim?.reason || 'run_already_claimed',
      };
    }

    const execution = executeRun({
      run: claim.run,
      lockToken: claim.lock_token,
      settings,
      trigger,
      mode,
      actorId,
      confirm,
      testRecipient,
    });

    return {
      run: claim.run,
      skipped: false,
      reason: null,
      execution,
    };
  }

  async function executeRun({ run, lockToken, settings, trigger, mode, actorId, confirm, testRecipient }) {
    const startedAt = clock();
    const summary = {
      trigger,
      mode,
      actor_id: actorId || null,
      started_at: startedAt.toISOString(),
      rejected: { total: 0, by_reason: {} },
      failed_details: [],
      notes: [],
    };

    try {
      if (mode === 'test') {
        const result = await sendTestEmail({ run, settings, testRecipient, summary });
        const status = result.ok ? 'succeeded' : 'failed';
        await finishRun(run.id, status, {
          sent: result.ok ? 1 : 0,
          failed: result.ok ? 0 : 1,
          error: result.ok ? null : result.error,
          summary,
        });
        return { run_id: run.id, status, result };
      }

      if (trigger !== 'manual' && settings.dry_run && mode === 'send') {
        mode = 'dry_run';
        summary.mode = 'dry_run';
        summary.notes.push('forced_dry_run_by_settings');
      }

      await repository.recoverStaleRuns(settings.timezone);
      const discoveryResult = await discovery.discoverProspects({
        settings,
        target: settings.daily_target,
        env,
        logger,
      });
      const candidates = discoveryResult.candidates || [];
      summary.discovery = discoveryResult.stats || {};
      if (discoveryResult.reason) summary.notes.push(discoveryResult.reason);

      if (discoveryResult.reason === 'discovery_provider_not_configured') {
        await finishRun(run.id, 'skipped', {
          discovered: 0,
          inserted: 0,
          eligible: 0,
          error: null,
          summary: { ...summary, skip_reason: discoveryResult.reason },
        });
        return { run_id: run.id, status: 'skipped', reason: discoveryResult.reason };
      }

      await repository.updateRun(run.id, { discovered: candidates.length, summary });

      const filtered = await repository.filterNewCandidates(candidates, { runId: run.id });
      summary.rejected.total = filtered.rejected.length;
      for (const rejection of filtered.rejected) {
        summary.rejected.by_reason[rejection.reason] = (summary.rejected.by_reason[rejection.reason] || 0) + 1;
      }

      const eligible = await repository.listEligibleForRun(run.id, settings.max_sends_per_run);
      await repository.updateRun(run.id, {
        inserted: filtered.inserted.length,
        eligible: eligible.length,
        skipped: filtered.rejected.length,
        summary,
      });

      if (mode === 'dry_run') {
        summary.simulated = eligible.length;
        summary.preview_subjects = eligible.slice(0, 5).map((prospect) => renderProspectEmail({
          prospect,
          settings,
          unsubscribeUrl: buildUnsubscribeUrl({ appUrl: settings.app_url, token: 'dry-run' }),
          legalUpProUrl: buildLegalUpProUrl(settings, prospect.id),
        }).subject);
        await finishRun(run.id, 'succeeded', {
          discovered: candidates.length,
          inserted: filtered.inserted.length,
          eligible: eligible.length,
          sent: 0,
          skipped: filtered.rejected.length,
          summary,
        });
        return { run_id: run.id, status: 'succeeded', simulated: eligible.length };
      }

      const unsubscribeSecret = env.PROSPECTING_UNSUBSCRIBE_SECRET;
      if (!unsubscribeSecret) {
        throw new Error('unsubscribe_secret_not_configured');
      }

      const dayStart = startOfDayUtc(clock(), settings.timezone).toISOString();
      const sentToday = await repository.getTodaySendCount(dayStart);
      const dailyRemaining = Math.max(0, Number(settings.max_sends_per_day) - sentToday);
      const planned = Math.min(Number(settings.max_sends_per_run), dailyRemaining);
      summary.limits = { max_per_run: settings.max_sends_per_run, daily_remaining: dailyRemaining, planned };

      if (planned <= 0) {
        await finishRun(run.id, 'skipped', {
          discovered: candidates.length,
          inserted: filtered.inserted.length,
          eligible: eligible.length,
          skipped: filtered.rejected.length,
          error: null,
          summary: { ...summary, skip_reason: 'daily_send_limit_reached' },
        });
        return { run_id: run.id, status: 'skipped', reason: 'daily_send_limit_reached' };
      }

      const counts = { sent: 0, failed: 0, skipped: filtered.rejected.length, retried: 0 };
      const queue = await buildSendQueue({
        run,
        settings,
        eligible,
        planned,
        summary,
      });

      for (let index = 0; index < queue.length; index += 1) {
        if (counts.sent >= planned) break;
        const item = queue[index];
        const outcome = await processSend({ item, run, settings, unsubscribeSecret, summary });
        if (outcome === 'sent') counts.sent += 1;
        else if (outcome === 'failed') counts.failed += 1;
        else counts.skipped += 1;

        if (outcome === 'sent' && index < queue.length - 1) {
          await sleep(SEND_DELAY_MS);
        }
      }

      const status = counts.failed > 0 && counts.sent > 0
        ? 'partial'
        : counts.failed > 0 && counts.sent === 0
          ? 'failed'
          : 'succeeded';

      await finishRun(run.id, status, {
        discovered: candidates.length,
        inserted: filtered.inserted.length,
        eligible: eligible.length,
        sent: counts.sent,
        failed: counts.failed,
        skipped: counts.skipped,
        error: counts.failed > 0 && counts.sent === 0 ? 'all_sends_failed' : null,
        summary,
      });
      return { run_id: run.id, status, ...counts };
    } catch (error) {
      logger.error?.('[Prospecting] run failed', { run_id: run.id, error: error?.message || error });
      summary.error = String(error?.message || error).slice(0, 2000);
      await finishRun(run.id, 'failed', {
        error: summary.error,
        summary,
      });
      return { run_id: run.id, status: 'failed', error: summary.error };
    } finally {
      await repository.releaseLock(lockToken);
    }
  }

  async function buildSendQueue({ run, settings, eligible, planned, summary }) {
    const queue = [];
    const retryable = await repository.listRetryableSends(Math.min(10, planned));
    for (const send of retryable) {
      queue.push({ kind: 'retry', send });
    }

    const remaining = Math.max(0, planned - queue.length);
    for (const prospect of eligible.slice(0, remaining)) {
      const unsubscribeToken = createUnsubscribeToken(prospect.id, env.PROSPECTING_UNSUBSCRIBE_SECRET);
      const unsubscribeUrl = buildUnsubscribeUrl({ appUrl: settings.app_url, token: unsubscribeToken });
      const legalUpProUrl = buildLegalUpProUrl(settings, prospect.id);
      const rendered = renderProspectEmail({ prospect, settings, unsubscribeUrl, legalUpProUrl });
      const idempotencyKey = `legalup-prospect-${prospect.id}`;
      const { send, created } = await repository.createSend({
        runId: run.id,
        prospect,
        subject: rendered.subject,
        html: rendered.html,
        idempotencyKey,
      });
      if (!send) {
        summary.notes.push('send_create_conflict');
        continue;
      }
      if (!created) {
        summary.notes.push('prospect_already_has_send');
        continue;
      }
      queue.push({ kind: 'new', send, prospect, rendered, unsubscribeUrl });
    }
    return queue;
  }

  async function processSend({ item, run, settings, unsubscribeSecret, summary }) {
    const send = item.send;
    let prospect = item.prospect || null;
    if (!prospect) {
      prospect = await repository.findProspect(send.prospect_id);
    }
    if (!prospect) {
      await repository.markSendResult(send.id, {
        status: 'skipped',
        error: 'prospect_missing',
        transient: false,
      });
      return 'skipped';
    }

    const claimed = await repository.claimSend(send.id);
    if (!claimed) {
      summary.notes.push('send_claim_conflict');
      return 'skipped';
    }

    const rendered = item.rendered || {
      subject: claimed.subject,
      html: claimed.html,
      text: null,
    };
    const unsubscribeToken = createUnsubscribeToken(prospect.id, unsubscribeSecret);
    const unsubscribeUrl = buildUnsubscribeUrl({ appUrl: settings.app_url, token: unsubscribeToken });
    const from = `${settings.sender_name || DEFAULT_SENDER_NAME} <${settings.sender_email || DEFAULT_SENDER_EMAIL}>`;

    const result = await mailer.sendProspectEmail({
      from,
      to: claimed.to_email,
      replyTo: settings.reply_to || settings.sender_email || DEFAULT_SENDER_EMAIL,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text || undefined,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      idempotencyKey: claimed.idempotency_key,
    });

    if (result.ok) {
      await repository.markSendResult(claimed.id, {
        status: 'sent',
        providerMessageId: result.id,
        sentAt: clock().toISOString(),
      });
      await repository.markProspectContacted(prospect);
      if (item.kind === 'retry') summary.retried = (summary.retried || 0) + 1;
      return 'sent';
    }

    const terminal = !result.transient || claimed.attempt >= MAX_SEND_ATTEMPTS;
    await repository.markSendResult(claimed.id, {
      status: 'failed',
      error: result.error,
      transient: result.transient,
      terminal,
    });
    if (terminal) await repository.markProspectFailed(prospect.id);
    summary.failed_details.push({
      prospect_id: prospect.id,
      email: claimed.to_email,
      error: result.error,
      transient: Boolean(result.transient),
      attempts: result.attempts,
    });
    return 'failed';
  }

  async function sendTestEmail({ run, settings, testRecipient, summary }) {
    const token = createUnsubscribeToken(run.id, env.PROSPECTING_UNSUBSCRIBE_SECRET || 'test');
    const unsubscribeUrl = buildUnsubscribeUrl({ appUrl: settings.app_url, token: token || 'test' });
    const prospect = {
      id: run.id,
      firm_name: 'Estudio de prueba',
      contact_name: 'Juan',
      city: 'Santiago',
      specialties: ['Derecho civil', 'Derecho laboral'],
      website: 'https://legalup.cl',
      source_url: 'https://legalup.cl',
    };
    const rendered = renderProspectEmail({
      prospect,
      settings,
      unsubscribeUrl,
      legalUpProUrl: buildLegalUpProUrl(settings, prospect.id),
    });
    const from = `${settings.sender_name || DEFAULT_SENDER_NAME} <${settings.sender_email || DEFAULT_SENDER_EMAIL}>`;
    const result = await mailer.sendProspectEmail({
      from,
      to: normalizeEmail(testRecipient),
      replyTo: settings.reply_to || settings.sender_email || DEFAULT_SENDER_EMAIL,
      subject: `[Prueba] ${rendered.subject}`,
      html: rendered.html,
      text: rendered.text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      idempotencyKey: `legalup-prospecting-test-${run.id}`,
    });
    summary.test_recipient = normalizeEmail(testRecipient);
    summary.test_result = { ok: result.ok, provider_message_id: result.id, error: result.error };
    return result;
  }

  async function finishRun(runId, status, patch) {
    const finishedAt = clock().toISOString();
    return repository.updateRun(runId, {
      status,
      finished_at: finishedAt,
      ...patch,
    });
  }

  async function getOverview(now = clock()) {
    const settings = await repository.getSettings();
    const timezone = settings?.timezone || 'America/Santiago';
    const dayStartIso = startOfDayUtc(now, timezone).toISOString();
    const monthKey = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit' }).format(now);
    const monthStart = fromZonedTime(`${monthKey}-01T00:00:00`, timezone).toISOString();
    const [counts, latestRun] = await Promise.all([
      repository.getOverviewCounts({ dayStartIso, monthStartIso: monthStart }),
      repository.getLatestRun(),
    ]);
    return {
      settings,
      counts,
      latest_run: latestRun,
      next_run_at: describeNextRun(now, settings),
      server_time: now.toISOString(),
      timezone: settings?.timezone || 'America/Santiago',
      date_key: dateKeyInTimezone(now, settings?.timezone || 'America/Santiago'),
    };
  }

  return {
    startRun,
    executeRun,
    getOverview,
    sendTestEmail,
  };
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
