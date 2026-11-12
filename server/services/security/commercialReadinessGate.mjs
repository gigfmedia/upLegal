import {
  DEFAULT_SIGNATURE_MAX_AGE_MS,
  MALWARE_SCAN_TIMEOUT_MS,
  checkScannerHealth,
  isMockScanner,
  isPlaceholderScanner,
  isTrustedProductionScanner,
  isUnconfiguredScanner,
  normalizeEnvironment,
} from './malwareScanner.mjs';

export const READINESS_ERROR_CODE = 'SERVICES_NOT_READY_FOR_REAL_DOCUMENTS';

export const READINESS_REASON_CODES = Object.freeze({
  ENVIRONMENT_NOT_ALLOWED: 'ENVIRONMENT_NOT_ALLOWED',
  ENVIRONMENT_NOT_PRODUCTION: 'ENVIRONMENT_NOT_PRODUCTION',
  REAL_DOCUMENTS_DISABLED: 'REAL_DOCUMENTS_DISABLED',
  EVIDENCE_REPOSITORY_UNAVAILABLE: 'EVIDENCE_REPOSITORY_UNAVAILABLE',
  EVIDENCE_REPOSITORY_TIMEOUT: 'EVIDENCE_REPOSITORY_TIMEOUT',
  EVIDENCE_REPOSITORY_INVALID: 'EVIDENCE_REPOSITORY_INVALID',
  EVIDENCE_REPOSITORY_TOO_LARGE: 'EVIDENCE_REPOSITORY_TOO_LARGE',
  EVIDENCE_REPOSITORY_UNTRUSTED: 'EVIDENCE_REPOSITORY_UNTRUSTED',
  SCANNER_NOT_CONFIGURED: 'SCANNER_NOT_CONFIGURED',
  SCANNER_NOT_TRUSTED: 'SCANNER_NOT_TRUSTED',
  SCANNER_MOCK_FORBIDDEN: 'SCANNER_MOCK_FORBIDDEN',
  SCANNER_PLACEHOLDER_FORBIDDEN: 'SCANNER_PLACEHOLDER_FORBIDDEN',
  SCANNER_UNHEALTHY: 'SCANNER_UNHEALTHY',
  SCANNER_CIRCUIT_OPEN: 'SCANNER_CIRCUIT_OPEN',
  RETENTION_PARAMETERS_INVALID: 'RETENTION_PARAMETERS_INVALID',
  RETENTION_PARAMETERS_MISMATCH: 'RETENTION_PARAMETERS_MISMATCH',
  RETENTION_POLICY_MISSING: 'RETENTION_POLICY_MISSING',
  RETENTION_POLICY_NOT_ACTIVE: 'RETENTION_POLICY_NOT_ACTIVE',
  RETENTION_POLICY_INVALID: 'RETENTION_POLICY_INVALID',
  RETENTION_POLICY_SCOPE_INVALID: 'RETENTION_POLICY_SCOPE_INVALID',
  PURGE_EVIDENCE_MISSING: 'PURGE_EVIDENCE_MISSING',
  PURGE_EVIDENCE_INVALID: 'PURGE_EVIDENCE_INVALID',
  PURGE_EVIDENCE_FAILED: 'PURGE_EVIDENCE_FAILED',
  PURGE_EVIDENCE_STALE: 'PURGE_EVIDENCE_STALE',
  PURGE_EVIDENCE_UNRESOLVED_FAILURES: 'PURGE_EVIDENCE_UNRESOLVED_FAILURES',
  PURGE_WORKER_DISABLED: 'PURGE_WORKER_DISABLED',
  PURGE_STALENESS_WINDOW_UNAVAILABLE: 'PURGE_STALENESS_WINDOW_UNAVAILABLE',
  INFRASTRUCTURE_EVIDENCE_MISSING: 'INFRASTRUCTURE_EVIDENCE_MISSING',
  INFRASTRUCTURE_CHECK_FAILED: 'INFRASTRUCTURE_CHECK_FAILED',
  INFRASTRUCTURE_CHECK_DESTRUCTIVE: 'INFRASTRUCTURE_CHECK_DESTRUCTIVE',
  DPA_EVIDENCE_MISSING: 'DPA_EVIDENCE_MISSING',
  DPA_EVIDENCE_INVALID: 'DPA_EVIDENCE_INVALID',
  DPA_EVIDENCE_NOT_ACTIVE: 'DPA_EVIDENCE_NOT_ACTIVE',
  DPA_EVIDENCE_EXPIRED: 'DPA_EVIDENCE_EXPIRED',
  DPA_SCOPE_INVALID: 'DPA_SCOPE_INVALID',
  AI_PROVIDER_NOT_CONFIGURED: 'AI_PROVIDER_NOT_CONFIGURED',
  AI_PROVIDER_UNKNOWN: 'AI_PROVIDER_UNKNOWN',
  DPA_PROVIDER_MISMATCH: 'DPA_PROVIDER_MISMATCH',
  LEGAL_VALIDATION_MISSING: 'LEGAL_VALIDATION_MISSING',
  LEGAL_VALIDATION_INVALID: 'LEGAL_VALIDATION_INVALID',
  LEGAL_VALIDATION_NOT_ACTIVE: 'LEGAL_VALIDATION_NOT_ACTIVE',
  LEGAL_VALIDATION_EXPIRED: 'LEGAL_VALIDATION_EXPIRED',
  LEGAL_VALIDATION_SCOPE_INVALID: 'LEGAL_VALIDATION_SCOPE_INVALID',
});

const RETENTION_PARAMETER_KEYS = Object.freeze([
  'delivered_order_retention_days',
  'cancelled_order_retention_days',
  'payment_proof_retention_days',
  'max_purge_staleness_window_hours',
]);

