import { assessCandidateQuality } from './quality.mjs';

const TERMINAL_STATUSES = new Set([
  'contacted', 'bounced', 'complained', 'unsubscribed', 'failed', 'excluded', 'invalid',
]);

export function buildReauditPlan(rows, { now = () => new Date(), sourceEvidenceById = {} } = {}) {
  const evaluatedAt = now().toISOString();
  const updates = [];
  const summary = {
    total: rows.length,
    would_exclude: 0,
    would_keep: 0,
    kept_terminal_history: 0,
    manual_review: 0,
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
    summary.by_org_type[assessed.org_type] = (summary.by_org_type[assessed.org_type] || 0) + 1;
    if (assessed.email_kind) {
      summary.by_email_kind[assessed.email_kind] = (summary.by_email_kind[assessed.email_kind] || 0) + 1;
    }
    if (assessed.review_required) {
      summary.manual_review += 1;
      const reviewReason = assessed.review_reason || 'manual_review';
      summary.manual_review_by_reason[reviewReason] = (summary.manual_review_by_reason[reviewReason] || 0) + 1;
    }
    const terminal = TERMINAL_STATUSES.has(row.status);
    const patch = {
      email_kind: assessed.email_kind,
      org_type: assessed.org_type,
      rejection_reason: assessed.rejection_reason,
      person_key: assessed.person_key,
      domain_key: assessed.domain_key,
      mailbox_verified: false,
      quality_evaluated_at: evaluatedAt,
    };

    if (!terminal) {
      patch.status = assessed.status;
      patch.validation_status = assessed.validation_status;
    }

    if (terminal) {
      // El plan no cambia el estado de un prospecto con historial terminal.
      summary.would_keep += 1;
      summary.kept_terminal_history += 1;
    } else {
      const excluded = patch.status === 'excluded' || patch.validation_status === 'invalid';
      if (excluded) {
        summary.would_exclude += 1;
        const reason = patch.rejection_reason || 'quality_rejected';
        summary.by_reason[reason] = (summary.by_reason[reason] || 0) + 1;
      } else {
        summary.would_keep += 1;
      }
    }
    updates.push({
      id: row.id,
      patch,
      review: assessed.review_required
        ? { required: true, reason: assessed.review_reason }
        : null,
    });
  }

  return { summary, updates };
}
