import crypto from 'crypto';
import dns from 'dns/promises';
import express from 'express';
import { createProspectingRepository } from './repository.mjs';
import { createProspectingEngine, httpError } from './engine.mjs';
import { discoverProspects } from './discovery.mjs';
import { createProspectingMailer } from './mailer.mjs';
import { mapResendEvent, verifyResendSignature } from './webhook.mjs';
import { isValidTimezone, normalizeScheduleTime } from './time.mjs';
import { isValidEmailSyntax, normalizeEmail } from './validation.mjs';
import { verifyUnsubscribeToken } from './email.mjs';

function actorId(req) {
  return req.adminUser?.id || req.auth?.user?.id || req.authUser?.id || null;
}

export function createProspectingModule({
  supabase,
  resend,
  requireAdmin,
  env = process.env,
  logger = console,
  clock = () => new Date(),
  fetchImpl = globalThis.fetch,
  resolveMx = (domain) => dns.resolveMx(domain),
  sleep,
  requireAdminMiddleware = null,
} = {}) {
  const repository = createProspectingRepository({ supabase, logger });
  const mailer = createProspectingMailer({ resend, logger, ...(sleep ? { sleep } : {}) });
  const engine = createProspectingEngine({
    repository,
    discovery: {
      discoverProspects: (options) => discoverProspects({ ...options, fetchImpl, resolveMx, logger, clock }),
    },
    mailer,
    env,
    logger,
    clock,
    ...(sleep ? { sleep } : {}),
  });

  const adminGuard = requireAdminMiddleware || requireAdmin || ((req, res, next) => next());

  const publicRouter = express.Router();
  const adminRouter = express.Router();

  publicRouter.get('/unsubscribe', async (req, res) => {
    await handleUnsubscribe(req, res, { repository, env, logger, viaPost: false });
  });
  publicRouter.post('/unsubscribe', async (req, res) => {
    await handleUnsubscribe(req, res, { repository, env, logger, viaPost: true });
  });
  adminRouter.get('/overview', async (req, res, next) => {
    try {
      const overview = await engine.getOverview();
      const data = sanitizeOverview(overview);
      
      // Diagnostic: log which search provider keys are present (without values)
      const searchKeys = {
        serper: Boolean(env.SERPER_API_KEY && env.SERPER_API_KEY.trim().length > 0),
        brave: Boolean(env.BRAVE_SEARCH_API_KEY && env.BRAVE_SEARCH_API_KEY.trim().length > 0),
        google_cse: Boolean(env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_API_KEY.trim().length > 0 && env.GOOGLE_CSE_CX && env.GOOGLE_CSE_CX.trim().length > 0),
      };
      logger.debug('[Prospecting] Search provider detection:', searchKeys);
      
      data.readiness = {
        search_provider: env.SERPER_API_KEY && env.SERPER_API_KEY.trim().length > 0 ? 'serper' : env.BRAVE_SEARCH_API_KEY && env.BRAVE_SEARCH_API_KEY.trim().length > 0 ? 'brave' : (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_API_KEY.trim().length > 0 && env.GOOGLE_CSE_CX && env.GOOGLE_CSE_CX.trim().length > 0) ? 'google_cse' : null,
        unsubscribe_secret: Boolean(env.PROSPECTING_UNSUBSCRIBE_SECRET),
        webhook_secret: Boolean(env.RESEND_WEBHOOK_SECRET),
        cron_secret: Boolean(env.PROSPECTING_CRON_SECRET),
        resend: Boolean(resend),
      };
      res.json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get('/settings', async (req, res, next) => {
    try {
      const settings = await repository.getSettings();
      res.json({ ok: true, data: sanitizeSettings(settings) });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.put('/settings', async (req, res, next) => {
    try {
      const patch = validateSettingsPatch(req.body || {});
      const settings = await repository.updateSettings(patch, actorId(req));
      res.json({ ok: true, data: sanitizeSettings(settings) });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.post('/run', async (req, res, next) => {
    try {
      const body = req.body || {};
      const mode = String(body.mode || 'dry_run');
      const trigger = 'manual';
      const result = await engine.startRun({
        trigger,
        mode,
        actorId: actorId(req),
        confirm: body.confirm === true,
        testRecipient: body.test_recipient || null,
      });
      if (result.skipped) {
        res.status(409).json({ ok: false, error: result.reason, run: result.run });
        return;
      }
      if (req.query.wait === '1' && result.execution) {
        const final = await result.execution;
        res.json({ ok: true, data: final, run: result.run });
        return;
      }
      result.execution?.catch((error) => {
        logger.error?.('[Prospecting] background run failed', { error: error?.message || error });
      });
      res.status(202).json({ ok: true, data: { run_id: result.run.id, status: 'running' }, run: result.run });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get('/runs', async (req, res, next) => {
    try {
      const rows = await repository.listRuns(Number(req.query.limit || 50));
      res.json({ ok: true, data: rows });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get('/runs/:id', async (req, res, next) => {
    try {
      const run = await repository.getRun(req.params.id);
      if (!run) throw httpError(404, 'run_not_found');
      res.json({ ok: true, data: run });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get('/prospects', async (req, res, next) => {
    try {
      const data = await repository.listProspects({
        status: req.query.status || null,
        search: req.query.search || null,
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.page_size || 50),
      });
      res.json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get('/sends', async (req, res, next) => {
    try {
      const data = await repository.listSends({
        status: req.query.status || null,
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.page_size || 50),
      });
      res.json({ ok: true, data });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get('/suppressions', async (req, res, next) => {
    try {
      const rows = await repository.listSuppressions(Number(req.query.limit || 200));
      res.json({ ok: true, data: rows });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.post('/suppressions', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!isValidEmailSyntax(email)) throw httpError(400, 'invalid_email');
      const row = await repository.addSuppression({
        email,
        reason: req.body?.reason || 'manual',
        source: 'admin_panel',
        note: req.body?.note || null,
        createdBy: actorId(req),
      });
      res.status(201).json({ ok: true, data: row });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.delete('/suppressions/:id', async (req, res, next) => {
    try {
      const row = await repository.removeSuppression(req.params.id);
      if (!row) throw httpError(404, 'suppression_not_found');
      res.json({ ok: true, data: row });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.post('/test-email', async (req, res, next) => {
    try {
      const result = await engine.startRun({
        trigger: 'manual',
        mode: 'test',
        actorId: actorId(req),
        testRecipient: req.body?.to || null,
      });
      if (result.skipped) {
        res.status(409).json({ ok: false, error: result.reason, run: result.run });
        return;
      }
      const final = await result.execution;
      res.json({ ok: true, data: final, run: result.run });
    } catch (error) {
      next(error);
    }
  });

  let schedulerTimer = null;
  let tickRunning = false;
  let lastScheduleAttemptKey = null;

  function startScheduler() {
    if (env.NODE_ENV === 'test' || env.PROSPECTING_SCHEDULER_DISABLED === '1') return null;
    if (schedulerTimer) return schedulerTimer;
    schedulerTimer = setInterval(() => {
      tick().catch((error) => logger.error?.('[Prospecting] scheduler tick failed', { error: error?.message || error }));
    }, 60_000);
    schedulerTimer.unref?.();
    tick().catch((error) => logger.error?.('[Prospecting] scheduler initial tick failed', { error: error?.message || error }));
    logger.info?.('[Prospecting] scheduler started');
    return schedulerTimer;
  }

  function stopScheduler() {
    if (schedulerTimer) clearInterval(schedulerTimer);
    schedulerTimer = null;
  }

  async function tick() {
    if (tickRunning) return;
    tickRunning = true;
    try {
      const settings = await repository.getSettings();
      if (!settings?.enabled) return;
      const now = clock();
      const dateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: settings.timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now);
      if (lastScheduleAttemptKey === dateKey) return;
      const localTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: settings.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      const scheduled = normalizeScheduleTime(settings.schedule_time)?.slice(0, 5) || '10:00';
      if (localTime < scheduled) return;

      await repository.recoverStaleRuns(settings.timezone);
      const result = await engine.startRun({ trigger: 'scheduled', mode: 'send', actorId: null });
      lastScheduleAttemptKey = dateKey;
      if (result.skipped) {
        logger.info?.('[Prospecting] scheduled run skipped', { reason: result.reason });
        return;
      }
      result.execution?.catch((error) => {
        logger.error?.('[Prospecting] scheduled execution failed', { error: error?.message || error });
      });
    } finally {
      tickRunning = false;
    }
  }

  async function cronHandler(req, res, next) {
    try {
      const secret = env.PROSPECTING_CRON_SECRET;
      if (!secret) throw httpError(503, 'cron_secret_not_configured');
      const provided = req.get('x-cron-secret')
        || String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!safeEqual(provided, secret)) throw httpError(401, 'invalid_cron_secret');
      const settings = await repository.getSettings();
      if (settings?.enabled === false) {
        res.status(200).json({ ok: true, skipped: true, reason: 'automation_disabled', run: null });
        return;
      }
      const now = clock();
      const timezone = settings?.timezone || 'America/Santiago';
      const localTime = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now);
      const scheduled = normalizeScheduleTime(settings?.schedule_time)?.slice(0, 5) || '10:00';
      if (localTime < scheduled) {
        res.status(200).json({ ok: true, skipped: true, reason: 'not_due', run: null });
        return;
      }
      const result = await engine.startRun({ trigger: 'cron', mode: 'send', actorId: null });
      if (result.skipped) {
        res.status(200).json({ ok: true, skipped: true, reason: result.reason, run: result.run });
        return;
      }
      result.execution?.catch((error) => {
        logger.error?.('[Prospecting] cron execution failed', { error: error?.message || error });
      });
      res.status(202).json({ ok: true, data: { run_id: result.run.id, status: 'running' } });
    } catch (error) {
      next(error);
    }
  }

  function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    const status = Number(error?.status) || 500;
    if (status >= 500) logger.error?.('[Prospecting] request failed', { path: req.path, error: error?.message || error });
    res.status(status).json({ ok: false, error: error?.message || 'internal_error' });
  }

  return {
    repository,
    engine,
    mailer,
    publicRouter,
    adminRouter,
    adminGuard,
    startScheduler,
    stopScheduler,
    cronHandler,
    errorHandler,
    handleWebhook: (req, res) => handleWebhook(req, res, { repository, env, logger, clock }),
  };
}

export async function handleWebhook(req, res, { repository, env, logger, clock = () => new Date() }) {
  const verification = verifyResendSignature({
    rawBody: req.body,
    headers: req.headers,
    secret: env.RESEND_WEBHOOK_SECRET,
    now: clock().getTime(),
  });
  if (!verification.ok) {
    res.status(verification.status).json({ ok: false, error: verification.reason });
    return;
  }

  let payload;
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '{}');
    payload = JSON.parse(raw);
  } catch {
    res.status(400).json({ ok: false, error: 'invalid_json' });
    return;
  }

  const event = mapResendEvent(payload);
  if (!event.status) {
    res.json({ ok: true, ignored: true, type: event.type });
    return;
  }

  const providerEventId = verification.svixId || `${event.type}:${event.providerMessageId || 'unknown'}:${payload?.created_at || ''}`;
  const recorded = await repository.recordProviderEvent({
    providerEventId,
    eventType: event.type,
    providerMessageId: event.providerMessageId,
    email: event.email,
    payload,
  });
  if (recorded.duplicate) {
    res.json({ ok: true, duplicate: true });
    return;
  }

  try {
    const send = await repository.findSendByProviderMessageId(event.providerMessageId);
    if (send) {
      await repository.applyProviderEvent({ send, status: event.status, email: event.email });
    }
    if (event.status === 'bounced' || event.status === 'complained') {
      await repository.addSuppression({
        email: event.email || send?.to_email || null,
        reason: event.status === 'bounced' ? 'bounce' : 'complaint',
        source: 'resend_webhook',
        note: send ? 'Evento asociado a un envío de prospección' : 'Evento sin envío de prospección asociado',
      });
    }
  } catch (error) {
    // Si falla el procesamiento, liberar el id del evento para que el reintento
    // de Resend no quede bloqueado como duplicado sin haberse aplicado.
    await repository.deleteProviderEvent(providerEventId).catch((cleanupError) => {
      logger.error?.('[Prospecting] webhook event cleanup failed', { error: cleanupError?.message || cleanupError });
    });
    throw error;
  }

  logger.info?.('[Prospecting] webhook processed', { type: event.type, status: event.status });
  res.json({ ok: true, status: event.status });
}

async function handleUnsubscribe(req, res, { repository, env, logger, viaPost }) {
  const token = String(req.query.token || req.body?.token || '');
  const secret = env.PROSPECTING_UNSUBSCRIBE_SECRET;
  if (!secret) {
    res.status(503).send(renderUnsubscribePage('No disponible', 'La baja temporalmente no está disponible. Escríbenos a juan@legalup.cl.'));
    return;
  }
  const prospectId = verifyUnsubscribeToken(token, secret);
  if (!prospectId) {
    res.status(400).send(renderUnsubscribePage('Enlace inválido', 'Este enlace de baja no es válido.'));
    return;
  }

  try {
    const prospect = await repository.findProspect(prospectId);
    if (prospect) {
      await repository.markProspectUnsubscribed(prospect.id);
      await repository.addSuppression({
        email: prospect.email || prospect.email_normalized,
        reason: 'unsubscribe',
        source: 'email_link',
        note: 'Baja solicitada desde el enlace del correo',
      });
    }
    if (viaPost) {
      res.status(200).json({ ok: true });
      return;
    }
    res.status(200).send(renderUnsubscribePage('Listo', 'No recibirás más correos comerciales de LegalUp. Gracias por avisarnos.'));
  } catch (error) {
    logger.error?.('[Prospecting] unsubscribe failed', { error: error?.message || error });
    res.status(500).send(renderUnsubscribePage('Error', 'No pudimos procesar la baja. Escríbenos a juan@legalup.cl.'));
  }
}

function validateSettingsPatch(body) {
  const patch = {};
  const booleanFields = ['enabled', 'dry_run'];
  for (const field of booleanFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'boolean') throw httpError(400, `${field}_must_be_boolean`);
      patch[field] = body[field];
    }
  }

  const ranges = {
    daily_target: [1, 500],
    max_sends_per_run: [0, 500],
    max_sends_per_day: [0, 1000],
  };
  for (const [field, [min, max]] of Object.entries(ranges)) {
    if (body[field] !== undefined) {
      const value = Number(body[field]);
      if (!Number.isFinite(value) || value < min || value > max) throw httpError(400, `${field}_out_of_range`);
      patch[field] = Math.trunc(value);
    }
  }

  if (body.schedule_time !== undefined) {
    const time = normalizeScheduleTime(body.schedule_time);
    if (!time) throw httpError(400, 'invalid_schedule_time');
    patch.schedule_time = time;
  }
  if (body.timezone !== undefined) {
    if (!isValidTimezone(body.timezone)) throw httpError(400, 'invalid_timezone');
    patch.timezone = String(body.timezone);
  }
  if (body.sender_name !== undefined) {
    const value = String(body.sender_name || '').trim();
    if (!value || value.length > 120) throw httpError(400, 'invalid_sender_name');
    patch.sender_name = value;
  }
  for (const field of ['sender_email', 'reply_to']) {
    if (body[field] !== undefined) {
      const value = normalizeEmail(body[field]);
      if (!isValidEmailSyntax(value)) throw httpError(400, `invalid_${field}`);
      patch[field] = value;
    }
  }
  if (body.app_url !== undefined) {
    let url;
    try {
      url = new URL(String(body.app_url));
    } catch {
      throw httpError(400, 'invalid_app_url');
    }
    if (url.protocol !== 'https:') throw httpError(400, 'app_url_must_be_https');
    patch.app_url = url.toString();
  }
  if (Object.keys(patch).length === 0) throw httpError(400, 'empty_settings_patch');
  return patch;
}

function sanitizeSettings(settings) {
  if (!settings) return null;
  const { lock_token, lock_until, ...safe } = settings;
  return safe;
}

function sanitizeOverview(overview) {
  if (!overview) return overview;
  return { ...overview, settings: sanitizeSettings(overview.settings) };
}

function safeEqual(a, b) {
  const left = crypto.createHash('sha256').update(String(a || '')).digest();
  const right = crypto.createHash('sha256').update(String(b || '')).digest();
  return crypto.timingSafeEqual(left, right);
}

function renderUnsubscribePage(title, message) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | LegalUp</title></head>
<body style="margin:0;padding:0;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
<div style="max-width:520px;margin:0 auto;padding:64px 24px;text-align:center;">
<div style="font-size:22px;font-weight:700;margin-bottom:24px;">LegalUp</div>
<div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;">
<h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(title)}</h1>
<p style="margin:0;color:#4b5563;line-height:1.6;">${escapeHtml(message)}</p>
</div>
<p style="margin:24px 0 0;font-size:12px;color:#6b7280;">LegalUp, Santiago, Chile.</p>
</div></body></html>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