const RETENTION_PARAMETER_ALIASES = Object.freeze({
  delivered_order_retention_days: [
    'delivered_order_retention_days',
    'deliveredOrderRetentionDays',
    'delivered_retention_days',
    'deliveredRetentionDays',
    'deliveredDays',
  ],
  cancelled_order_retention_days: [
    'cancelled_order_retention_days',
    'cancelledOrderRetentionDays',
    'cancelled_retention_days',
    'cancelledRetentionDays',
    'cancelledDays',
  ],
  payment_proof_retention_days: [
    'payment_proof_retention_days',
    'paymentProofRetentionDays',
    'proof_retention_days',
    'proofRetentionDays',
    'paymentProofDays',
  ],
  max_purge_staleness_window_hours: [
    'max_purge_staleness_window_hours',
    'maxPurgeStalenessWindowHours',
    'max_purge_staleness_hours',
    'maxPurgeStalenessHours',
  ],
});

const ACTIVE_STATUSES = new Set(['active', 'approved', 'valid', 'current']);
const KNOWN_ENVIRONMENTS = new Set(['development', 'production', 'test']);
const DEFAULT_MAX_EVIDENCE_BYTES = 256 * 1024;
const SERVICE_SCOPE = 'services';
const DOCUMENT_ANALYSIS_SCOPE = 'document_analysis';
const SCOPE_ALIASES = Object.freeze({
  [SERVICE_SCOPE]: new Set([SERVICE_SCOPE, 'legalup_services']),
  [DOCUMENT_ANALYSIS_SCOPE]: new Set([
    DOCUMENT_ANALYSIS_SCOPE,
    'ai_document_analysis',
    'services_document_analysis',
  ]),
});
const TRUSTED_EVIDENCE_REPOSITORIES = new WeakSet();

function valueOf(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') {
      return source[key];
    }
  }
  return undefined;
}

function normalizeStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeRequiredString(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function parseBoolean(value) {
  if (value === true) return true;
  if (value === false) return false;
  return String(value ?? '').trim().toLowerCase() === 'true';
}

const INFRASTRUCTURE_DESTRUCTIVE_ALIASES = Object.freeze([
  'destructive',
  'isDestructive',
  'is_destructive',
]);
const INFRASTRUCTURE_READ_ONLY_ALIASES = Object.freeze([
  'readOnly',
  'read_only',
  'databaseReadOnly',
  'database_read_only',
]);
const INFRASTRUCTURE_DOCUMENT_ALIASES = Object.freeze([
  'serviceDocuments',
  'service_documents',
  'storageDocuments',
  'storage_documents',
  'documents',
  'documentsBucket',
]);
const INFRASTRUCTURE_PROOF_ALIASES = Object.freeze([
  'servicePaymentProofs',
  'service_payment_proofs',
  'storagePaymentProofs',
  'storage_payment_proofs',
  'paymentProofs',
  'paymentProofsBucket',
]);

function hasOwn(source, key) {
  return Boolean(source && Object.prototype.hasOwnProperty.call(source, key));
}

function aliasEntries(source, keys) {
  if (!source || typeof source !== 'object') return [];
  return keys.filter((key) => hasOwn(source, key)).map((key) => [key, source[key]]);
}

function normalizeBooleanAliases(source, keys, { required = true } = {}) {
  const entries = aliasEntries(source, keys);
  if (entries.length === 0) {
    return required
      ? { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED }
      : { ok: true, present: false, value: null };
  }

  let value;
  for (const [, raw] of entries) {
    if (typeof raw !== 'boolean') {
      return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
    }
    if (value !== undefined && value !== raw) {
      return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
    }
    value = raw;
  }

  return { ok: true, present: true, value };
}

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value);
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

const CANONICAL_PROVIDER_IDS = new Map([
  ['openai', 'openai'],
  ['openrouter', 'openrouter'],
  ['groq', 'groq'],
  ['deepseek', 'deepseek'],
  ['anthropic', 'anthropic'],
]);

function normalizeProviderIdentity(value) {
  const provider = normalizeRequiredString(value)?.toLowerCase();
  if (!provider) return null;
  return CANONICAL_PROVIDER_IDS.get(provider) ?? 'unknown';
}

function scopeTokens(value) {
  const items = Array.isArray(value) ? value : [value];
  return items
    .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
    .map((item) => item.trim().toLowerCase().replace(/[\s-]+/g, '_'))
    .filter(Boolean);
}

function hasScope(value, required) {
  const allowed = SCOPE_ALIASES[required] ?? new Set([required]);
  return scopeTokens(value).some((token) => allowed.has(token));
}

function reason(code, category, message) {
  return { code, category, message };
}

function success() {
  return { ok: true, code: null, reason: null };
}

function normalizeTimeout(value, fallback, max = null) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  const bounded = Math.max(1, Math.trunc(numeric));
  return max === null ? bounded : Math.min(max, bounded);
}

function evidenceByteLength(evidence) {
  try {
    const serialized = JSON.stringify(evidence);
    if (typeof serialized !== 'string') return null;
    return Buffer.byteLength(serialized, 'utf8');
  } catch {
    return null;
  }
}

function withTimeout(promise, timeoutMs, code) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = new Error('readiness_evidence_timeout');
      error.code = code;
      reject(error);
    }, timeoutMs);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function normalizeRetentionParameters(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, code: READINESS_REASON_CODES.RETENTION_PARAMETERS_INVALID, missing: [] };
  }

  const normalized = {};
  const missing = [];
  for (const canonical of RETENTION_PARAMETER_KEYS) {
    const raw = valueOf(input, RETENTION_PARAMETER_ALIASES[canonical]);
    if (raw === undefined) {
      missing.push(canonical);
      continue;
    }
    const numeric = Number(raw);
    if (
      typeof raw === 'boolean' ||
      typeof raw === 'object' ||
      !Number.isFinite(numeric) ||
      numeric <= 0 ||
      !Number.isInteger(numeric)
    ) {
      return { ok: false, code: READINESS_REASON_CODES.RETENTION_PARAMETERS_INVALID, missing: [] };
    }
    normalized[canonical] = numeric;
  }

  if (missing.length > 0) {
    return { ok: false, code: READINESS_REASON_CODES.RETENTION_PARAMETERS_INVALID, missing };
  }

  return { ok: true, value: normalized };
}

