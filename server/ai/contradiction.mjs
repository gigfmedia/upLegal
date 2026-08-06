// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.1: Detección de contradicciones / matices entre fuentes.
//
// Objetivo: DETECTAR y EXPONER posibles contradicciones, NO resolverlas. Si dos
// fuentes parecen ir en sentidos distintos, el sistema conserva ambas, muestra
// los claims relevantes con su tribunal/rol/año cuando exista, y advierte que
// no es posible resolver el conflicto con las fuentes recuperadas.
//
// Tipos detectados (Fase 4.1):
//   1. norma vs jurisprudencia
//   2. jurisprudencia vs jurisprudencia
//   3. norma vs reglamento
// ---------------------------------------------------------------------------

// Polaridad léxica mínima para identificar sentidos opuestos. Conservador: se
// prefiere NO declarar contradicción si no hay señales léxicas explícitas.
const OPPOSED_TERMS = [
  {
    ladoA: ['permite', 'autoriza', 'admite', 'procede', 'declara constitucional', 'acoge'],
    ladoB: ['prohibe', 'prohíbe', 'rechaza', 'no procede', 'inadmite', 'declara inconstitucional', 'vulnera', 'infringe'],
  },
];

export function detectContradictions({
  normativa = [],
  jurisprudencia = [],
  doctrina = [],
} = {}) {
  const claims = [
    ...normativa.map((c) => ({ ...c, _category: 'normativa' })),
    ...jurisprudencia.map((c) => ({ ...c, _category: 'jurisprudencia' })),
    ...doctrina.map((c) => ({ ...c, _category: 'doctrina' })),
  ];

  const contradicciones = [];
  const warnings = [];

  // Par normativa vs normativa: solo interesa ley vs reglamento/decreto.
  const normativas = claims.filter((c) => c._category === 'normativa');
  for (let i = 0; i < normativas.length; i++) {
    for (let j = i + 1; j < normativas.length; j++) {
      const a = normativas[i];
      const b = normativas[j];
      const aDerivada = ['decreto', 'reglamento'].includes(a.source?.norm_type);
      const bDerivada = ['decreto', 'reglamento'].includes(b.source?.norm_type);
      if (!aDerivada && !bDerivada) continue;
      if (aDerivada === bDerivada) continue;
      contradicciones.push({
        tipo: 'norma_vs_reglamento',
        fuente_ids: [a.source_id, b.source_id],
        claims: [a.afirmacion, b.afirmacion],
        nota:
          'Norma y reglamento/decreto tratan la misma materia. Jerárquicamente la ley prevalece, pero la resolución del caso depende de su vigencia y alcance concreto; no se resuelve automáticamente.',
      });
    }
  }

  // Par jurisprudencia vs jurisprudencia (distintos roles).
  const jurisprudencias = claims.filter((c) => c._category === 'jurisprudencia');
  for (let i = 0; i < jurisprudencias.length; i++) {
    for (let j = i + 1; j < jurisprudencias.length; j++) {
      const a = jurisprudencias[i];
      const b = jurisprudencias[j];
      if (a.source_id === b.source_id) continue;
      const sameSubject = hasOverlap(a.afirmacion, b.afirmacion);
      if (!sameSubject) continue;
      const oposicion = detectOpposition(a.afirmacion, b.afirmacion);
      const nota = oposicion
        ? 'Ambas sentencias tratan la misma materia con sentidos opuestos. Se conservan ambas fuentes; no se resuelve cuál prevalece.'
        : 'Ambas sentencias tratan la misma materia y podrían presentar matices distintos. Se conservan ambas fuentes.';
      contradicciones.push({
        tipo: 'jurisprudencia_vs_jurisprudencia',
        fuente_ids: [a.source_id, b.source_id],
        claims: [a.afirmacion, b.afirmacion],
        nota,
      });
    }
  }

  // Par norma vs jurisprudencia (misma materia).
  for (const n of normativas) {
    for (const j of jurisprudencias) {
      if (!hasOverlap(n.afirmacion, j.afirmacion)) continue;
      contradicciones.push({
        tipo: 'norma_vs_jurisprudencia',
        fuente_ids: [n.source_id, j.source_id],
        claims: [n.afirmacion, j.afirmacion],
        nota:
          'La norma y la sentencia tratan la misma materia. Una sentencia decide UN caso y no invalida la norma general salvo declaración de inconstitucionalidad. Se conservan ambas fuentes sin resolver el conflicto.',
      });
    }
  }

  if (contradicciones.length > 0) {
    warnings.push(
      'Se detectaron posibles contradicciones o matices entre las fuentes; se muestran ambas para tu análisis y no se resuelve el conflicto automáticamente.',
    );
  }

  return { contradicciones, warnings };
}

/** Overlap mínimo de términos significativos (>=4 chars) entre dos textos. */
function hasOverlap(textA, textB) {
  const tokens = (t) => new Set(normalize(t).split(/\s+/).filter((w) => w.length >= 4));
  const setA = tokens(textA);
  const setB = tokens(textB);
  let shared = 0;
  for (const token of setA) if (setB.has(token)) shared += 1;
  return shared >= 2;
}

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ');
}

/** Detecta si dos afirmaciones usan lenguaje de sentidos opuestos. */
function detectOpposition(textA, textB) {
  const normA = String(textA || '').toLowerCase();
  const normB = String(textB || '').toLowerCase();
  for (const pair of OPPOSED_TERMS) {
    const hitA = pair.ladoA.some((t) => normA.includes(t));
    const hitB = pair.ladoB.some((t) => normB.includes(t));
    const reverseA = pair.ladoB.some((t) => normA.includes(t));
    const reverseB = pair.ladoA.some((t) => normB.includes(t));
    if ((hitA && hitB) || (reverseA && reverseB)) return true;
  }
  return false;
}