// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildReauditPlan } from './reaudit.mjs';
import { selectEligibleContacts } from './quality.mjs';

const ROWS = [
  ['1', 'persona1@estudio-alfa.example', 'Estudio Alfa & Cía.', 'https://estudio-alfa.example', 'https://www.estudio-alfa.example/abogados/', 'Abogados', 'valid'],
  ['2', 'persona2@estudio-alfa.example', 'Estudio Alfa & Cía.', 'https://estudio-alfa.example', 'https://www.estudio-alfa.example/abogados/', 'Abogados', 'valid'],
  ['3', 'persona3@estudio-alfa.example', 'Estudio Alfa & Cía.', 'https://estudio-alfa.example', 'https://www.estudio-alfa.example/abogados/', 'Abogados', 'valid'],
  ['4', 'ejemplo@ejemplo.example', 'Ejemplo y Cía.', 'https://ejemplo.example', 'https://ejemplo.example/', 'Abogados', 'valid'],
  ['5', 'centrodeatencionlegal@municipalidad-ejemplo.example', 'Municipalidad de Ejemplo', 'https://municipalidad-ejemplo.example', 'https://municipalidad-ejemplo.example/', 'Municipalidad de Ejemplo', 'valid'],
  ['6', 'contacto@colegio-ejemplo.example', 'Colegio Ejemplo', 'https://colegio-ejemplo.example', 'https://www.colegio-ejemplo.example/estudio-juridico/', 'Derecho Público', 'valid'],
  ['7', 'correocontacto@estudio-beta.example', 'Estudio Beta', 'https://estudio-beta.example', 'https://estudio-beta.example/', 'Bufete de abogados boutique', 'valid'],
  ['8', "'contacto@estudio-beta.example", 'Estudio Beta', 'https://estudio-beta.example', 'https://estudio-beta.example/', 'Bufete de abogados boutique', 'valid'],
  ['9', 'persona1@estudio-gamma.example', 'Estudio Gamma & Cía.', 'https://estudio-gamma.example', 'https://estudio-gamma.example/', 'Abogados', 'valid'],
  ['10', 'persona2@estudio-gamma.example', 'Estudio Gamma & Cía.', 'https://estudio-gamma.example', 'https://estudio-gamma.example/', 'Abogados', 'valid'],
  ['11', 'persona3@estudio-gamma.example', 'Estudio Gamma & Cía.', 'https://estudio-gamma.example', 'https://estudio-gamma.example/', 'Abogados', 'valid'],
  ['12', 'persona1@estudio-delta.example', 'Estudio Delta Abogados', 'https://estudio-delta.example', 'https://estudio-delta.example/', 'Abogados', 'valid'],
  ['13', '463info@estudio-delta.example', 'Estudio Delta Abogados', 'https://estudio-delta.example', 'https://estudio-delta.example/', 'Abogados', 'valid'],
  ['14', 'persona1@estudio-epsilon.example', 'Estudio Epsilon Abogados', 'https://estudio-epsilon.example', 'https://estudio-epsilon.example/', 'Abogados', 'valid'],
  ['15', 'ejemplo.asociados@ejemplo.example', 'Ejemplo & Asociados', 'https://ejemplo.example', 'https://ejemplo.example/', 'Abogados', 'valid'],
  ['16', 'ejemplo@ejemploycia.example', 'Ejemplo & Cía.', 'https://ejemploycia.example', 'https://ejemploycia.example/', 'Abogados', 'valid'],
  ['17', 'larrondesocioejemplo@estudio-zeta.example', 'Estudio Zeta & Asociados', 'https://estudio-zeta.example', 'https://www.estudio-zeta.example/', 'Abogados', 'valid'],
  ['18', 'nsocioejemplo@estudio-zeta.example', 'Estudio Zeta & Asociados', 'https://estudio-zeta.example', 'https://www.estudio-zeta.example/', 'Abogados', 'valid'],
  ['19', 'larenassocioejemplo@estudio-zeta.example', 'Estudio Zeta & Asociados', 'https://estudio-zeta.example', 'https://www.estudio-zeta.example/', 'Abogados', 'valid'],
  ['20', null, 'Estudio Lead Gen', 'https://leadgen.example', 'https://leadgen.example/', 'Paga solo por resultados', 'no_email'],
  ['21', null, 'Nexo Ejemplo', 'https://nexo-ejemplo.example', 'https://nexo-ejemplo.example/', 'Abogado de derecho laboral', 'no_email'],
  ['22', null, 'Estudio Eta', 'https://estudio-eta.example', 'https://estudio-eta.example/', 'Estudio Eta Abogados', 'no_email'],
  ['23', null, 'Portal de Ejemplo', 'https://portal-ejemplo.example', 'https://portal-ejemplo.example/', 'Directorio de abogados', 'no_email'],
  ['24', null, 'Estudio Theta', 'https://estudio-theta.example', 'https://estudio-theta.example/', 'Estudio Theta Abogados', 'no_email'],
  ['25', null, 'Municipalidad de Ejemplo', 'https://municipalidad-ejemplo.example', 'https://municipalidad-ejemplo.example/', 'Municipalidad de Ejemplo', 'no_email'],
  ['26', null, 'Estudio Iota Abogados', 'https://estudio-iota.example', 'https://estudio-iota.example/', 'Estudio Iota Abogados', 'no_email'],
  ['27', null, 'confie en nosotros, somos un equipo de ejemplo', 'https://estudio-kappa.example', 'https://estudio-kappa.example/', 'Abogados penalistas', 'no_email'],
  ['28', null, 'Abg. Ejemplo', 'https://estudio-lambda.example', 'https://estudio-lambda.example/', 'Defensa penal', 'no_email'],
  ['29', null, 'Estudio Mu Abogados & Asociados', 'https://estudio-mu.example', 'https://estudio-mu.example/', 'Estudio Mu Abogados & Asociados presta asesoría', 'no_email'],
  ['30', null, 'Estudio Nu', 'https://estudio-nu.example', 'https://estudio-nu.example/', 'Abogado penalista', 'no_email'],
  ['31', null, 'Estudio Xi Abogados', 'https://estudio-xi.example', 'https://estudio-xi.example/', 'Estudio Xi Abogados', 'no_email'],
  ['32', null, 'Estudio Omicron Abogados', 'https://estudio-omicron.example', 'https://estudio-omicron.example/', 'Estudio Omicron Abogados', 'no_email'],
  ['33', null, 'Estudio Pi & Cía.', 'https://estudio-pi.example', 'https://estudio-pi.example/', 'Estudio Pi & Cía. Abogados', 'no_email'],
  ['34', null, 'Estudio Rho Abogados', 'https://estudio-rho.example', 'https://estudio-rho.example/', 'Estudio Rho Abogados', 'no_email'],
  ['35', null, 'Estudio Sigma Abogados', 'https://estudio-sigma.example', 'https://estudio-sigma.example/', 'Estudio Sigma Abogados', 'no_email'],
].map(([id, email, firm_name, website, source_url, description, validation_status]) => ({
  id,
  email,
  contact_name: null,
  firm_name,
  website,
  source_url,
  description,
  status: 'new',
  validation_status,
}));