function normalizeRetentionPolicy(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return { ok: false, code: READINESS_REASON_CODES.RETENTION_POLICY_MISSING };
  }

  const policyVersion = normalizeRequiredString(valueOf(evidence, ['policyVersion', 'policy_version']));
  const approvedAt = toDate(valueOf(evidence, ['approvedAt', 'approved_at']));
  const approvedBy = normalizeRequiredString(valueOf(evidence, ['approvedBy', 'approved_by']));
  const status = normalizeStatus(valueOf(evidence, ['status']));
  const scope = valueOf(evidence, ['serviceScope', 'service_scope', 'scope', 'services']);
  const authorized = normalizeRetentionParameters(
    valueOf(evidence, ['authorizedParameters', 'authorized_parameters']),
  );

  if (!policyVersion || !approvedBy || !approvedAt || !authorized.ok) {
    return { ok: false, code: READINESS_REASON_CODES.RETENTION_POLICY_INVALID };
  }
  if (!hasScope(scope, SERVICE_SCOPE)) {
    return { ok: false, code: READINESS_REASON_CODES.RETENTION_POLICY_SCOPE_INVALID };
  }
  if (!ACTIVE_STATUSES.has(status)) {
    return { ok: false, code: READINESS_REASON_CODES.RETENTION_POLICY_NOT_ACTIVE };
  }

  return {
    ok: true,
    policyVersion,
    approvedAt,
    approvedBy,
    scope: scopeTokens(scope),
    status,
    authorizedParameters: authorized.value,
  };
}

function normalizeDpa(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return { ok: false, code: READINESS_REASON_CODES.DPA_EVIDENCE_MISSING };
  }

  const contractId = normalizeRequiredString(
    valueOf(evidence, ['contractId', 'contract_id', 'dpaId', 'dpa_id']),
  );
  const provider = normalizeRequiredString(
    valueOf(evidence, ['provider', 'providerName', 'provider_name']),
  );
  const signedAtRaw = valueOf(evidence, ['signedAt', 'signed_at']);
  const validFromRaw = valueOf(evidence, ['validFrom', 'valid_from']);
  const validUntilRaw = valueOf(evidence, ['validUntil', 'valid_until', 'expiresAt', 'expires_at']);
  const signedAt = toDate(signedAtRaw);
  const validFrom = toDate(validFromRaw);
  const validUntil = toDate(validUntilRaw);
  const status = normalizeStatus(valueOf(evidence, ['status']));
  const serviceScope = valueOf(evidence, ['serviceScope', 'service_scope', 'scope', 'services']);
  const dataUsage = valueOf(evidence, ['dataUsage', 'data_usage', 'usage', 'purposes']);

  if (
    !contractId ||
    !provider ||
    !signedAt ||
    !validUntil ||
    (validFromRaw !== undefined && !validFrom)
  ) {
    return { ok: false, code: READINESS_REASON_CODES.DPA_EVIDENCE_INVALID };
  }
  if (!hasScope(serviceScope, SERVICE_SCOPE) || !hasScope(dataUsage, DOCUMENT_ANALYSIS_SCOPE)) {
    return { ok: false, code: READINESS_REASON_CODES.DPA_SCOPE_INVALID };
  }
  if (!ACTIVE_STATUSES.has(status)) {
    return { ok: false, code: READINESS_REASON_CODES.DPA_EVIDENCE_NOT_ACTIVE };
  }

  return {
    ok: true,
    contractId,
    provider,
    signedAt,
    validFrom,
    validUntil,
    status,
    serviceScope: scopeTokens(serviceScope),
    dataUsage: scopeTokens(dataUsage),
  };
}

function normalizeLegalValidation(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return { ok: false, code: READINESS_REASON_CODES.LEGAL_VALIDATION_MISSING };
  }

  const version = normalizeRequiredString(
    valueOf(evidence, ['version', 'validationVersion', 'validation_version']),
  );
  const reviewedAtRaw = valueOf(
    evidence,
    ['reviewedAt', 'reviewed_at', 'approvedAt', 'approved_at', 'validatedAt', 'validated_at'],
  );
  const validUntilRaw = valueOf(evidence, ['validUntil', 'valid_until', 'expiresAt', 'expires_at']);
  const reviewedAt = toDate(reviewedAtRaw);
  const validUntil = toDate(validUntilRaw);
  const status = normalizeStatus(valueOf(evidence, ['status']));
  const scope = valueOf(evidence, ['serviceScope', 'service_scope', 'scope', 'services']);

  if (!version || !reviewedAt || (validUntilRaw !== undefined && !validUntil)) {
    return { ok: false, code: READINESS_REASON_CODES.LEGAL_VALIDATION_INVALID };
  }
  if (!hasScope(scope, SERVICE_SCOPE)) {
    return { ok: false, code: READINESS_REASON_CODES.LEGAL_VALIDATION_SCOPE_INVALID };
  }
  if (!ACTIVE_STATUSES.has(status)) {
    return { ok: false, code: READINESS_REASON_CODES.LEGAL_VALIDATION_NOT_ACTIVE };
  }

  return {
    ok: true,
    version,
    reviewedAt,
    validUntil,
    scope: scopeTokens(scope),
    status,
  };
}

