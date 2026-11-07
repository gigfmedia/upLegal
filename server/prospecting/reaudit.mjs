import {
  QUALITY_RULES_VERSION,
  assessCandidateQuality,
  isManualReviewReason,
  manualReviewCode,
  manualReviewReason,
} from './quality.mjs';

const TERMINAL_STATUSES = new Set([
  'contacted', 'bounced', 'complained', 'unsubscribed', 'failed', 'excluded', 'invalid',
]);

const QUALITY_FIELDS = [
  'email_kind', 'org_type', 'rejection_reason',
  'person_key', 'domain_key', 'mailbox_verified',
];

const REAL_TERMINAL_STATUSES = new Set([
  'contacted', 'bounced', 'complained', 'unsubscribed', 'failed', 'invalid',
]);

function isTerminalHistory(row) {
  if (isManualReviewReason(row.rejection_reason) && !REAL_TERMINAL_STATUSES.has(row.status)) {
    return false;
  }
  return TERMINAL_STATUSES.has(row.status) || row.validation_status === 'invalid';
}

function sameValue(left, right) {
  return (left ?? null) === (right ?? null);
}

export function buildReauditPlan(rows, { now = () => new Date(), sourceEvidenceById = {}, force = false } = {}) {
  const evaluatedAt = now().toISOString();
  const updates = [];
  const summary = {
    total: rows.length,
    evaluated: 0,
    changed: 0,
    skipped_current: 0,
    would_exclude: 0,
    would_keep: 0,
    kept_terminal_history: 0,
    manual_review: 0,
    excluded_or_review: 0,
    by_reason: {},
    by_org_type: {},
    by_email_kind: {},
    manual_review_by_reason: {},
  };

  for (const row of rows) {
    const evidence = sourceEvidenceById[row.id] || {};
    const assessed = assessCandidateQuality({
      ...row,
      contact_name: row.contact_name,
      source_url: row.source_url,
      website: row.website,
      description: row.description,
      sourceTitle: row.sourceTitle ?? row.source_title ?? evidence.sourceTitle ?? null,
      sourceH1: row.sourceH1 ?? row.source_h1 ?? evidence.sourceH1 ?? null,
      metaDescription: row.metaDescription ?? row.meta_description ?? evidence.metaDescription ?? null,
      jsonLdTypes: row.jsonLdTypes ?? row.json_ld_types ?? evidence.jsonLdTypes ?? [],
      siteSignals: row.siteSignals ?? row.site_signals ?? evidence.siteSignals ?? null,
    }, { pageUrl: row.source_url });
    summary.evaluated += 1;
    summary.by_org_type[assessed.org_type] = (summary.by_org_type[assessed.org_type] || 0) + 1;
    if (assessed.email_kind) {
      summary.by_email_kind[assessed.email_kind] = (summary.by_email_kind[assessed.email_kind] || 0) + 1;
    }
    const manual = assessed.review_required || isManualReviewReason(assessed.rejection_reason);
    const reviewReason = assessed.review_reason
      || manualReviewCode(assessed.rejection_reason)
      || 'manual_review';
    if (manual) {
      summary.manual_review += 1;
      summary.manual_review_by_reason[reviewReason] = (summary.manual_review_by_reason[reviewReason] || 0) + 1;
    }

    const terminal = isTerminalHistory(row);
    const patch = {
      email_kind: assessed.email_kind,
      org_type: assessed.org_type,
      rejection_reason: manual
        ? manualReviewReason(reviewReason)
        : assessed.rejection_reason,
      person_key: assessed.person_key,
      domain_key: assessed.domain_key,
      mailbox_verified: false,
      quality_evaluated_at: evaluatedAt,
      quality_rules_version: QUALITY_RULES_VERSION,
    };

    if (!terminal) {
      if (manual) {
        patch.status = ['new', 'validated', 'pending_contact'].includes(row.status)
          ? row.status
          : (assessed.email_kind ? 'validated' : 'pending_contact');
        patch.validation_status = 'pending';
      } else {
        patch.status = assessed.status;
        patch.validation_status = assessed.validation_status;
      }
    }

    const qualityChanged = !row.quality_evaluated_at
      || row.quality_rules_version !== QUALITY_RULES_VERSION
      || QUALITY_FIELDS.some((field) => !sameValue(row[field], patch[field]));
    const statusChanged = !terminal
      && (row.status !== patch.status || row.validation_status !== patch.validation_status);
    const changed = force || qualityChanged || statusChanged;

    if (terminal) {
      // El plan no cambia el estado de un prospecto con historial terminal.
      summary.would_keep += 1;
      summary.kept_terminal_history += 1;
    } else {
      const excluded = !manual && (patch.status === 'excluded' || patch.validation_status === 'invalid');
      if (excluded) {
        summary.would_exclude += 1;
        summary.excluded_or_review += 1;
        const reason = patch.rejection_reason || 'quality_rejected';
        summary.by_reason[reason] = (summary.by_reason[reason] || 0) + 1;
      } else if (manual) {
        summary.excluded_or_review += 1;
      } else {
        summary.would_keep += 1;
      }
    }

    if (!changed) {
      summary.skipped_current += 1;
      continue;
    }

    summary.changed += 1;
    updates.push({
      id: row.id,
      patch,
      changed: true,
      review: manual
        ? { required: true, reason: reviewReason }
        : null,
    });
  }

  return { rules_version: QUALITY_RULES_VERSION, summary, updates };
}
