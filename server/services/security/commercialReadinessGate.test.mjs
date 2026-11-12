// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  CommercialReadinessError,
  CommercialReadinessGate,
  READINESS_ERROR_CODE,
  READINESS_REASON_CODES,
  ReadinessEvidenceRepositoryPort,
  createReadinessEvidenceRepository,
  isTrustedReadinessEvidenceRepository,
  normalizeRetentionParameters,
} from './commercialReadinessGate.mjs';
import {
  MOCK_SCAN_MARKERS,
  MockMalwareScanner,
  UnconfiguredMalwareScanner,
  createMalwareScanner,
} from './malwareScanner.mjs';

const NOW = new Date('2026-11-11T12:00:00.000Z');

const retentionParameters = Object.freeze({
  deliveredOrderRetentionDays: 365,
  cancelledOrderRetentionDays: 180,
  paymentProofRetentionDays: 90,
  maxPurgeStalenessWindowHours: 48,
});

function healthFixture(overrides = {}) {
  return {
    healthy: true,
    status: 'healthy',
    provider: 'private-clamav',
    engineVersion: '1.2.3',
    signatureVersion: '2026.11.11',
    signaturesUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function realAdapter({
  name = 'private-clamav',
  scanBuffer = async () => ({ status: 'clean', provider: name }),
  checkHealth = async () => healthFixture(),
} = {}) {
  return {
    name,
    kind: 'real',
    isConfigured: true,
    scanBuffer,
    checkHealth,
  };
}

function trustedScanner(adapter = realAdapter()) {
  return createMalwareScanner({
    environment: 'production',
    productionScannerFactory: () => adapter,
  });
}

function validEvidence() {
  return {
    retentionPolicy: {
      policyVersion: 'retention-v1',
      approvedAt: '2026-10-01T00:00:00.000Z',
      approvedBy: 'LegalUp Compliance',
      authorizedParameters: { ...retentionParameters },
      status: 'approved',
      serviceScope: ['legalup_services'],
    },
    aiDpa: {
      contractId: 'dpa-2026-001',
      provider: 'OpenAI',
      signedAt: '2026-01-10T00:00:00.000Z',
      validFrom: '2026-01-10T00:00:00.000Z',
      validUntil: '2027-01-10T00:00:00.000Z',
      status: 'active',
      serviceScope: ['legalup_services'],
      dataUsage: ['document_analysis'],
    },
    legalValidation: {
      version: 'legal-2026-01',
      reviewedAt: '2026-10-05T00:00:00.000Z',
      validUntil: '2027-10-05T00:00:00.000Z',
      status: 'approved',
      serviceScope: ['legalup_services'],
    },
    purgeWorker: {
      enabled: true,
      lastSuccessfulRunAt: '2026-11-11T06:00:00.000Z',
      lastRunResult: 'success',
      unresolvedCriticalFailures: 0,
    },
    infrastructure: {
      ok: true,
      destructive: false,
      readOnly: true,
      storage: {
        serviceDocuments: true,
        servicePaymentProofs: true,
      },
      databaseReadOnly: true,
    },
  };
}

function repository(evidence = validEvidence()) {
  return {
    loadEvidence: async () => evidence,
  };
}

function trustedRepository(evidence = validEvidence()) {
  return createReadinessEvidenceRepository({
    environment: 'production',
    repositoryFactory: () => repository(evidence),
  });
}

function makeGate({
  environment = 'production',
  realDocumentsEnabled = true,
  scanner = trustedScanner(),
  retention = retentionParameters,
  evidenceRepository = trustedRepository(),
  aiProvider = 'openai',
  now = () => NOW,
  scannerTimeoutMs = 8000,
  evidenceTimeoutMs = 5000,
  maxEvidenceBytes = 256 * 1024,
  circuitBreakerCooldownMs = 30000,
  circuitState = null,
} = {}) {
  return new CommercialReadinessGate({
    environment,
    realDocumentsEnabled,
    scanner,
    retentionParameters: retention,
    evidenceRepository,
    aiProvider,
    now,
    scannerTimeoutMs,
    evidenceTimeoutMs,
    maxEvidenceBytes,
    circuitBreakerCooldownMs,
    circuitState,
  });
}

function codes(status) {
  return status.reasons.map((item) => item.code);
}

function syntheticBuffer() {
  return Buffer.from(`${MOCK_SCAN_MARKERS.synthetic}\n%PDF-1.7 synthetic`, 'latin1');
}

describe('CommercialReadinessGate · D17', () => {
  it('abre solo con producción, opt-in, proveedor, categoría A y categoría B completas', async () => {
    const status = await makeGate().evaluate();
    expect(status.allowed).toBe(true);
    expect(status.processingEnabled).toBe(true);
    expect(status.code).toBeNull();
    expect(status.reasons).toEqual([]);
    expect(status.checks.environment.ok).toBe(true);
    expect(status.checks.technical.scanner.ok).toBe(true);
    expect(status.checks.technical.scanner.signatureVersion).toBe('2026.11.11');
    expect(status.checks.technical.retention.ok).toBe(true);
    expect(status.checks.technical.purgeWorker.ok).toBe(true);
    expect(status.checks.technical.infrastructure.ok).toBe(true);
    expect(status.checks.formal.retentionPolicy.ok).toBe(true);
    expect(status.checks.formal.aiDpa.ok).toBe(true);
    expect(status.checks.formal.legalValidation.ok).toBe(true);
  });

  it('bloquea development aunque el opt-in esté en true', async () => {
    const status = await makeGate({ environment: 'development', realDocumentsEnabled: true }).evaluate();
    expect(status.allowed).toBe(false);
    expect(status.code).toBe(READINESS_ERROR_CODE);
    expect(codes(status)).toContain(READINESS_REASON_CODES.ENVIRONMENT_NOT_PRODUCTION);
  });

  it('bloquea producción sin SERVICES_REAL_DOCUMENTS_ENABLED', async () => {
    const status = await makeGate({ realDocumentsEnabled: false }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.REAL_DOCUMENTS_DISABLED);
  });

  it('no permite bypass solo con la variable de entorno', async () => {
    const status = await makeGate({
      realDocumentsEnabled: true,
      scanner: new MockMalwareScanner({ environment: 'development' }),
    }).evaluate();
    expect(status.allowed).toBe(false);
    expect(status.code).toBe(READINESS_ERROR_CODE);
    expect(codes(status)).toContain(READINESS_REASON_CODES.SCANNER_MOCK_FORBIDDEN);
  });

  it('bloquea scanner no configurado, placeholder o no saludable', async () => {
    const unconfigured = await makeGate({ scanner: new UnconfiguredMalwareScanner() }).evaluate();
    const placeholder = await makeGate({
      scanner: {
        name: 'placeholder-scanner',
        scanBuffer: async () => ({ status: 'clean' }),
        checkHealth: async () => healthFixture(),
      },
    }).evaluate();
    const unhealthy = await makeGate({
      scanner: trustedScanner(
        realAdapter({ checkHealth: async () => healthFixture({ healthy: false, status: 'unavailable' }) }),
      ),
    }).evaluate();

    expect(codes(unconfigured)).toContain(READINESS_REASON_CODES.SCANNER_NOT_CONFIGURED);
    expect(codes(placeholder)).toContain(READINESS_REASON_CODES.SCANNER_PLACEHOLDER_FORBIDDEN);
    expect(codes(unhealthy)).toContain(READINESS_REASON_CODES.SCANNER_UNHEALTHY);
  });

  it('bloquea health degradado u obsoleto', async () => {
    const degraded = await makeGate({
      scanner: trustedScanner(
        realAdapter({
          checkHealth: async () =>
            healthFixture({ healthy: true, status: 'degraded', signaturesOutdated: true }),
        }),
      ),
    }).evaluate();
    expect(degraded.allowed).toBe(false);
    expect(codes(degraded)).toContain(READINESS_REASON_CODES.SCANNER_UNHEALTHY);
  });

  it('rechaza un scanner autodeclarado real sin fábrica confiable', async () => {
    const status = await makeGate({ scanner: realAdapter() }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.SCANNER_NOT_TRUSTED);
  });

  it('rechaza un repositorio en memoria autodeclarado en producción', async () => {
    const status = await makeGate({ evidenceRepository: repository() }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNTRUSTED);
    expect(isTrustedReadinessEvidenceRepository(trustedRepository())).toBe(true);
  });

  it('bloquea evidencia ausente en cada categoría', async () => {
    const status = await makeGate({
      evidenceRepository: trustedRepository({
        retentionPolicy: null,
        aiDpa: null,
        legalValidation: null,
        purgeWorker: null,
        infrastructure: null,
      }),
    }).evaluate();
    const reasonCodes = codes(status);

    expect(status.allowed).toBe(false);
    expect(reasonCodes).toContain(READINESS_REASON_CODES.RETENTION_POLICY_MISSING);
    expect(reasonCodes).toContain(READINESS_REASON_CODES.DPA_EVIDENCE_MISSING);
    expect(reasonCodes).toContain(READINESS_REASON_CODES.LEGAL_VALIDATION_MISSING);
    expect(reasonCodes).toContain(READINESS_REASON_CODES.PURGE_EVIDENCE_MISSING);
    expect(reasonCodes).toContain(READINESS_REASON_CODES.INFRASTRUCTURE_EVIDENCE_MISSING);
  });

  it('bloquea evidencia vencida', async () => {
    const evidence = validEvidence();
    evidence.aiDpa.validUntil = '2026-01-01T00:00:00.000Z';
    evidence.legalValidation.validUntil = '2026-01-01T00:00:00.000Z';
    evidence.purgeWorker.lastSuccessfulRunAt = '2026-11-01T00:00:00.000Z';

    const status = await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.DPA_EVIDENCE_EXPIRED);
    expect(codes(status)).toContain(READINESS_REASON_CODES.LEGAL_VALIDATION_EXPIRED);
    expect(codes(status)).toContain(READINESS_REASON_CODES.PURGE_EVIDENCE_STALE);
  });

  it('bloquea evidencia revocada', async () => {
    const evidence = validEvidence();
    evidence.retentionPolicy.status = 'revoked';
    evidence.aiDpa.status = 'revoked';
    evidence.legalValidation.status = 'revoked';

    const status = await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.RETENTION_POLICY_NOT_ACTIVE);
    expect(codes(status)).toContain(READINESS_REASON_CODES.DPA_EVIDENCE_NOT_ACTIVE);
    expect(codes(status)).toContain(READINESS_REASON_CODES.LEGAL_VALIDATION_NOT_ACTIVE);
  });

  it('bloquea discrepancia entre parámetros técnicos y política aprobada', async () => {
    const status = await makeGate({
      retention: { ...retentionParameters, deliveredOrderRetentionDays: 30 },
    }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.RETENTION_PARAMETERS_MISMATCH);
  });

  it('bloquea parámetros técnicos inválidos o incompletos', async () => {
    expect(normalizeRetentionParameters({ deliveredOrderRetentionDays: 365 }).ok).toBe(false);
    expect(
      normalizeRetentionParameters({ ...retentionParameters, paymentProofRetentionDays: true }).ok,
    ).toBe(false);
    const status = await makeGate({
      retention: { ...retentionParameters, paymentProofRetentionDays: 0 },
    }).evaluate();
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.RETENTION_PARAMETERS_INVALID);
  });

  it('bloquea ámbitos documentales de otro servicio o uso', async () => {
    const policy = validEvidence();
    policy.retentionPolicy.serviceScope = ['other_service'];
    const policyNearMiss = validEvidence();
    policyNearMiss.retentionPolicy.serviceScope = ['other_services'];
    const dpaScope = validEvidence();
    dpaScope.aiDpa.serviceScope = ['other_services'];
    const dpaUsage = validEvidence();
    dpaUsage.aiDpa.dataUsage = ['marketing'];
    const dpaUsageNearMiss = validEvidence();
    dpaUsageNearMiss.aiDpa.dataUsage = ['other_document_analysis'];
    const legal = validEvidence();
    legal.legalValidation.serviceScope = ['other_service'];

    expect(codes(await makeGate({ evidenceRepository: trustedRepository(policy) }).evaluate())).toContain(
      READINESS_REASON_CODES.RETENTION_POLICY_SCOPE_INVALID,
    );
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(policyNearMiss) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.RETENTION_POLICY_SCOPE_INVALID);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(dpaScope) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.DPA_SCOPE_INVALID);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(dpaUsage) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.DPA_SCOPE_INVALID);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(dpaUsageNearMiss) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.DPA_SCOPE_INVALID);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(legal) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.LEGAL_VALIDATION_SCOPE_INVALID);
  });

  it('bloquea DPA de un proveedor distinto, desconocido o ausente', async () => {
    const mismatch = validEvidence();
    mismatch.aiDpa.provider = 'OpenRouter';
    const unknown = validEvidence();
    unknown.aiDpa.provider = 'otro';
    const nearMiss = validEvidence();
    nearMiss.aiDpa.provider = 'notopenai';

    expect(codes(await makeGate({ evidenceRepository: trustedRepository(mismatch) }).evaluate())).toContain(
      READINESS_REASON_CODES.DPA_PROVIDER_MISMATCH,
    );
    expect(codes(await makeGate({ evidenceRepository: trustedRepository(unknown) }).evaluate())).toContain(
      READINESS_REASON_CODES.DPA_PROVIDER_MISMATCH,
    );
    expect(codes(await makeGate({ evidenceRepository: trustedRepository(nearMiss) }).evaluate())).toContain(
      READINESS_REASON_CODES.DPA_PROVIDER_MISMATCH,
    );
    expect(codes(await makeGate({ aiProvider: null }).evaluate())).toContain(
      READINESS_REASON_CODES.AI_PROVIDER_NOT_CONFIGURED,
    );
    expect(codes(await makeGate({ aiProvider: 'unknown-provider' }).evaluate())).toContain(
      READINESS_REASON_CODES.AI_PROVIDER_UNKNOWN,
    );
    expect(codes(await makeGate({ aiProvider: 'notopenai' }).evaluate())).toContain(
      READINESS_REASON_CODES.AI_PROVIDER_UNKNOWN,
    );
  });

  it('compara el proveedor canónico exacto sin aceptar prefijos ni sufijos', async () => {
    for (const provider of [
      'not-openai',
      'openai-compatible',
      'evil-openai',
      'openai-evil',
      'openai2',
      'open ai',
      'openrouter',
    ]) {
      const evidence = validEvidence();
      evidence.aiDpa.provider = provider;
      expect(
        codes(await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate()),
      ).toContain(READINESS_REASON_CODES.DPA_PROVIDER_MISMATCH);
    }

    const normalized = validEvidence();
    normalized.aiDpa.provider = '  OpenAI  ';
    expect(codes(await makeGate({ evidenceRepository: trustedRepository(normalized) }).evaluate())).toEqual(
      [],
    );
    expect(codes(await makeGate({ aiProvider: '  OPENAI  ' }).evaluate())).toEqual([]);
    expect(codes(await makeGate({ aiProvider: 'OpenAI, Inc.' }).evaluate())).toContain(
      READINESS_REASON_CODES.AI_PROVIDER_UNKNOWN,
    );
    expect(codes(await makeGate({ aiProvider: 'openai-compatible' }).evaluate())).toContain(
      READINESS_REASON_CODES.AI_PROVIDER_UNKNOWN,
    );
  });

  it('bloquea worker de purga deshabilitado, fallido o sin fallos reportados', async () => {
    const failed = validEvidence();
    failed.purgeWorker.lastRunResult = 'failed';
    const unresolved = validEvidence();
    unresolved.purgeWorker.unresolvedCriticalFailures = 2;
    const disabled = validEvidence();
    disabled.purgeWorker.enabled = false;
    const missingEnabled = validEvidence();
    delete missingEnabled.purgeWorker.enabled;
    const missingUnresolved = validEvidence();
    delete missingUnresolved.purgeWorker.unresolvedCriticalFailures;
    const nullUnresolved = validEvidence();
    nullUnresolved.purgeWorker.unresolvedCriticalFailures = null;
    const stringUnresolved = validEvidence();
    stringUnresolved.purgeWorker.unresolvedCriticalFailures = '0';
    const booleanUnresolved = validEvidence();
    booleanUnresolved.purgeWorker.unresolvedCriticalFailures = false;
    const arrayUnresolved = validEvidence();
    arrayUnresolved.purgeWorker.unresolvedCriticalFailures = [];

    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(failed) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.PURGE_EVIDENCE_FAILED);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(unresolved) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.PURGE_EVIDENCE_UNRESOLVED_FAILURES);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(disabled) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.PURGE_WORKER_DISABLED);

    for (const evidence of [
      missingEnabled,
      missingUnresolved,
      nullUnresolved,
      stringUnresolved,
      booleanUnresolved,
      arrayUnresolved,
    ]) {
      expect(
        codes(await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate()),
      ).toContain(READINESS_REASON_CODES.PURGE_EVIDENCE_INVALID);
    }
  });

  it('bloquea infraestructura destructiva, contradictoria o incompleta', async () => {
    const destructive = validEvidence();
    destructive.infrastructure.destructive = true;
    const storageFalse = validEvidence();
    storageFalse.infrastructure.storage.serviceDocuments = false;
    const proofFalse = validEvidence();
    proofFalse.infrastructure.storage.servicePaymentProofs = false;
    const databaseFalse = validEvidence();
    databaseFalse.infrastructure.databaseReadOnly = false;
    databaseFalse.infrastructure.readOnly = false;
    const okOnly = validEvidence();
    okOnly.infrastructure = { ok: true };
    const okFalse = validEvidence();
    okFalse.infrastructure.ok = false;
    const invalidDestructive = validEvidence();
    invalidDestructive.infrastructure.destructive = 'yes';
    const missingStorage = validEvidence();
    delete missingStorage.infrastructure.storage;

    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(destructive) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_DESTRUCTIVE);
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(databaseFalse) }).evaluate()),
    ).toContain(READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_DESTRUCTIVE);
    for (const evidence of [
      storageFalse,
      proofFalse,
      okOnly,
      okFalse,
      invalidDestructive,
      missingStorage,
    ]) {
      expect(
        codes(await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate()),
      ).toContain(READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED);
    }
  });

  it('rechaza aliases contradictorios de infraestructura sin aplicar precedencia', async () => {
    const contradictions = [];

    const readOnlyConflict = validEvidence();
    readOnlyConflict.infrastructure.databaseReadOnly = false;
    contradictions.push(readOnlyConflict);

    const reverseReadOnlyConflict = validEvidence();
    reverseReadOnlyConflict.infrastructure.readOnly = false;
    reverseReadOnlyConflict.infrastructure.databaseReadOnly = true;
    contradictions.push(reverseReadOnlyConflict);

    const storageDocumentConflict = validEvidence();
    storageDocumentConflict.infrastructure.storage.documents = false;
    contradictions.push(storageDocumentConflict);

    const storageProofConflict = validEvidence();
    storageProofConflict.infrastructure.storage.paymentProofs = false;
    contradictions.push(storageProofConflict);

    const crossSourceConflict = validEvidence();
    crossSourceConflict.infrastructure.storageDocuments = true;
    crossSourceConflict.infrastructure.storage.serviceDocuments = false;
    contradictions.push(crossSourceConflict);

    const topLevelConflict = validEvidence();
    delete topLevelConflict.infrastructure.storage;
    topLevelConflict.infrastructure.storageDocuments = true;
    topLevelConflict.infrastructure.storage_documents = false;
    topLevelConflict.infrastructure.storagePaymentProofs = true;
    contradictions.push(topLevelConflict);

    for (const evidence of contradictions) {
      const status = await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate();
      expect(status.allowed).toBe(false);
      expect(codes(status)).toContain(READINESS_REASON_CODES.INFRASTRUCTURE_CHECK_FAILED);
    }
  });

  it('acepta aliases equivalentes cuando todas las fuentes coinciden', async () => {
    const evidence = validEvidence();
    evidence.infrastructure = {
      ok: true,
      destructive: false,
      readOnly: true,
      databaseReadOnly: true,
      storageDocuments: true,
      storagePaymentProofs: true,
      storage: {
        serviceDocuments: true,
        documents: true,
        servicePaymentProofs: true,
        paymentProofs: true,
      },
    };

    const status = await makeGate({ evidenceRepository: trustedRepository(evidence) }).evaluate();
    expect(status.allowed).toBe(true);
    expect(codes(status)).toEqual([]);

    const topLevelOnly = validEvidence();
    delete topLevelOnly.infrastructure.storage;
    topLevelOnly.infrastructure.storageDocuments = true;
    topLevelOnly.infrastructure.storagePaymentProofs = true;
    expect(
      codes(await makeGate({ evidenceRepository: trustedRepository(topLevelOnly) }).evaluate()),
    ).toEqual([]);
  });

  it('falla cerrado si el repositorio de evidencias no está disponible, expira o es inválido', async () => {
    const unavailable = makeGate({
      evidenceRepository: createReadinessEvidenceRepository({
        environment: 'production',
        repositoryFactory: () => ({
          loadEvidence: async () => {
            throw new Error('database unavailable');
          },
        }),
      }),
    });
    const unavailableStatus = await unavailable.evaluate();
    expect(codes(unavailableStatus)).toContain(READINESS_REASON_CODES.EVIDENCE_REPOSITORY_UNAVAILABLE);

    const timedOut = createReadinessEvidenceRepository({
      environment: 'production',
      repositoryFactory: () => ({ loadEvidence: () => new Promise(() => {}) }),
    });
    const timeoutStatus = await makeGate({
      evidenceRepository: timedOut,
      evidenceTimeoutMs: 20,
    }).evaluate();
    expect(codes(timeoutStatus)).toContain(READINESS_REASON_CODES.EVIDENCE_REPOSITORY_TIMEOUT);

    const invalid = createReadinessEvidenceRepository({
      environment: 'production',
      repositoryFactory: () => ({ loadEvidence: async () => null }),
    });
    const invalidStatus = await makeGate({ evidenceRepository: invalid }).evaluate();
    expect(codes(invalidStatus)).toContain(READINESS_REASON_CODES.EVIDENCE_REPOSITORY_INVALID);

    const oversized = await makeGate({
      evidenceRepository: trustedRepository(),
      maxEvidenceBytes: 100,
    }).evaluate();
    expect(codes(oversized)).toContain(READINESS_REASON_CODES.EVIDENCE_REPOSITORY_TOO_LARGE);
  });
});