function normalizePurgeEvidence(evidence) {
  if (!evidence || typeof evidence !== 'object') {
    return { ok: false, code: READINESS_REASON_CODES.PURGE_EVIDENCE_MISSING };
  }

  const enabled = valueOf(
    evidence,
    ['enabled', 'workerEnabled', 'worker_enabled', 'registered', 'isRegistered', 'is_registered'],
  );
  if (enabled === undefined) {
    return { ok: false, code: READINESS_REASON_CODES.PURGE_EVIDENCE_INVALID };
  }
  if (!parseBoolean(enabled)) {
    return { ok: false, code: READINESS_REASON_CODES.PURGE_WORKER_DISABLED };
  }

  const lastSuccessfulRunAt = toDate(
    valueOf(evidence, ['lastSuccessfulRunAt', 'last_successful_run_at']),
  );
  const lastRunResult = normalizeStatus(
    valueOf(evidence, ['lastRunResult', 'last_run_result']),
  );
  const unresolvedCriticalFailures = valueOf(
    evidence,
    [
      'unresolvedCriticalFailures',
      'unresolved_critical_failures',
      'unresolvedCriticalFailureCount',
      'unresolved_critical_failure_count',
    ],
  );

  if (
    !lastSuccessfulRunAt ||
    typeof unresolvedCriticalFailures !== 'number' ||
    !Number.isInteger(unresolvedCriticalFailures) ||
    unresolvedCriticalFailures < 0
  ) {
    return { ok: false, code: READINESS_REASON_CODES.PURGE_EVIDENCE_INVALID };
  }
  if (lastRunResult !== 'success') {
    return { ok: false, code: READINESS_REASON_CODES.PURGE_EVIDENCE_FAILED };
  }
  if (unresolvedCriticalFailures > 0) {
    return {
      ok: false,
      code: READINESS_REASON_CODES.PURGE_EVIDENCE_UNRESOLVED_FAILURES,
    };
  }

  return {
    ok: true,
    enabled: true,
    lastSuccessfulRunAt,
    lastRunResult,
    unresolvedCriticalFailures,
  };
}

function normalizeInfrastructure(evidence) {
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_EVIDENCE_MISSING };
  }

  const destructive = normalizeBooleanAliases(evidence, INFRASTRUCTURE_DESTRUCTIVE_ALIASES);
  const readOnly = normalizeBooleanAliases(evidence, INFRASTRUCTURE_READ_ONLY_ALIASES);
  if (!destructive.ok || !readOnly.ok) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }
  if (destructive.value || !readOnly.value) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_DESTRUCTIVE };
  }

  if (hasOwn(evidence, 'ok')) {
    if (typeof evidence.ok !== 'boolean' || !evidence.ok) {
      return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
    }
  }

  const hasStorage = hasOwn(evidence, 'storage');
  if (
    hasStorage &&
    (!evidence.storage || typeof evidence.storage !== 'object' || Array.isArray(evidence.storage))
  ) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }
  const storage = hasStorage ? evidence.storage : null;

  const storageDocuments = storage
    ? normalizeBooleanAliases(storage, INFRASTRUCTURE_DOCUMENT_ALIASES)
    : { ok: true, present: false, value: null };
  const topLevelDocuments = normalizeBooleanAliases(evidence, INFRASTRUCTURE_DOCUMENT_ALIASES, {
    required: !storage,
  });
  if (!storageDocuments.ok || !topLevelDocuments.ok) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }
  if (
    storageDocuments.present &&
    topLevelDocuments.present &&
    storageDocuments.value !== topLevelDocuments.value
  ) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }
  const documentsOk = storageDocuments.present
    ? storageDocuments.value
    : topLevelDocuments.value;
  if (!documentsOk) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }

  const storageProofs = storage
    ? normalizeBooleanAliases(storage, INFRASTRUCTURE_PROOF_ALIASES)
    : { ok: true, present: false, value: null };
  const topLevelProofs = normalizeBooleanAliases(evidence, INFRASTRUCTURE_PROOF_ALIASES, {
    required: !storage,
  });
  if (!storageProofs.ok || !topLevelProofs.ok) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }
  if (
    storageProofs.present &&
    topLevelProofs.present &&
    storageProofs.value !== topLevelProofs.value
  ) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }
  const proofsOk = storageProofs.present ? storageProofs.value : topLevelProofs.value;
  if (!proofsOk) {
    return { ok: false, code: READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED };
  }

  return success();
}

export class ReadinessEvidenceRepositoryPort {
  constructor({ name = 'readiness-evidence-repository' } = {}) {
    this.name = name;
  }

  async getRetentionPolicyEvidence() {
    throw new Error('ReadinessEvidenceRepositoryPort.getRetentionPolicyEvidence debe implementarse.');
  }

  async getAiDpaEvidence() {
    return this.getDpaEvidence();
  }

  async getDpaEvidence() {
    throw new Error('ReadinessEvidenceRepositoryPort.getAiDpaEvidence debe implementarse.');
  }

  async getLegalValidationEvidence() {
    throw new Error('ReadinessEvidenceRepositoryPort.getLegalValidationEvidence debe implementarse.');
  }

  async getPurgeWorkerEvidence() {
    throw new Error('ReadinessEvidenceRepositoryPort.getPurgeWorkerEvidence debe implementarse.');
  }

  async verifyNonDestructiveInfrastructure() {
    return this.getInfrastructureEvidence();
  }

  async getInfrastructureEvidence() {
    throw new Error('ReadinessEvidenceRepositoryPort.verifyNonDestructiveInfrastructure debe implementarse.');
  }

  async loadEvidence() {
    const [
      retentionPolicy,
      aiDpa,
      legalValidation,
      purgeWorker,
      infrastructure,
    ] = await Promise.all([
      this.getRetentionPolicyEvidence(),
      this.getAiDpaEvidence(),
      this.getLegalValidationEvidence(),
      this.getPurgeWorkerEvidence(),
      this.verifyNonDestructiveInfrastructure(),
    ]);
    return {
      retentionPolicy,
      aiDpa,
      legalValidation,
      purgeWorker,
      infrastructure,
    };
  }
}

class TrustedReadinessEvidenceRepository {
  constructor(adapter) {
    this.adapter = adapter;
    this.name = adapter.name || 'trusted-readiness-evidence-repository';
  }

  async loadEvidence() {
    if (typeof this.adapter.loadEvidence === 'function') {
      return this.adapter.loadEvidence();
    }
    const [
      retentionPolicy,
      aiDpa,
      legalValidation,
      purgeWorker,
      infrastructure,
    ] = await Promise.all([
      this.adapter.getRetentionPolicyEvidence(),
      this.adapter.getAiDpaEvidence(),
      this.adapter.getLegalValidationEvidence(),
      this.adapter.getPurgeWorkerEvidence(),
      this.adapter.verifyNonDestructiveInfrastructure(),
    ]);
    return {
      retentionPolicy,
      aiDpa,
      legalValidation,
      purgeWorker,
      infrastructure,
    };
  }
}