const SOURCE_EVIDENCE = {
  1: { sourceTitle: 'Abogados - Estudio Alfa', sourceH1: 'Estudio Alfa' },
  2: { sourceTitle: 'Abogados - Estudio Alfa', sourceH1: 'Estudio Alfa' },
  3: { sourceTitle: 'Abogados - Estudio Alfa', sourceH1: 'Estudio Alfa' },
  4: { sourceTitle: 'Ejemplo y Cía. Abogados' },
  6: { sourceTitle: 'Estudio Jurídico - Colegio Ejemplo', siteSignals: 'Matrícula Apoderados Alumnos' },
  7: { sourceTitle: 'Estudio Beta | Abogados' },
  8: { sourceTitle: 'Estudio Beta | Abogados' },
  9: { sourceTitle: 'Estudio Gamma & Cía. Abogados' },
  10: { sourceTitle: 'Estudio Gamma & Cía. Abogados' },
  11: { sourceTitle: 'Estudio Gamma & Cía. Abogados' },
  14: { sourceTitle: 'Estudio Epsilon Abogados' },
  15: { sourceTitle: 'Ejemplo & Asociados Abogados' },
  16: { sourceTitle: 'Ejemplo & Cía. Abogados' },
  17: { sourceTitle: 'Estudio Zeta & Asociados - Abogados', sourceH1: 'Estudio Zeta & Asociados' },
  18: { sourceTitle: 'Estudio Zeta & Asociados - Abogados', sourceH1: 'Estudio Zeta & Asociados' },
  19: { sourceTitle: 'Estudio Zeta & Asociados - Abogados', sourceH1: 'Estudio Zeta & Asociados' },
  20: { sourceTitle: 'Abogados Gratis | Abogado Laboralista', sourceH1: 'Abogados Gratis' },
  22: { sourceTitle: 'Estudio Eta Abogados' },
  24: { sourceTitle: 'Estudio Theta Abogados' },
  27: {
    sourceTitle: 'Abogado | Abogados en Ciudad Ejemplo - Chile',
    sourceH1: 'confie en nosotros, somos un equipo de abogados de ejemplo',
  },
  28: { sourceTitle: 'Defensa Penal | Abogado Penalista' },
  30: { sourceTitle: 'Abogado Penalista en Ciudad Ejemplo - Defensa penal | Estudio Nu' },
};

function plan() {
  return buildReauditPlan(ROWS, {
    sourceEvidenceById: SOURCE_EVIDENCE,
    now: () => new Date('2026-11-06T12:00:00.000Z'),
  });
}

describe('reauditoría de los 35 prospectos', () => {
  it('corrige los falsos negativos y el falso positivo sin promover automáticamente', () => {
    const { summary } = plan();
    expect(summary.total).toBe(35);
    expect(summary.by_org_type).toMatchObject({
      law_firm: 31,
      public_entity: 2,
      school: 1,
      portal: 1,
    });
    expect(summary.by_org_type.other || 0).toBe(0);
    expect(summary.by_email_kind).toMatchObject({
      personal: 9,
      firm: 3,
      role: 2,
      invalid: 5,
    });
    expect(summary.manual_review).toBe(5);
    expect(summary.manual_review_by_reason).toMatchObject({
      email_corrupted_local_part: 3,
      organization_lead_gen_risk: 1,
      organization_weak_identity: 1,
    });
    expect(summary.would_exclude).toBe(10);
    expect(summary.excluded_or_review).toBe(15);
    expect(summary.would_keep).toBe(20);
  });

  it('deja 8 elegibles por calidad y 4 seleccionables tras dedupe', () => {
    const { updates } = plan();
    const eligible = updates
      .filter((update) => update.patch.org_type === 'law_firm')
      .filter((update) => update.patch.email_kind === 'personal')
      .filter((update) => update.patch.status !== 'excluded')
      .filter((update) => update.patch.validation_status !== 'invalid')
      .map((update) => ({ ...update.patch, id: update.id }));

    expect(eligible).toHaveLength(8);
    expect(selectEligibleContacts(eligible, { limit: 100 })).toHaveLength(4);
  });
});
