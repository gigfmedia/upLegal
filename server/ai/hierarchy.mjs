// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.1: Jerarquía de fuentes normativas.
// Reglas EXPLÍCITAS y conservadoras basadas en el tipo real de la norma
// (metadata de BCN/LeyChile): Constitución > Código > Ley > DFL/DL > Decreto
// > Reglamento > Resolución.
//
// La jerarquía es una regla de PRESENTACIÓN/ANÁLISIS, no un mecanismo para
// que el sistema decida qué norma prevalece en un conflicto. Si dos normas
// del mismo rango son relevantes, se devuelve un MATIZ y NO se resuelve
// artificialmente el conflicto.
// ---------------------------------------------------------------------------

// Prelación descendente: menor número = mayor jerarquía.
export const NORM_HIERARCHY = {
  constitucion: 1,
  codigo: 2,
  ley: 3,
  dfl: 4,
  decreto_ley: 4,
  decreto: 5,
  reglamento: 6,
  resolucion: 7,
  otra: 8,
};

const HIERARCHY_LABELS = {
  1: 'Constitución',
  2: 'Código',
  3: 'Ley',
  4: 'DFL / Decreto Ley',
  5: 'Decreto',
  6: 'Reglamento',
  7: 'Resolución',
  8: 'Norma (rango no determinado)',
};

export function normTypeRank(normType) {
  return NORM_HIERARCHY[normType] ?? 8;
}

export function hierarchyLabel(rank) {
  return HIERARCHY_LABELS[rank] ?? 'Norma (rango no determinado)';
}

/** Compara dos fuentes normativas: 'higher' | 'lower' | 'equal' | 'unknown'. */
export function compareNormHierarchy(aNormType, bNormType) {
  const ra = normTypeRank(aNormType);
  const rb = normTypeRank(bNormType);
  if (ra < rb) return 'higher';
  if (ra > rb) return 'lower';
  if (ra === 8) return 'unknown';
  return 'equal';
}

/**
 * Ordena fuentes normativas por jerarquía (menor rango primero). Si hay
 * empate de rango se conserva el orden de entrada (no se decide entre ellas).
 * @param {Array<{ id: string, norm_type?: string, citation: string }>} sources
 * @returns {Array} fuentes ordenadas
 */
export function orderNormativaByHierarchy(sources = []) {
  return [...sources].sort((a, b) => {
    const d = normTypeRank(a.norm_type) - normTypeRank(b.norm_type);
    if (d !== 0) return d;
    return 0;
  });
}

/**
 * Detecta matices de jerarquía entre las fuentes normativas recuperadas.
 * No resuelve conflictos: EMITE una nota cuando dos normas del mismo rango
 * aparecen como las más relevantes (no se puede determinar precedencia sin
 * evidencia de especialidad), y avisa si hay normas derivadas (decreto/
 * reglamento) junto a la ley de la materia.
 * @param {Array<{ id: string, norm_type?: string, citation: string, titulo?: string }>} normativas
 * @returns {{ matices: Array<{ tipo: string, fontesNString: number, nota: string, resolvida: boolean }> }}
 */
export function detectHierarchyMatices(normativas = []) {
  if (!Array.isArray(normativas) || normativas.length < 2) return { matices: [] };
  const matices = [];

  // 1) Mismo rango → no se puede determinar precedencia (salvo especialidad).
  const byRank = new Map();
  for (const n of normativas) {
    const rank = normTypeRank(n.norm_type);
    if (rank === 8) continue;
    if (!byRank.has(rank)) byRank.set(rank, []);
    byRank.get(rank).push(n);
  }
  for (const [rank, group] of byRank) {
    if (group.length < 2) continue;
    const names = group.map((n) => n.citation).join(' y ');
    matices.push({
      tipo: 'rango_igual',
      fuente_ids: group.map((n) => n.id),
      notas: `No se puede determinar qué norma prevalece entre ${names} (mismo rango: ${hierarchyLabel(rank)}). No se resuelve sin evidencia de especialidad.`,
      observada: false,
    });
  }

  // 2) Norma derivada (decreto/reglamento) junto a una ley de la materia.
  const hasLey = normativas.some((n) => ['ley', 'codigo', 'dfl', 'decreto_ley'].includes(n.norm_type));
  const derivadas = normativas.filter((n) => ['decreto', 'reglamento'].includes(n.norm_type));
  if (hasLey && derivadas.length > 0) {
    const derivadaNames = derivadas.map((n) => n.citation).join('; ');
    const leyName = normativas.find((n) => ['ley', 'codigo', 'dfl', 'decreto_ley'].includes(n.norm_type))?.citation;
    matices.push({
      tipo: 'norma_derivada',
      fuente_ids: [...normativas.map((n) => n.id)],
      notas: `Jerárquicamente la ${leyName} prevalece sobre ${derivadaNames}; verifica su vigencia y alcance en LeyChile antes de aplicarlo al caso.`,
      observada: false,
    });
  }

  return { matices };
}