export function isTrustedReadinessEvidenceRepository(repository) {
  return Boolean(repository && TRUSTED_EVIDENCE_REPOSITORIES.has(repository));
}

export function createReadinessEvidenceRepository({
  environment = process.env.NODE_ENV,
  repository = null,
  repositoryFactory = null,
} = {}) {
  const env = normalizeEnvironment(environment);

  if (env === 'production') {
    if (repository) {
      const error = new Error('La inyección directa del repositorio de evidencias está prohibida.');
      error.code = 'EVIDENCE_REPOSITORY_INJECTION_FORBIDDEN';
      throw error;
    }
    if (typeof repositoryFactory !== 'function') return null;
    const adapter = repositoryFactory();
    if (adapter && typeof adapter.then === 'function') {
      const error = new Error('La fábrica del repositorio de evidencias debe ser síncrona.');
      error.code = 'EVIDENCE_REPOSITORY_FACTORY_INVALID';
      throw error;
    }
    if (!adapter || typeof adapter !== 'object') {
      const error = new Error('La fábrica del repositorio de evidencias no devolvió un objeto.');
      error.code = 'EVIDENCE_REPOSITORY_FACTORY_INVALID';
      throw error;
    }
    if (
      typeof adapter.loadEvidence !== 'function' &&
      typeof adapter.getRetentionPolicyEvidence !== 'function'
    ) {
      const error = new Error('El repositorio de evidencias no implementa el contrato requerido.');
      error.code = 'EVIDENCE_REPOSITORY_INVALID';
      throw error;
    }
    const trusted = new TrustedReadinessEvidenceRepository(adapter);
    TRUSTED_EVIDENCE_REPOSITORIES.add(trusted);
    return trusted;
  }

  if (!KNOWN_ENVIRONMENTS.has(env)) {
    const error = new Error('Entorno no permitido para construir el repositorio de evidencias.');
    error.code = 'ENVIRONMENT_NOT_ALLOWED';
    throw error;
  }

  if (repository) return repository;
  if (typeof repositoryFactory !== 'function') return null;
  const adapter = repositoryFactory();
  const trusted = new TrustedReadinessEvidenceRepository(adapter);
  TRUSTED_EVIDENCE_REPOSITORIES.add(trusted);
  return trusted;
}

export class CommercialReadinessError extends Error {
  constructor(reasons, status = null) {
    super('El procesamiento comercial de documentos reales no está habilitado.');
    this.name = 'CommercialReadinessError';
    this.code = READINESS_ERROR_CODE;
    this.statusCode = 503;
    this.reasons = Array.isArray(reasons) ? reasons : [];
    this.status = status;
  }
}

export class CommercialReadinessGate {
  constructor({
    environment = process.env.NODE_ENV,
    realDocumentsEnabled = process.env.SERVICES_REAL_DOCUMENTS_ENABLED,
    scanner = null,
    malwareScanner = null,
    retentionParameters = null,
    retentionConfig = null,
    evidenceRepository = null,
    readinessEvidenceRepository = null,
    aiProvider = null,
    now = () => new Date(),
    scannerTimeoutMs = MALWARE_SCAN_TIMEOUT_MS,
    healthCheckTimeoutMs = MALWARE_SCAN_TIMEOUT_MS,
    signatureMaxAgeMs = DEFAULT_SIGNATURE_MAX_AGE_MS,
    evidenceTimeoutMs = 5000,
    maxEvidenceBytes = DEFAULT_MAX_EVIDENCE_BYTES,
    circuitState = null,
    circuitBreakerCooldownMs = 30000,
  } = {}) {
    this.environment = normalizeEnvironment(environment);
    this.realDocumentsEnabled = parseBoolean(realDocumentsEnabled);
    this.scanner = scanner ?? malwareScanner;
    this.retentionParameters = retentionParameters ?? retentionConfig;
    this.evidenceRepository = evidenceRepository ?? readinessEvidenceRepository;
    this.aiProvider = normalizeProviderIdentity(aiProvider);
    this.now = typeof now === 'function' ? now : () => new Date();
    this.scannerTimeoutMs = normalizeTimeout(scannerTimeoutMs, MALWARE_SCAN_TIMEOUT_MS, MALWARE_SCAN_TIMEOUT_MS);
    this.healthCheckTimeoutMs = normalizeTimeout(
      healthCheckTimeoutMs,
      MALWARE_SCAN_TIMEOUT_MS,
      MALWARE_SCAN_TIMEOUT_MS,
    );
    this.signatureMaxAgeMs = normalizeTimeout(
      signatureMaxAgeMs,
      DEFAULT_SIGNATURE_MAX_AGE_MS,
    );
    this.evidenceTimeoutMs = normalizeTimeout(evidenceTimeoutMs, 5000);
    this.maxEvidenceBytes = normalizeTimeout(maxEvidenceBytes, DEFAULT_MAX_EVIDENCE_BYTES);
    this.circuitBreakerCooldownMs = normalizeTimeout(circuitBreakerCooldownMs, 30000);
    this.circuitState =
      circuitState && typeof circuitState === 'object'
        ? circuitState
        : { openUntil: 0, lastFailureAt: 0, failureRevision: 0 };
  }

  nowMs() {
    return toDate(this.now())?.getTime() ?? Date.now();
  }

  circuitFailureRevision() {
    return Number.isInteger(this.circuitState.failureRevision)
      ? this.circuitState.failureRevision
      : 0;
  }

  recordScanResult(result, { observedAt = this.nowMs() } = {}) {
    const timestamp = Number.isFinite(Number(observedAt)) ? Number(observedAt) : this.nowMs();
    const status = normalizeStatus(result?.status);
    if (status === 'unavailable' || status === 'failed') {
      this.circuitState.failureRevision = this.circuitFailureRevision() + 1;
      this.circuitState.openUntil = Math.max(
        this.circuitState.openUntil,
        timestamp + this.circuitBreakerCooldownMs,
      );
      this.circuitState.lastFailureAt = Math.max(this.circuitState.lastFailureAt, timestamp);
    }
    return this.circuitState.openUntil;
  }