describe('CommercialReadinessGate · assertions, arranque y runtime', () => {
  it('assertReadyForRealDocuments devuelve estado cuando el gate está abierto', async () => {
    const status = await makeGate().assertReadyForRealDocuments();
    expect(status.allowed).toBe(true);
  });

  it('assertReadyForRealDocuments lanza 503 con código estable cuando está bloqueado', async () => {
    try {
      await makeGate({ environment: 'development' }).assertReadyForRealDocuments();
      throw new Error('expected CommercialReadinessError');
    } catch (error) {
      expect(error).toBeInstanceOf(CommercialReadinessError);
      expect(error).toMatchObject({
        code: READINESS_ERROR_CODE,
        statusCode: 503,
      });
    }
  });

  it('startup de producción con procesamiento deshabilitado permite operar sin evidencias', async () => {
    const gate = new CommercialReadinessGate({
      environment: 'production',
      realDocumentsEnabled: false,
      now: () => NOW,
    });
    const status = await gate.assertProductionStartupSafe();
    expect(status).toMatchObject({
      ok: true,
      skipped: false,
      processingEnabled: false,
    });
    expect(status.status.allowed).toBe(false);
  });

  it('startup de producción con procesamiento habilitado exige D17 completo', async () => {
    await expect(makeGate().assertProductionStartupSafe()).resolves.toMatchObject({
      ok: true,
      skipped: false,
      processingEnabled: true,
    });

    const missing = new CommercialReadinessGate({
      environment: 'production',
      realDocumentsEnabled: true,
      scanner: trustedScanner(),
      aiProvider: 'openai',
      retentionParameters,
      now: () => NOW,
    });
    await expect(missing.assertProductionStartupSafe()).rejects.toMatchObject({
      code: READINESS_ERROR_CODE,
      statusCode: 503,
    });

    for (const key of [
      'retentionPolicy',
      'aiDpa',
      'legalValidation',
      'purgeWorker',
      'infrastructure',
    ]) {
      const evidence = validEvidence();
      evidence[key] = null;
      await expect(
        makeGate({ evidenceRepository: trustedRepository(evidence) }).assertProductionStartupSafe(),
      ).rejects.toMatchObject({
        code: READINESS_ERROR_CODE,
        statusCode: 503,
      });
    }
  });

  it('startup omite development/test y rechaza entornos desconocidos', async () => {
    await expect(
      new CommercialReadinessGate({
        environment: 'development',
        realDocumentsEnabled: true,
        now: () => NOW,
      }).assertProductionStartupSafe(),
    ).resolves.toMatchObject({ ok: true, skipped: true, processingEnabled: false });

    await expect(
      new CommercialReadinessGate({
        environment: 'test',
        now: () => NOW,
      }).assertProductionStartupSafe(),
    ).resolves.toMatchObject({ ok: true, skipped: true, processingEnabled: false });

    await expect(
      new CommercialReadinessGate({
        environment: 'staging',
        now: () => NOW,
      }).assertProductionStartupSafe(),
    ).rejects.toMatchObject({ code: READINESS_ERROR_CODE, statusCode: 503 });
  });

  it('abre el circuit breaker tras unavailable/failed y lo recupera tras el cooldown', async () => {
    let now = new Date(NOW);
    const gate = makeGate({ now: () => now });
    gate.recordScanResult({ status: 'unavailable' });

    const blocked = await gate.evaluate();
    expect(blocked.allowed).toBe(false);
    expect(codes(blocked)).toContain(READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN);

    now = new Date(NOW.getTime() + 30001);
    const recovered = await gate.evaluate();
    expect(recovered.allowed).toBe(true);
  });

  it('abre el circuit breaker ante healthcheck fallido', async () => {
    let healthy = false;
    let now = new Date(NOW);
    const scanner = trustedScanner(
      realAdapter({
        checkHealth: async () =>
          healthFixture({ healthy, status: healthy ? 'healthy' : 'degraded' }),
      }),
    );
    const gate = makeGate({ scanner, now: () => now });

    const failed = await gate.evaluate();
    expect(codes(failed)).toContain(READINESS_REASON_CODES.SCANNER_UNHEALTHY);
    expect(gate.circuitState.openUntil).toBe(NOW.getTime() + 30000);

    healthy = true;
    const stillOpen = await gate.evaluate();
    expect(codes(stillOpen)).toContain(READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN);

    now = new Date(NOW.getTime() + 30001);
    const recovered = await gate.evaluate();
    expect(recovered.allowed).toBe(true);
  });

  it('no permite que un clean concurrente cierre el circuito', async () => {
    const gate = makeGate();
    gate.recordScanResult({ status: 'failed' }, { observedAt: NOW.getTime() });
    gate.recordScanResult({ status: 'clean' }, { observedAt: NOW.getTime() + 1000 });
    gate.recordScanResult({ status: 'clean' }, { observedAt: NOW.getTime() + 30001 });

    expect(gate.circuitState.openUntil).toBe(NOW.getTime() + 30000);
  });

  it('comparte el estado del circuito entre instancias', async () => {
    const circuitState = { openUntil: 0, lastFailureAt: 0 };
    const first = makeGate({ circuitState });
    const second = makeGate({ circuitState });
    first.recordScanResult({ status: 'failed' }, { observedAt: NOW.getTime() });

    expect(second.circuitState.openUntil).toBe(NOW.getTime() + 30000);
    expect(codes(await second.evaluate())).toContain(READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN);
  });

  it('no cierra el circuito si una falla ocurre durante el healthcheck en vuelo', async () => {
    let resolveHealth;
    let markHealthStarted;
    const healthStarted = new Promise((resolve) => {
      markHealthStarted = resolve;
    });
    const pendingHealth = new Promise((resolve) => {
      resolveHealth = resolve;
    });
    const scanner = trustedScanner(
      realAdapter({
        checkHealth: async () => {
          markHealthStarted();
          return pendingHealth;
        },
      }),
    );
    const circuitState = { openUntil: 0, lastFailureAt: 0 };
    const gate = makeGate({ scanner, circuitState });

    const evaluation = gate.evaluate();
    await healthStarted;
    gate.recordScanResult({ status: 'failed' }, { observedAt: NOW.getTime() });
    resolveHealth(healthFixture());

    const status = await evaluation;
    expect(status.allowed).toBe(false);
    expect(codes(status)).toContain(READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN);
    expect(circuitState.openUntil).toBe(NOW.getTime() + 30000);

    const stillOpen = await gate.evaluate();
    expect(codes(stillOpen)).toContain(READINESS_REASON_CODES.SCANNER_CIRCUIT_OPEN);
  });

  it('permite recuperar el circuito con un healthcheck posterior a la falla', async () => {
    let now = new Date(NOW);
    let healthy = false;
    const scanner = trustedScanner(
      realAdapter({
        checkHealth: async () =>
          healthFixture({ healthy, status: healthy ? 'healthy' : 'degraded' }),
      }),
    );
    const gate = makeGate({ scanner, now: () => now });

    const failed = await gate.evaluate();
    expect(codes(failed)).toContain(READINESS_REASON_CODES.SCANNER_UNHEALTHY);
    expect(gate.circuitState.openUntil).toBe(NOW.getTime() + 30000);

    now = new Date(NOW.getTime() + 30001);
    healthy = true;
    const recovered = await gate.evaluate();
    expect(recovered.allowed).toBe(true);
    expect(gate.circuitState.openUntil).toBe(0);
  });

  it('bloquea el gate ante señales de salud con strings negativos o tipos inválidos', async () => {
    for (const health of [
      healthFixture({ healthy: 'false' }),
      healthFixture({ ok: 'false' }),
      healthFixture({ status: 'healthy', degraded: 'true' }),
      healthFixture({ engineVersion: 123 }),
    ]) {
      const status = await makeGate({
        scanner: trustedScanner(realAdapter({ checkHealth: async () => health })),
      }).evaluate();
      expect(status.allowed).toBe(false);
      expect(codes(status)).toContain(READINESS_REASON_CODES.SCANNER_UNHEALTHY);
    }
  });

  it('scanDocument usa el gate, el timeout y registra el resultado', async () => {
    const gate = makeGate();
    const clean = await gate.scanDocument({
      buffer: syntheticBuffer(),
      filename: 'synthetic.pdf',
      mimeType: 'application/pdf',
    });
    expect(clean.status).toBe('clean');
    expect(gate.circuitState.openUntil).toBe(0);

    const timeoutGate = makeGate({
      scanner: trustedScanner(realAdapter({ scanBuffer: () => new Promise(() => {}) })),
      scannerTimeoutMs: 20,
    });
    const unavailable = await timeoutGate.scanDocument({
      buffer: syntheticBuffer(),
      filename: 'synthetic.pdf',
      mimeType: 'application/pdf',
    });
    expect(unavailable).toMatchObject({ status: 'unavailable', details: 'scanner_timeout' });
    expect(timeoutGate.circuitState.openUntil).toBeGreaterThan(0);
  });

  it('scanDocument no procesa si el gate está cerrado', async () => {
    await expect(
      makeGate({ realDocumentsEnabled: false }).scanDocument({
        buffer: syntheticBuffer(),
        filename: 'synthetic.pdf',
        mimeType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(CommercialReadinessError);
  });
});

describe('ReadinessEvidenceRepositoryPort y composición', () => {
  it('carga las cinco evidencias mediante métodos desacoplados', async () => {
    class FakeRepository extends ReadinessEvidenceRepositoryPort {
      async getRetentionPolicyEvidence() {
        return validEvidence().retentionPolicy;
      }

      async getAiDpaEvidence() {
        return validEvidence().aiDpa;
      }

      async getLegalValidationEvidence() {
        return validEvidence().legalValidation;
      }

      async getPurgeWorkerEvidence() {
        return validEvidence().purgeWorker;
      }

      async verifyNonDestructiveInfrastructure() {
        return validEvidence().infrastructure;
      }
    }

    const loaded = await new FakeRepository().loadEvidence();
    expect(loaded).toMatchObject({
      retentionPolicy: expect.objectContaining({ policyVersion: 'retention-v1' }),
      aiDpa: expect.objectContaining({ contractId: 'dpa-2026-001' }),
      legalValidation: expect.objectContaining({ version: 'legal-2026-01' }),
      purgeWorker: expect.objectContaining({ lastRunResult: 'success' }),
      infrastructure: expect.objectContaining({ destructive: false }),
    });
  });

  it('exige una fábrica de repositorio en producción y separa dobles', () => {
    expect(() =>
      createReadinessEvidenceRepository({
        environment: 'production',
        repository: repository(),
      }),
    ).toThrow(/inyección directa/i);

    const fake = createReadinessEvidenceRepository({
      environment: 'test',
      repository: repository(),
    });
    expect(isTrustedReadinessEvidenceRepository(fake)).toBe(false);
  });
});