  async evaluate() {
    const now = new Date(this.nowMs());
    const reasons = [];
    const checks = {
      environment: { ok: false, code: null },
      technical: {
        scanner: { ok: false, code: null },
        retention: { ok: false, code: null },
        purgeWorker: { ok: false, code: null },
        infrastructure: { ok: false, code: null },
      },
      formal: {
        retentionPolicy: { ok: false, code: null },
        aiDpa: { ok: false, code: null },
        legalValidation: { ok: false, code: null },
      },
    };

    const finish = () => ({
      allowed: reasons.length === 0,
      processingEnabled: reasons.length === 0,
      code: reasons.length === 0 ? null : READINESS_ERROR_CODE,
      environment: this.environment,
      realDocumentsEnabled: this.realDocumentsEnabled,
      evaluatedAt: now.toISOString(),
      reasons,
      checks,
    });

    if (!KNOWN_ENVIRONMENTS.has(this.environment)) {
      const r = reason(
        READINESS_REASON_CODES.ENVIRONMENT_NOT_ALLOWED,
        'environment',
        'El entorno configurado no está permitido.',
      );
      reasons.push(r);
      checks.environment = { ok: false, code: r.code };
      return finish();
    }

    if (this.environment !== 'production') {
      const r = reason(
        READINESS_REASON_CODES.ENVIRONMENT_NOT_PRODUCTION,
        'environment',
        'El procesamiento comercial real solo puede habilitarse en producción.',
      );
      reasons.push(r);
      checks.environment = { ok: false, code: r.code };
      return finish();
    }
    checks.environment = { ok: true, code: null };

    if (!this.realDocumentsEnabled) {
      const r = reason(
        READINESS_REASON_CODES.REAL_DOCUMENTS_DISABLED,
        'environment',
        'SERVICES_REAL_DOCUMENTS_ENABLED no está activo.',
      );
      reasons.push(r);
      checks.environment = { ok: false, code: r.code };
      return finish();
    }

    const loaded = await this.loadEvidence();
    if (!loaded.ok) {
      const code = loaded.code || READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNAVAILABLE;
      const r = reason(
        code,
        'evidence',
        'No fue posible cargar las evidencias formales de readiness.',
      );
      reasons.push(r);
      return finish();
    }
    const evidence = loaded.evidence;

    const scanner = await this.checkScanner(now.getTime());
    checks.technical.scanner = scanner.check;
    reasons.push(...scanner.reasons);

    const retention = this.checkRetention(
      evidence.retentionPolicy ?? evidence.retentionPolicyEvidence ?? evidence.policy,
      now,
    );
    checks.technical.retention = retention.technicalCheck;
    checks.formal.retentionPolicy = retention.policyCheck;
    reasons.push(...retention.reasons);

    const purge = this.checkPurge(
      evidence.purgeWorker ?? evidence.purgeWorkerEvidence ?? evidence.purgeEvidence,
      retention.authorizedParameters,
      now,
    );
    checks.technical.purgeWorker = purge.check;
    reasons.push(...purge.reasons);

    const infrastructure = normalizeInfrastructure(
      evidence.infrastructure ?? evidence.infrastructureEvidence ?? evidence.operationalCheck,
    );
    checks.technical.infrastructure = this.checkFromFailure(
      infrastructure,
      'technical',
      'La verificación no destructiva de Storage/DB falló.',
    );
    if (!infrastructure.ok) {
      reasons.push(checks.technical.infrastructure.reason);
    }

    const dpa = this.checkDpa(
      evidence.aiDpa ?? evidence.dpa ?? evidence.aiDpaEvidence ?? evidence.dpaEvidence,
      now,
    );
    checks.formal.aiDpa = dpa.check;
    reasons.push(...dpa.reasons);

    const legal = this.checkLegalValidation(
      evidence.legalValidation ?? evidence.legalValidationEvidence ?? evidence.legalApproval,
      now,
    );
    checks.formal.legalValidation = legal.check;
    reasons.push(...legal.reasons);

    return finish();
  }

  async isReady() {
    return (await this.evaluate()).allowed;
  }

  async assertReadyForRealDocuments() {
    const status = await this.evaluate();
    if (!status.allowed) throw new CommercialReadinessError(status.reasons, status);
    return status;
  }

  assertCanProcessRealDocuments() {
    return this.assertReadyForRealDocuments();
  }

  async assertProductionStartupSafe() {
    if (!KNOWN_ENVIRONMENTS.has(this.environment)) {
      const r = reason(
        READINESS_REASON_CODES.ENVIRONMENT_NOT_ALLOWED,
        'environment',
        'El entorno configurado no está permitido.',
      );
      throw new CommercialReadinessError([r], {
        allowed: false,
        processingEnabled: false,
        code: READINESS_ERROR_CODE,
        environment: this.environment,
        realDocumentsEnabled: this.realDocumentsEnabled,
        evaluatedAt: new Date(this.nowMs()).toISOString(),
        reasons: [r],
        checks: { environment: { ok: false, code: r.code } },
      });
    }

    if (this.environment !== 'production') {
      return {
        ok: true,
        skipped: true,
        processingEnabled: false,
        environment: this.environment,
      };
    }

    const status = await this.evaluate();
    if (status.allowed) {
      return {
        ok: true,
        skipped: false,
        processingEnabled: true,
        environment: this.environment,
        status,
      };
    }

    if (!this.realDocumentsEnabled) {
      return {
        ok: true,
        skipped: false,
        processingEnabled: false,
        environment: this.environment,
        status,
      };
    }

    throw new CommercialReadinessError(status.reasons, status);
  }

  assertStartupSafe() {
    return this.assertProductionStartupSafe();
  }

  async scanDocument({ buffer, filename = null, mimeType = null } = {}) {
    await this.assertReadyForRealDocuments();
    if (!isTrustedProductionScanner(this.scanner)) {
      throw new CommercialReadinessError(
        [reason(READINESS_REASON_CODES.SCANNER_NOT_TRUSTED, 'A', 'El scanner no es confiable.')],
      );
    }
    const result = await this.scanner.scanBufferWithTimeout(
      { buffer, filename, mimeType },
      { timeoutMs: this.scannerTimeoutMs },
    );
    this.recordScanResult(result);
    return result;
  }

  async loadEvidence() {
    if (!this.evidenceRepository) {
      return { ok: false, code: READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNAVAILABLE };
    }
    if (
      this.environment === 'production' &&
      !isTrustedReadinessEvidenceRepository(this.evidenceRepository)
    ) {
      return { ok: false, code: READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNTRUSTED };
    }

    try {
      if (typeof this.evidenceRepository.loadEvidence === 'function') {
        const loaded = await withTimeout(
          this.evidenceRepository.loadEvidence(),
          this.evidenceTimeoutMs,
          READINESS_REASON_CODES.EVIDENCE_REPOSITORY_TIMEOUT,
        );
        if (loaded && loaded.ok === false) {
          return {
            ok: false,
            code: loaded.code || READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNAVAILABLE,
          };
        }
        const evidence = loaded?.evidence && typeof loaded.evidence === 'object'
          ? loaded.evidence
          : loaded;
        if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence)) {
          return { ok: false, code: READINESS_REASON_CODES.EVIDENCE_REPOSITORY_INVALID };
        }
        const byteLength = evidenceByteLength(evidence);
        if (byteLength === null) {
          return { ok: false, code: READINESS_REASON_CODES.EVIDENCE_REPOSITORY_INVALID };
        }
        if (byteLength > this.maxEvidenceBytes) {
          return { ok: false, code: READINESS_REASON_CODES.EVIDENCE_REPOSITORY_TOO_LARGE };
        }
        return { ok: true, evidence };
      }

      return { ok: false, code: READINESS_REASON_CODES.EVIDENCE_REPOSITORY_INVALID };
    } catch (error) {
      return {
        ok: false,
        code:
          error?.code === READINESS_REASON_CODES.EVIDENCE_REPOSITORY_TIMEOUT
            ? READINESS_REASON_CODES.EVIDENCE_REPOSITORY_TIMEOUT
            : READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNAVAILABLE,
      };
    }
  }

  async checkScanner(nowMs) {
    const reasons = [];
    const check = { ok: false, code: null };

    const fail = (code, message) => {
      const r = reason(code, 'A', message);
      reasons.push(r);
      check.code = code;
      return { check, reasons };
    };

    if (!this.scanner) {
      return fail(
        READINESS_REASON_CODES.SCANNER_NOT_CONFIGURED,
        'No existe un scanner antimalware configurado.',
      );
    }
    if (isMockScanner(this.scanner)) {
      return fail(
        READINESS_REASON_CODES.SCANNER_MOCK_FORBIDDEN,
        'MockMalwareScanner está prohibido en producción.',
      );
    }
    if (isUnconfiguredScanner(this.scanner)) {
      return fail(
        READINESS_REASON_CODES.SCANNER_NOT_CONFIGURED,
        'El scanner antimalware de producción no está configurado.',
      );
    }
    if (isPlaceholderScanner(this.scanner)) {
      return fail(
        READINESS_REASON_CODES.SCANNER_PLACEHOLDER_FORBIDDEN,
        'No se permite un scanner placeholder en producción.',
      );
    }
    if (!isTrustedProductionScanner(this.scanner)) {
      return fail(
        READINESS_REASON_CODES.SCANNER_NOT_TRUSTED,
        'El scanner no fue construido mediante la fábrica confiable de producción.',
      );
    }
    if (typeof this.scanner.scanBuffer !== 'function') {
      return fail(
        READINESS_REASON_CODES.SCANNER_NOT_CONFIGURED,
        'El scanner antimalware no implementa scanBuffer.',
      );
    }
    if (this.circuitState.openUntil > nowMs) {
      return fail(
        READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN,
        'El circuit breaker del scanner está abierto por indisponibilidad reciente.',
      );
    }

    const failureRevisionAtStart = this.circuitFailureRevision();
    const health = await checkScannerHealth(this.scanner, {
      timeoutMs: this.healthCheckTimeoutMs,
      requireVersionEvidence: true,
      signatureMaxAgeMs: this.signatureMaxAgeMs,
    });
    if (
      this.circuitState.openUntil > nowMs ||
      this.circuitFailureRevision() !== failureRevisionAtStart
    ) {
      return fail(
        READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN,
        'El circuit breaker del scanner se abrió durante el healthcheck.',
      );
    }
    if (!health.healthy) {
      this.recordScanResult({ status: 'unavailable' }, { observedAt: nowMs });
      const failed = fail(
        READINESS_REASON_CODES.SCANNER_UNHEALTHY,
        'El scanner antimalware no está saludable.',
      );
      return failed;
    }

    this.circuitState.openUntil = 0;
    return {
      check: {
        ok: true,
        code: null,
        provider: health.provider,
        engineVersion: health.engineVersion ?? null,
        signatureVersion: health.signatureVersion ?? null,
        durationMs: health.durationMs,
      },
      reasons,
    };
  }

  checkRetention(policyEvidence, now) {
    const reasons = [];
    const technical = normalizeRetentionParameters(this.retentionParameters);
    const policy = normalizeRetentionPolicy(policyEvidence);
    const technicalCheck = this.checkFromFailure(
      technical,
      'A',
      'Los parámetros técnicos de retención son inválidos.',
    );
    const policyCheck = this.checkFromFailure(
      policy,
      'B',
      'La política formal de retención es inválida.',
    );

    if (!technical.ok) reasons.push(technicalCheck.reason);
    if (!policy.ok) reasons.push(policyCheck.reason);

    if (technical.ok && policy.ok) {
      const technicalMatch = RETENTION_PARAMETER_KEYS.every(
        (key) => technical.value[key] === policy.authorizedParameters[key],
      );
      if (!technicalMatch) {
        const r = reason(
          READINESS_REASON_CODES.RETENTION_PARAMETERS_MISMATCH,
          'A',
          'Los parámetros técnicos de retención no coinciden con la política aprobada.',
        );
        reasons.push(r);
        technicalCheck.ok = false;
        technicalCheck.code = r.code;
        technicalCheck.reason = r;
      }
    }

    const approvedAt = policy.ok ? policy.approvedAt : null;
    if (approvedAt && approvedAt.getTime() > now.getTime()) {
      const r = reason(
        READINESS_REASON_CODES.RETENTION_POLICY_INVALID,
        'B',
        'La política de retención tiene una fecha de aprobación futura.',
      );
      reasons.push(r);
      policyCheck.ok = false;
      policyCheck.code = r.code;
      policyCheck.reason = r;
    }

    return {
      technicalCheck: { ...technicalCheck, reason: technicalCheck.reason || null },
      policyCheck: { ...policyCheck, reason: policyCheck.reason || null },
      reasons,
      authorizedParameters: policy.ok ? policy.authorizedParameters : null,
    };
  }

  checkPurge(evidence, authorizedParameters, now) {
    const reasons = [];
    const purge = normalizePurgeEvidence(evidence);
    const check = this.checkFromFailure(
      purge,
      'A',
      'La evidencia operativa del worker de purga es inválida.',
    );
    if (!purge.ok) {
      reasons.push(check.reason);
      return { check, reasons };
    }

    const maxHours = authorizedParameters?.max_purge_staleness_window_hours;
    if (!Number.isFinite(maxHours) || maxHours <= 0) {
      const r = reason(
        READINESS_REASON_CODES.PURGE_STALENESS_WINDOW_UNAVAILABLE,
        'A',
        'No existe una ventana máxima de antigüedad de purga formalmente aprobada.',
      );
      reasons.push(r);
      return {
        check: { ok: false, code: r.code, reason: r },
        reasons,
      };
    }

    const ageHours = (now.getTime() - purge.lastSuccessfulRunAt.getTime()) / 3600000;
    if (ageHours < 0) {
      const r = reason(
        READINESS_REASON_CODES.PURGE_EVIDENCE_INVALID,
        'A',
        'La última ejecución satisfactoria de purga tiene fecha futura.',
      );
      reasons.push(r);
      return {
        check: { ok: false, code: r.code, reason: r },
        reasons,
      };
    }
    if (ageHours >= maxHours) {
      const r = reason(
        READINESS_REASON_CODES.PURGE_EVIDENCE_STALE,
        'A',
        'La evidencia de purga supera la ventana máxima aprobada.',
      );
      reasons.push(r);
      return {
        check: { ok: false, code: r.code, reason: r },
        reasons,
      };
    }

    return { check, reasons };
  }

  checkDpa(evidence, now) {
    const reasons = [];
    const dpa = normalizeDpa(evidence);
    const check = this.checkFromFailure(
      dpa,
      'B',
      'La evidencia del DPA del proveedor de IA es inválida.',
    );
    if (!dpa.ok) {
      reasons.push(check.reason);
      return { check, reasons };
    }

    if (!this.aiProvider) {
      const r = reason(
        READINESS_REASON_CODES.AI_PROVIDER_NOT_CONFIGURED,
        'B',
        'No se identificó el proveedor de IA activo.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }
    if (this.aiProvider === 'unknown') {
      const r = reason(
        READINESS_REASON_CODES.AI_PROVIDER_UNKNOWN,
        'B',
        'El proveedor de IA activo no es reconocido.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }
    if (normalizeProviderIdentity(dpa.provider) !== this.aiProvider) {
      const r = reason(
        READINESS_REASON_CODES.DPA_PROVIDER_MISMATCH,
        'B',
        'El DPA no corresponde al proveedor de IA activo.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }

    if (dpa.signedAt.getTime() > now.getTime()) {
      const r = reason(
        READINESS_REASON_CODES.DPA_EVIDENCE_INVALID,
        'B',
        'El DPA tiene fecha de firma futura.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }
    if (dpa.validFrom && dpa.validFrom.getTime() > now.getTime()) {
      const r = reason(
        READINESS_REASON_CODES.DPA_EVIDENCE_INVALID,
        'B',
        'El DPA aún no está vigente.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }
    if (dpa.validUntil.getTime() <= now.getTime()) {
      const r = reason(
        READINESS_REASON_CODES.DPA_EVIDENCE_EXPIRED,
        'B',
        'El DPA del proveedor de IA está vencido.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }

    return { check, reasons };
  }

  checkLegalValidation(evidence, now) {
    const reasons = [];
    const legal = normalizeLegalValidation(evidence);
    const check = this.checkFromFailure(
      legal,
      'B',
      'La evidencia de validación legal es inválida.',
    );
    if (!legal.ok) {
      reasons.push(check.reason);
      return { check, reasons };
    }

    if (legal.reviewedAt.getTime() > now.getTime()) {
      const r = reason(
        READINESS_REASON_CODES.LEGAL_VALIDATION_INVALID,
        'B',
        'La validación legal tiene fecha futura.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }
    if (legal.validUntil && legal.validUntil.getTime() <= now.getTime()) {
      const r = reason(
        READINESS_REASON_CODES.LEGAL_VALIDATION_EXPIRED,
        'B',
        'La validación legal está vencida.',
      );
      reasons.push(r);
      return { check: { ok: false, code: r.code, reason: r }, reasons };
    }

    return { check, reasons };
  }

  checkFromFailure(result, category, message) {
    if (result.ok) {
      return { ok: true, code: null, reason: null };
    }
    const code = result.code || READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNAVAILABLE;
    return {
      ok: false,
      code,
      reason: reason(code, category, message),
    };
  }
}

export function createCommercialReadinessGate(options = {}) {
  return new CommercialReadinessGate(options);
}
