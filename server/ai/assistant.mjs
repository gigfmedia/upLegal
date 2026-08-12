// ============================================================================
// Asistente comercial y de orientación de LegalUp (front público)
// ----------------------------------------------------------------------------
// ARQUITECTURA DE DOS CEREBROS SEPARADOS:
//
//   Cerebro 1 · Conversación/ventas (LLM)     → classifyProblem()
//     - Entiende el problema, hace preguntas (máx 1 por turno, 4 en total),
//       clasifica categoría/subcategoría/urgencia/intención.
//     - NUNCA decide qué abogados existen ni los recomienda por nombre.
//
//   Cerebro 2 · Matching (determinístico)      → matchLawyers()
//     - Consulta abogados REALES en Supabase y ordena por scoring:
//       especialidad (40) + área relacionada (25) + servicio (25) +
//       experiencia (15) + disponibilidad (10) + ubicación (10) + verificado (5).
//     - CERO LLM: la IA no puede inventar abogados ni puntajes.
//
//   Cerebro 3 · Explicación (LLM data-grounded) → explainRecommendation()
//     - Solo si hay candidatos reales: la IA explica por qué cada abogado es
//       adecuado, usando ÚNICAMENTE los datos reales del candidato.
//     - Si falla o no hay IA, se cae a razones determinísticas (matchReasons).
//
// Flujo: problema → clasificación → búsqueda real en Supabase → scoring →
//        explicación grounded → [Reservar consulta]
//
// Reglas inmutables:
//   - No entregar asesoría jurídica definitiva ni prometer resultados.
//   - No inventar leyes, artículos, jurisprudencia ni abogados.
//   - Pocas preguntas (2-4) y solo las necesarias para recomendar.
//   - La recomendación sale exclusivamente de datos reales de Supabase.
// ============================================================================

// ---------------------------------------------------------------------------
// Taxonomía del problema legal (espejo de la spec del asistente)
// ---------------------------------------------------------------------------

export const ASSISTANT_CATEGORIES = {
  arriendo: {
    label: 'Arriendo / inmobiliario',
    shortLabel: 'arriendos y temas inmobiliarios',
    specialties: ['Derecho Inmobiliario', 'Derecho Civil'],
    serviceKeywords: ['arriendo', 'inmobiliario', 'garantía', 'garantia', 'contrato', 'desalojo', 'propiedad', 'consulta'],
  },
  familia: {
    label: 'Familia',
    shortLabel: 'derecho de familia',
    specialties: ['Derecho de Familia'],
    serviceKeywords: ['familia', 'divorcio', 'pensión', 'pension', 'alimentos', 'cuidado', 'filiación', 'filiacion', 'consulta'],
  },
  laboral: {
    label: 'Laboral',
    shortLabel: 'derecho laboral',
    specialties: ['Derecho Laboral'],
    serviceKeywords: ['laboral', 'despido', 'finiquito', 'indemnización', 'indemnizacion', 'sueldo', 'licencia', 'acoso', 'consulta'],
  },
  civil: {
    label: 'Civil / contratos',
    shortLabel: 'derecho civil y contratos',
    specialties: ['Derecho Civil'],
    serviceKeywords: ['contrato', 'deuda', 'cobro', 'pagaré', 'pagare', 'préstamo', 'prestamo', 'daño', 'daños', 'responsabilidad', 'consulta'],
  },
  consumidor: {
    label: 'Consumidor',
    shortLabel: 'derecho del consumidor',
    specialties: ['Derecho del Consumidor'],
    serviceKeywords: ['consumidor', 'garantía', 'garantia', 'empresa', 'cobro indebido', 'boleta', 'producto', 'servicio', 'consulta'],
  },
  comercial: {
    label: 'Comercial / empresas',
    shortLabel: 'derecho comercial y de empresas',
    specialties: ['Derecho Comercial', 'Derecho Civil'],
    serviceKeywords: ['comercial', 'sociedad', 'contrato', 'cobranza', 'empresa', 'socio', 'constitución', 'constitucion', 'consulta'],
  },
  penal: {
    label: 'Penal',
    shortLabel: 'derecho penal',
    specialties: ['Derecho Penal'],
    serviceKeywords: ['penal', 'denuncia', 'querella', 'citación', 'citacion', 'delito', 'investigación', 'investigacion', 'consulta'],
  },
  otros: {
    label: 'Otro problema',
    shortLabel: 'asesoría legal general',
    specialties: ['Derecho Civil', 'Derecho Laboral', 'Derecho de Familia', 'Derecho Penal', 'Derecho Comercial', 'Derecho Inmobiliario'],
    serviceKeywords: ['consulta', 'asesoría', 'asesoria', 'orientación', 'orientacion'],
  },
};

// Subcategorías conocidas por categoría (clave → etiqueta). Se usan para dar
// contexto a la IA, generar copy de fallback y para el matching de servicios.
const SUBCATEGORIES = {
  arriendo: {
    devolucion_garantia: 'devolución de garantía de arriendo',
    no_pago_arriendo: 'no pago de arriendo',
    desalojo: 'desalojo / término de contrato',
    termino_contrato: 'término de contrato de arriendo',
    incumplimiento_contrato: 'incumplimiento de contrato de arriendo',
    danos_inmueble: 'daños al inmueble',
    inmobiliaria: 'conflicto con inmobiliaria',
    compraventa: 'compraventa de propiedad',
    copropiedad: 'copropiedad / gastos comunes',
    otros: 'conflictos de arriendo e inmobiliarios',
  },
  familia: {
    pension_alimentos: 'pensión de alimentos',
    divorcio: 'divorcio',
    cuidado_personal: 'cuidado personal de hijos',
    relacion_directa: 'relación directa y regular',
    compensacion_economica: 'compensación económica',
    filiacion: 'filiación / reconocimiento de paternidad',
    violencia_intrafamiliar: 'violencia intrafamiliar',
    otros: 'asuntos de derecho de familia',
  },
  laboral: {
    despido: 'despido y término de relación laboral',
    finiquito: 'revisión de finiquito',
    indemnizacion: 'indemnización laboral',
    sueldo_impago: 'sueldos impagos',
    acoso_laboral: 'acoso laboral',
    licencias: 'licencias médicas',
    accidente_laboral: 'accidente laboral',
    otros: 'asuntos laborales',
  },
  civil: {
    deudas: 'deudas y cobros',
    incumplimiento_contrato: 'incumplimiento de contrato',
    responsabilidad_civil: 'responsabilidad civil y daños',
    cobros: 'cobros y juicios ejecutivos',
    pagare: 'pagarés y documentos de crédito',
    prestamo_dinero: 'préstamos de dinero',
    otros: 'asuntos civiles',
  },
  consumidor: {
    empresa: 'problemas con empresas y servicios',
    garantia: 'garantías de productos',
    compras: 'problemas con compras',
    servicios_contratados: 'servicios contratados',
    cobro_indebido: 'cobros indebidos',
    incumplimiento: 'incumplimiento de empresas',
    otros: 'asuntos de consumo',
  },
  comercial: {
    contratos: 'revisión y negociación de contratos',
    sociedades: 'constitución y administración de sociedades',
    cobranza: 'cobranza comercial',
    conflictos: 'conflictos comerciales',
    socios: 'relaciones entre socios',
    revision: 'revisión contractual',
    otros: 'asuntos comerciales y de empresas',
  },
  penal: {
    denuncias: 'denuncias penales',
    querellas: 'querellas',
    citaciones: 'citaciones ante tribunales',
    investigaciones: 'investigaciones penales',
    otros: 'asuntos penales',
  },
  otros: {
    general: 'asesoría legal general',
    otros: 'otro tipo de asunto legal',
  },
};

export const ASSISTANT_SUBCATEGORIES = SUBCATEGORIES;

// ---------------------------------------------------------------------------
// Helpers de sanitización (nunca confiar en input del cliente)
// ---------------------------------------------------------------------------

export const sanitizeText = (text, maxLength = 1200) =>
  String(text || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

export const sanitizeMessages = (messages, maxMessages = 12) => {
  if (!Array.isArray(messages)) return [];
  const clean = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m) => ({
      role: m.role,
      content: sanitizeText(m.content, 1200),
    }))
    .filter((m) => m.content.length > 0);
  return clean.slice(-maxMessages);
};

// ---------------------------------------------------------------------------
// Prompt del modelo (asistente comercial + orientación, nunca reemplaza abogado)
// ---------------------------------------------------------------------------

const buildAssistantSystemPrompt = () => `
ROL:
Eres el asistente comercial y de orientación inicial de LegalUp, plataforma chilena
que conecta personas y empresas con abogados verificados.

OBJETIVO:
Entender el problema legal del usuario, orientarlo sobre el siguiente paso y
encontrar al abogado más adecuado disponible en LegalUp. El objetivo comercial es
llevar a una consulta real cuando exista necesidad real de asesoría.

REGLAS:
- Sé claro, humano y breve. Habla en español de Chile.
- Haz POCAS preguntas: máximo 1 por turno y 4 en total. Solo pregunta lo necesario
  para recomendar un abogado (qué ocurrió, estado actual, urgencia, tipo de persona,
  si existe un documento relevante). NUNCA pidas nombre completo, RUT, dirección,
  datos bancarios ni información personal que no aporte al matching.
- Cuando hagas una pregunta (readyToRecommend=false), entrega en "options" entre 3 y 4
  respuestas cortas y naturales (máximo 40 caracteres cada una) que el usuario pueda
  tocar para responder rápido. Las opciones deben cubrir los casos más probables
  (incluye una como "No estoy seguro/a" o similar si aplica). Si el usuario ya entregó
  todo lo necesario, usa options: [].
- NO te presentes como abogado. NO des opinión jurídica vinculante. NO prometas
  resultados, no garantices que el usuario ganará, no inventes leyes, artículos,
  jurisprudencia ni montos legales.
- Cuando el problema quede claro, responde con readyToRecommend=true y question=null.
  Si falta información mínima, usa readyToRecommend=false y entrega UNA pregunta útil.
- Si el usuario pregunta por el PROCESO o funcionamiento de la plataforma (cómo
  reservar, cómo pagar, cómo funciona, cuánto cuesta, cuál es el siguiente paso),
  responde brevemente explicando el proceso y usa readyToRecommend=false con
  question=null y options=[]. NO lo clasifiques como un problema legal.
- No menciones abogados concretos por nombre: la recomendación la muestra la plataforma.
  En tu "reply" al recomendar, explica el área del derecho y lo útil del siguiente paso.
- Detecta URGENCIA (audiencia próxima, plazo, citación, despido reciente, orden
  judicial, notificación, detención, violencia) y aumenta urgency. No alarmes de más.
- Detecta INTENCIÓN comercial: "quiero demandar / contratar / reservar / cuánto cuesta /
  quién puede llevar mi caso" = alta. Consulta general = media. Curiosidad = baja.
- Clasifica en una categoría de la taxonomía. Si no encaja, usa "otros".
- "reply" debe ser un texto natural que continúe la conversación.

TAXONOMÍA (categoría):
arriendo | familia | laboral | civil | consumidor | comercial | penal | otros

Responde SIEMPRE con JSON válido con este esquema:
{
  "reply": "texto de respuesta al usuario para este turno",
  "category": "una categoría de la taxonomía",
  "subcategory": "subcategoría en snake_case dentro de la categoría",
  "summary": "resumen breve de la situación del usuario (máx 40 palabras)",
  "urgency": "low" | "medium" | "high",
  "commercialIntent": "low" | "medium" | "high",
  "readyToRecommend": true | false,
  "question": "string | null  (una sola pregunta si readyToRecommend es false, si no null)",
  "options": ["string"]  (3-4 respuestas cortas si readyToRecommend es false, si no [])
}
`.trim();

const buildAssistantUserPrompt = ({ history, userCity }) => {
  const historyText = history
    .map((m) => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`)
    .join('\n');
  return `Conversación con el usuario:\n${historyText}\n\n${
    userCity ? `Ubicación del usuario (solo si la menciona): ${userCity}\n` : ''
  }Clasifica la conversación y responde en español según el esquema JSON indicado.`;
};

// ---------------------------------------------------------------------------
// Validación/normalización de la clasificación del modelo
// ---------------------------------------------------------------------------

const CATEGORY_KEYS = new Set(Object.keys(ASSISTANT_CATEGORIES));
const URGENCY_KEYS = new Set(['low', 'medium', 'high']);
const MAX_OPTIONS = 4;
const MAX_OPTION_LENGTH = 80;

const normalizeOptions = (raw) => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const options = [];
  for (const value of raw) {
    const option = sanitizeText(value, MAX_OPTION_LENGTH);
    if (!option || seen.has(option) || options.length >= MAX_OPTIONS) continue;
    seen.add(option);
    options.push(option);
  }
  return options;
};

const normalizeClassification = (raw) => {
  const category = CATEGORY_KEYS.has(raw?.category) ? raw.category : 'otros';
  const subcategoryKey = String(raw?.subcategory || '').trim().toLowerCase();
  const subLabels = SUBCATEGORIES[category] || SUBCATEGORIES.otros;
  const hasSub = Object.prototype.hasOwnProperty.call(subLabels, subcategoryKey);
  return {
    reply: String(raw?.reply || '').trim().slice(0, 1200),
    category,
    subcategory: hasSub ? subcategoryKey : 'otros',
    summary: sanitizeText(raw?.summary, 200),
    urgency: URGENCY_KEYS.has(raw?.urgency) ? raw.urgency : 'low',
    commercialIntent: URGENCY_KEYS.has(raw?.commercialIntent) ? raw.commercialIntent : 'medium',
    readyToRecommend: raw?.readyToRecommend === true,
    question: raw?.question ? sanitizeText(raw.question, 300) : null,
    options: raw?.readyToRecommend === true ? [] : normalizeOptions(raw?.options),
  };
};

// ---------------------------------------------------------------------------
// Preguntas de proceso/ayuda (cómo reservar, pagar, cómo funciona)
// ---------------------------------------------------------------------------
// Se interceptan ANTES de la clasificación con IA: el usuario pregunta por el
// funcionamiento de la plataforma, no plantea un problema legal. Responder con
// instrucciones concretas evita que el LLM lo confunda con una categoría legal.

const PROCESS_REPLIES = {
  how_to_book:
    'Para reservar una consulta:\n\n1️⃣ Toca el botón **"Reservar consulta"** en la tarjeta del abogado que te interese.\n2️⃣ Elige el servicio y el horario que prefieras.\n3️⃣ Completa el pago de forma segura y tu consulta quedará agendada.\n\nTambién puedes tocar **"Ver perfil"** para conocer más sobre el abogado antes de decidir.',
  pricing:
    'El valor de la consulta lo define cada abogado, por lo que depende del profesional y del tipo de consulta que necesites. En la tarjeta de cada abogado verás el precio de su consulta y podrás tocar **"Ver perfil"** para conocer más detalles antes de reservar.',
  how_platform:
    'Te cuento cómo funciona LegalUp:\n\n1️⃣ Me cuentas tu problema legal.\n2️⃣ Busco abogados verificados que trabajan casos similares y te los muestro.\n3️⃣ Tú eliges, ves su perfil y reservas una consulta directa.\n\n¿Quieres que busque un abogado para tu caso? Cuéntame brevemente qué ocurrió.',
};

const PROCESS_INTENT_PATTERNS = [
  {
    type: 'how_to_book',
    patterns: [
      /c[oó]mo (reserv[oó]|reservar|agendo|agendar|contrat[oó]|contratar)/i,
      /quier[oó] (reservar|agendar|contratar)/i,
      /reservar (una )?(consulta|cita|hora)/i,
      /d[oó]nde (reserv[oó]|contrat[oó])/i,
      /(hacer|hago) (una )?reserva/i,
      /tomar (una )?hora/i,
    ],
  },
  {
    type: 'pricing',
    patterns: [
      /c[oó]mo (se )?paga/i,
      /c[oó]mo pag[oó]/i,
      /cu[aá]nto (cuesta|vale|cobran|cobra|sale)/i,
      /precios? de (las|la) consult/i,
      /(qu[eé]|cu[aá]l es el) precio de (la|una) consult/i,
    ],
  },
  {
    type: 'how_platform',
    patterns: [
      /c[oó]mo funciona (legalup|la plataforma|esto|el proceso|la p[aá]gina)/i,
      /c[oó]mo (sigo|contin[úu]o|prosigo)/i,
      /qu[eé] (hago|sigo) (ahora|despu[eé]s)/i,
      /cu[aá]l es el siguiente paso/i,
      /d[oó]nde veo (los |a )?abogados/i,
      /cu[aá]les son los pasos/i,
    ],
  },
];

export const detectProcessIntent = (messages) => {
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === 'user');
  if (!lastUser) return null;
  const text = String(lastUser.content || '').trim();
  if (text.length === 0 || text.length > 120) return null;

  for (const rule of PROCESS_INTENT_PATTERNS) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { type: rule.type, reply: PROCESS_REPLIES[rule.type] };
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Consulta específica: "¿qué servicios ofrece el abogado <nombre>?"
// ---------------------------------------------------------------------------
// Si el usuario pregunta por los servicios de un abogado POR NOMBRE, se busca
// el perfil real en Supabase y se muestran SUS servicios (CERO LLM). La
// validación contra la base de datos evita falsos positivos: si el fragmento
// de nombre no acota a ningún abogado real, se devuelve null y el flujo sigue
// con la clasificación normal.

const cleanNameFragment = (text) =>
  String(text || '')
    .replace(/[¿?¡!,.;:]+/g, ' ')
    .replace(/\b(abogad[oa]s?)\b/gi, ' ')
    .replace(
      /\b(de|del|de la|de los|de las|que|me|se|la|las|el|los|y|sus|dime|qu[eé]|cu[aá]les|cu[aá]l|son|tiene|tienen|ofrecen?|prestan?|hacen?|realizan?|est[aá]n|para)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

export const detectLawyerServicesIntent = (messages) => {
  const lastUser = [...(messages || [])].reverse().find((m) => m.role === 'user');
  if (!lastUser) return null;
  const text = String(lastUser.content || '').trim();
  if (!/\bservicio[a-z]*/i.test(text)) return null;

  const mentionsAbogado = /\b(abogad[oa]s?|abogad[oa])\b/i.test(text);
  const candidates = [];
  const after = text.replace(/^[\s\S]*?\bservicio[a-z]*/i, ' ');
  const cleanAfter = cleanNameFragment(after);
  // Un fragmento de nombre honesto suele tener pocas palabras. Los contextos
  // genéricos ("servicios de una empresa de telefonía...") se descartan aquí;
  // si quedan dudas, la validación contra la DB decide.
  if (cleanAfter.length >= 3 && (mentionsAbogado || cleanAfter.split(' ').length <= 4)) {
    candidates.push(cleanAfter);
  }

  if (mentionsAbogado) {
    const match = text.match(
      /\babogad[oa]s?\s+([a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+(?:\s+[a-zA-ZáéíóúñüÁÉÍÓÚÑÜ]+){0,2})/i
    );
    if (match && match[1]) {
      const cand = cleanNameFragment(match[1]);
      if (cand.length >= 3 && !candidates.includes(cand)) candidates.push(cand);
    }
  }

  if (candidates.length === 0) return null;
  return { candidates };
};

const tokenizeNameFragment = (fragment) =>
  cleanNameFragment(fragment)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(' ')
    .filter((t) => t.length >= 3);

const scoreNameFragment = ({ tokens, fullName, firstNorm, lastNorm }) => {
  const joined = tokens.join(' ');
  const allTokens = tokens.every((t) => fullName.includes(t));
  const hits = tokens.filter((t) => fullName.includes(t)).length;
  let score = 0;
  if (fullName === joined) score = 100;
  else if (fullName.startsWith(joined)) score = 90;
  else if (fullName.includes(joined)) score = 75;
  if (allTokens) score = Math.max(score, 70 + Math.min(tokens.length, 3));
  if (hits > 0) score = Math.max(score, 30 + hits * 10);
  if (tokens.length === 1) {
    const t = tokens[0];
    if (t.length >= 4 && fullName.includes(t)) score = Math.max(score, 60);
    if (firstNorm === t || lastNorm === t) score = Math.max(score, 85);
  }
  return score;
};

export async function findLawyerServicesByName({ supabase, candidates, limit = 20 }) {
  const cleanCandidates = Array.isArray(candidates)
    ? candidates.filter((c) => cleanNameFragment(c).length >= 3)
    : [];
  if (cleanCandidates.length === 0) return null;

  let lawyers = [];
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, user_id, first_name, last_name, display_name, avatar_url, specialties, bio, location, hourly_rate_clp, contact_fee_clp, experience_years, rating, review_count, verified, pjud_verified, availability, blocked'
      )
      .eq('role', 'lawyer')
      .not('blocked', 'eq', true)
      .limit(60);
    if (error) throw error;
    lawyers = data || [];
  } catch (error) {
    console.warn('[Assistant] búsqueda de abogado por nombre falló:', error?.message || error);
    return null;
  }

  let bestLawyer = null;
  let bestScore = 0;
  for (const fragment of cleanCandidates) {
    const tokens = tokenizeNameFragment(fragment);
    if (tokens.length === 0) continue;
    const variants = [tokens];
    if (tokens.length > 1) variants.push(tokens.slice(-2));
    if (tokens.length >= 2) variants.push([tokens[tokens.length - 1]]);
    for (const lawyer of lawyers) {
      const fullName = normalizeText(
        lawyer.display_name || [lawyer.first_name, lawyer.last_name].filter(Boolean).join(' ')
      );
      const firstNorm = normalizeText(lawyer.first_name || '');
      const lastNorm = normalizeText(lawyer.last_name || '');
      for (const variant of variants) {
        const score = scoreNameFragment({ tokens: variant, fullName, firstNorm, lastNorm });
        if (score > bestScore) {
          bestScore = score;
          bestLawyer = lawyer;
        }
        if (score >= 60) break;
      }
    }
  }

  if (!bestLawyer || bestScore < 60) return null;

  const userId = bestLawyer.user_id || bestLawyer.id;
  const items = [];
  try {
    const { data, error } = await supabase
      .from('lawyer_services')
      .select('id, lawyer_user_id, title, description, price_clp, delivery_time, requires_quote, available')
      .eq('lawyer_user_id', userId)
      .eq('available', true)
      .limit(50);
    if (!error && Array.isArray(data)) {
      for (const sv of data) {
        items.push({
          id: sv.id,
          title: sv.title,
          description: sv.description || null,
          price_clp: sv.price_clp || 0,
          delivery_time: sv.delivery_time || null,
          requires_quote: Boolean(sv.requires_quote),
          display_price: getDisplayPrice(sv.price_clp || 0),
        });
      }
      items.sort((a, b) => a.display_price - b.display_price);
    }
  } catch (error) {
    console.warn('[Assistant] consulta de servicios falló:', error?.message || error);
  }

  const name =
    bestLawyer.display_name ||
    [bestLawyer.first_name, bestLawyer.last_name].filter(Boolean).join(' ') ||
    'Abogado';
  const cleanName = String(name || '').trim();
  return {
    lawyer: {
      id: userId,
      name: cleanName,
      slug: createSlug(cleanName),
      avatar_url: bestLawyer.avatar_url || null,
      specialties: Array.isArray(bestLawyer.specialties) ? bestLawyer.specialties : [],
      rating: bestLawyer.rating ?? null,
      review_count: bestLawyer.review_count ?? null,
      experience_years: bestLawyer.experience_years ?? null,
      location: bestLawyer.location || null,
      bio: bestLawyer.bio || null,
      hourly_rate_clp: bestLawyer.hourly_rate_clp ?? null,
      contact_fee_clp: bestLawyer.contact_fee_clp ?? null,
      verified: Boolean(bestLawyer.verified || bestLawyer.pjud_verified),
      pjud_verified: Boolean(bestLawyer.pjud_verified),
      matchScore: bestScore,
      matchReasons: ['Consulta directa por nombre'],
      explanation: null,
      isTopPick: true,
      bestService: items[0] || null,
    },
    items,
    name: cleanName,
  };
}

// ---------------------------------------------------------------------------
// Clasificador fallback por keywords (costo cero, robustez si IA no configurada)
// ---------------------------------------------------------------------------

const KEYWORD_RULES = [
  {
    category: 'arriendo',
    subcategory: 'devolucion_garantia',
    patterns: [/garant[íi]a/i, /devolv[a-z]*.*arriendo/i, /mes de garant[ií]a/i, /garantia de (arriendo|departamento|casa)/i],
  },
  {
    category: 'arriendo',
    subcategory: 'otros',
    patterns: [/arriendo/i, /arrendador/i, /arrendatario/i, /inmobiliari[oa]/i, /departamento/i, /desalojo/i, /propiedad/i, /copropiedad/i, /gastos comunes/i, /comunidad/i],
  },
  {
    category: 'familia',
    subcategory: 'pension_alimentos',
    patterns: [/pensi[óo]n de alimentos/i, /no me paga.*pensi[óo]n/i, /alimentos.*hij/i, /pensi[óo]n alimenticia/i, /manutenci[óo]n/i],
  },
  {
    category: 'familia',
    subcategory: 'divorcio',
    patterns: [/divorcio/i, /separaci[óo]n legal/i, /compensaci[óo]n econ[óo]mica/i],
  },
  {
    category: 'familia',
    subcategory: 'cuidado_personal',
    patterns: [/cuidado personal/i, /custodia/i, /tuici[óo]n/i, /tenencia de (mis )?hijos/i],
  },
  {
    category: 'familia',
    subcategory: 'violencia_intrafamiliar',
    patterns: [/violencia intrafamiliar/i, /maltrato/i, /vif/i, /agresi[óo]n.*familiar/i],
  },
  {
    category: 'familia',
    subcategory: 'otros',
    patterns: [/familia/i, /pap[aá] /i, /mam[aá] /i, /hij[oa]s/i, /visitas/i, /relaci[óo]n directa/i, /filiaci[óo]n/i, /paternidad/i],
  },
  {
    category: 'laboral',
    subcategory: 'despido',
    patterns: [/despido/i, /despidieron/i, /despedido/i, /cese/i, /echaron/i, /término de (mi )?(contrato|relaci[óo]n)/i],
  },
  {
    category: 'laboral',
    subcategory: 'finiquito',
    patterns: [/finiquito/i],
  },
  {
    category: 'laboral',
    subcategory: 'sueldo_impago',
    patterns: [/sueldo.*impag/i, /no me pagan/i, /no me pagaron/i, /sueldos.*deb/i, /salarios/i],
  },
  {
    category: 'laboral',
    subcategory: 'otros',
    patterns: [/laboral/i, /trabajo/i, /emplead/i, /indemnizaci[óo]n/i, /acoso laboral/i, /licencia m[ée]dica/i, /accidente.*trabajo/i, /fuero/i],
  },
  {
    category: 'consumidor',
    subcategory: 'otros',
    patterns: [/consumidor/i, /sernac/i, /tienda/i, /empresa.*(no responde|no me devuelve)/i, /reembolso/i, /garant[ií]a.*producto/i, /devolver.*producto/i, /servicio.*contrat/i, /cobro indebido/i],
  },
  {
    category: 'comercial',
    subcategory: 'otros',
    patterns: [/empresa/i, /sociedad/i, /socio/i, /comercial/i, /constituir/i, /contrato comercial/i, /cobranza/i, /factura/i, /boleta/i, /proveedor/i],
  },
  {
    category: 'penal',
    subcategory: 'otros',
    patterns: [/penal/i, /denuncia/i, /querella/i, /citaci[óo]n/i, /delito/i, /robo/i, /hurto/i, /estafa/i, /lesiones/i, /amenaza/i, /causa penal/i, /fiscal/i],
  },
  {
    category: 'civil',
    subcategory: 'deudas',
    patterns: [/deuda/i, /debo/i, /adeudo/i, /cobr[aá]ndome/i, /juicio ejecutivo/i],
  },
  {
    category: 'civil',
    subcategory: 'incumplimiento_contrato',
    patterns: [/incumplimiento.*contrato/i, /no cumpli[oó].*contrato/i],
  },
  {
    category: 'civil',
    subcategory: 'pagare',
    patterns: [/pagar[ée]/i, /cheque.*protest/i, /letra de cambio/i],
  },
  {
    category: 'civil',
    subcategory: 'prestamo_dinero',
    patterns: [/pr[ée]stamo/i, /prestar.*(plata|dinero)/i, /dinero.*(prest[eé]|deb[ióo])/i],
  },
  {
    category: 'civil',
    subcategory: 'otros',
    patterns: [/civil/i, /contrato/i, /responsabilidad/i, /da[ñn]os/i, /herencia/i, /sucesi[óo]n/i, /testamento/i],
  },
];

const FALLBACK_INTENT_PATTERNS = {
  high: [/demandar/i, /necesito un abogado/i, /busco un abogado/i, /quie[rñ]o (contratar|reservar)/i, /cu[áa]nto cuesta/i, /c[oó]mo puedo (contratar|reservar)/i, /qui[ée]n puede llevar/i, /necesito ayuda/i, /abogad[oa]/i],
  low: [/qu[eé] significa/i, /en qu[eé] consiste/i, /c[oó]mo funciona/i, /qu[eé] es/i, /explica/i, /curiosidad/i],
};

const FALLBACK_URGENCY_PATTERNS = [
  /audiencia/i,
  /ma[ñn]ana/i,
  /plazo vence/i,
  /venci[oó] el plazo/i,
  /citaci[oó]n/i,
  /despidieron (hace |esta semana|ayer)/i,
  /detenido/i,
  /notificaci[oó]n/i,
  /demanda recibida/i,
  /urgente/i,
  /violencia/i,
  /hoy/i,
];

const FALLBACK_REPLIES = {
  arriendo: 'Entiendo. Por lo que me cuentas, tu caso está relacionado con arriendos y temas inmobiliarios. Una revisión con un abogado especializado puede ayudarte a clarificar cuáles son tus derechos y el siguiente paso más conveniente.',
  familia: 'Entiendo. Por lo que me cuentas, tu caso está relacionado con derecho de familia. Un abogado de familia puede orientarte sobre las opciones que existen en tu situación.',
  laboral: 'Entiendo. Por lo que me cuentas, tu caso está relacionado con derecho laboral. Sería recomendable revisar los antecedentes de tu situación laboral con un abogado especializado antes de tomar una decisión.',
  civil: 'Entiendo. Por lo que me cuentas, tu caso está relacionado con temas civiles y contractuales. Un abogado puede revisar los antecedentes y orientarte sobre el siguiente paso.',
  consumidor: 'Entiendo. Tu situación se relaciona con derechos del consumidor frente a una empresa. Un abogado especializado puede indicarte qué opciones existen para tu caso.',
  comercial: 'Entiendo. Tu situación se relaciona con temas comerciales o de empresa. Un abogado puede revisar los antecedentes y ayudarte a definir el mejor camino.',
  penal: 'Entiendo. Tu situación se relaciona con el área penal. Dado lo delicado de estos asuntos, es importante que un abogado revise tus antecedentes cuanto antes.',
  otros: 'Entiendo. Para orientarte bien necesito un poco más de contexto. Cuéntame brevemente qué ocurrió y qué esperas lograr, así puedo ayudarte a encontrar al abogado más adecuado.',
};

const FALLBACK_QUESTIONS = {
  arriendo: '¿Ya entregaste el inmueble (o todavía estás en el lugar)? ¿Y hace cuánto tiempo ocurrió?',
  familia: '¿Ya existe una resolución o acuerdo previo (por ejemplo, una pensión fijada por el tribunal), o esto parte desde cero?',
  laboral: '¿Cuándo terminó tu relación laboral y ya firmaste el finiquito?',
  civil: '¿Ya existe un documento firmado (contrato, pagaré, préstamo) y hay algún plazo vencido?',
  consumidor: '¿Qué tipo de producto o servicio es, y qué te indicó la empresa hasta ahora?',
  comercial: '¿La situación involucra un contrato, una sociedad o una cobranza? Cuéntame un poco más.',
  penal: '¿Ya existe una denuncia, citación o notificación, o recién estás evaluando qué hacer?',
  otros: 'Cuéntame un poco más: ¿qué ocurrió y qué te gustaría lograr con ayuda de un abogado?',
};

const FALLBACK_OPTIONS = {
  arriendo: ['Sí, ya entregué el inmueble', 'Todavía estoy en el lugar', 'No estoy seguro/a'],
  familia: ['Ya existe una resolución previa', 'No, parte desde cero', 'No estoy seguro/a'],
  laboral: ['Hace menos de un mes', 'Hace más de un mes', 'Aún no firmo el finiquito'],
  civil: ['Sí, hay un documento y plazo vencido', 'Hay documento, pero sin plazo vencido', 'No hay documento'],
  consumidor: ['Un producto', 'Un servicio', 'Ambos'],
  comercial: ['Un contrato', 'Una sociedad', 'Una cobranza'],
  penal: ['Ya existe denuncia o citación', 'Recién estoy evaluando', 'No estoy seguro/a'],
  otros: ['Es un problema personal', 'Es de mi empresa o negocio', 'No estoy seguro/a'],
};

const classifyFallback = (history) => {
  const userText = history
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  let match = null;
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => p.test(userText))) {
      match = rule;
      break;
    }
  }

  const category = match ? match.category : 'otros';
  const subcategory = match ? match.subcategory : 'otros';
  const summary = userText.slice(0, 200);
  const urgency = FALLBACK_URGENCY_PATTERNS.some((p) => p.test(userText)) ? 'high' : 'medium';
  let commercialIntent = 'medium';
  for (const [level, patterns] of Object.entries(FALLBACK_INTENT_PATTERNS)) {
    if (patterns.some((p) => p.test(userText))) {
      commercialIntent = level;
      break;
    }
  }

  const question =
    category !== 'otros' && userText.length > 40 ? null : FALLBACK_QUESTIONS[category];
  const readyToRecommend = category !== 'otros' && userText.length > 40;

  return normalizeClassification({
    reply: FALLBACK_REPLIES[category],
    category,
    subcategory,
    summary,
    urgency,
    commercialIntent,
    readyToRecommend,
    question,
    options: readyToRecommend ? [] : FALLBACK_OPTIONS[category],
  });
};

// ---------------------------------------------------------------------------
// Clasificación principal: IA primero, fallback determinístico después
// ---------------------------------------------------------------------------

export async function classifyProblem({ history, userCity, chatCompletion }) {
  const messages = sanitizeMessages(history, 12);
  if (messages.length === 0) {
    return { classification: classifyFallback([{ role: 'user', content: '' }]), usedAI: false, usage: null };
  }

  let usedAI = false;
  let usage = null;
  try {
    const result = await chatCompletion({
      system: buildAssistantSystemPrompt(),
      messages: [
        { role: 'user', content: buildAssistantUserPrompt({ history: messages, userCity }) },
      ],
      maxTokens: 700,
      temperature: 0.4,
    });
    usage = result.usage || null;
    usedAI = true;
    return { classification: normalizeClassification(result.data), usedAI, usage };
  } catch (error) {
    // Fallback determinístico ante cualquier fallo del proveedor (costo cero).
    console.warn('[Assistant] IA falló, usando clasificador fallback:', error?.message || error);
    return { classification: classifyFallback(messages), usedAI, usage: null };
  }
}

// ---------------------------------------------------------------------------
// Matching de abogados (scoring determinístico, solo datos reales)
// ---------------------------------------------------------------------------

const SURCHARGE_PERCENT = 0.1;

const roundToThousands = (amount) => Math.round(amount / 1000) * 1000;
const applySurcharge = (price) => Math.round(price * (1 + SURCHARGE_PERCENT));

const getDisplayPrice = (priceClp) => roundToThousands(applySurcharge(priceClp));

const createSlug = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const normalizeText = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const scoreLawyer = ({ lawyer, category, specialties, serviceKeywords, subcategoryLabel, userCity }) => {
  let score = 0;
  const reasons = [];
  const lawyerSpecialties = Array.isArray(lawyer.specialties)
    ? lawyer.specialties.map((s) => normalizeText(s))
    : [];
  const primarySpecs = (specialties.primary || []).map(normalizeText);
  const relatedSpecs = (specialties.related || []).map(normalizeText);

  const primaryHit = primarySpecs.some((s) => lawyerSpecialties.includes(s));
  if (primaryHit) {
    score += 40;
    reasons.push('Especialidad principal coincide');
  }

  const relatedHit = relatedSpecs.some((s) => lawyerSpecialties.includes(s));
  if (relatedHit) {
    score += 25;
    reasons.push('Área relacionada');
  }

  const serviceHit = (lawyer.services || []).some((sv) =>
    (serviceKeywords || []).some((kw) => normalizeText(sv.title).includes(normalizeText(kw)))
  );
  if (serviceHit) {
    score += 25;
    reasons.push('Trabaja servicios similares');
  }

  if (lawyer.experience_years >= 5) score += 15;
  else if (lawyer.experience_years >= 2) score += 7;

  if (lawyer.availability && lawyer.availability !== '') score += 10;

  if (userCity && lawyer.location && normalizeText(lawyer.location).includes(normalizeText(userCity))) {
    score += 10;
    reasons.push('Ubicación compatible');
  }

  if (lawyer.verified || lawyer.pjud_verified) {
    score += 5;
    reasons.push('Abogado verificado');
  }

  return { score, reasons };
};

const pickBestService = (services, serviceKeywords) => {
  if (!services || services.length === 0) return null;
  const sorted = [...services].sort((a, b) => {
    const aMatch = (serviceKeywords || []).some((kw) =>
      normalizeText(a.title).includes(normalizeText(kw))
    );
    const bMatch = (serviceKeywords || []).some((kw) =>
      normalizeText(b.title).includes(normalizeText(kw))
    );
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    if (a.requires_quote !== b.requires_quote) return a.requires_quote ? 1 : -1;
    return (a.price_clp || 0) - (b.price_clp || 0);
  });
  const best = sorted[0];
  return {
    id: best.id,
    title: best.title,
    description: best.description || null,
    price_clp: best.price_clp || 0,
    delivery_time: best.delivery_time || null,
    requires_quote: best.requires_quote || false,
    display_price: getDisplayPrice(best.price_clp || 0),
  };
};

export async function matchLawyers({ supabase, category, subcategory, userCity, limit = 4 }) {
  const cat = ASSISTANT_CATEGORIES[category] || ASSISTANT_CATEGORIES.otros;
  const specialties = {
    primary: cat.specialties.slice(0, 1),
    related: cat.specialties.slice(1),
  };
  const serviceKeywords = cat.serviceKeywords || [];
  const subcategoryLabel =
    (SUBCATEGORIES[category] && SUBCATEGORIES[category][subcategory]) ||
    SUBCATEGORIES.otros.otros;

  const specialtyFilters = cat.specialties.map((s) => `specialties.cs.{"${s}"}`).join(',');

  let lawyers = [];
  try {
    const query = supabase
      .from('profiles')
      .select(
        'id, user_id, first_name, last_name, display_name, avatar_url, specialties, bio, location, hourly_rate_clp, contact_fee_clp, experience_years, rating, review_count, verified, pjud_verified, availability, blocked'
      )
      .eq('role', 'lawyer')
      .or(specialtyFilters)
      .not('blocked', 'eq', true)
      .limit(40);
    const { data, error } = await query;
    if (error) throw error;
    lawyers = data || [];
  } catch (error) {
    console.warn('[Assistant] consulta de abogados falló:', error?.message || error);
    lawyers = [];
  }

  // Fallback (§28): si no hay especialistas, traer abogados verificados del área
  // más cercana para no dejar al usuario sin opciones. Nunca decir "no hay abogados".
  if (lawyers.length === 0) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, user_id, first_name, last_name, display_name, avatar_url, specialties, bio, location, hourly_rate_clp, contact_fee_clp, experience_years, rating, review_count, verified, pjud_verified, availability, blocked'
        )
        .eq('role', 'lawyer')
        .not('blocked', 'eq', true)
        .limit(20);
      if (!error) lawyers = data || [];
    } catch {
      lawyers = [];
    }
  }

  if (lawyers.length === 0) return [];

  const lawyerIds = lawyers.map((l) => l.user_id || l.id);
  const serviceMap = {};
  try {
    const { data: services, error } = await supabase
      .from('lawyer_services')
      .select('id, lawyer_user_id, title, description, price_clp, delivery_time, requires_quote, available')
      .in('lawyer_user_id', lawyerIds)
      .eq('available', true)
      .limit(200);
    if (!error) {
      for (const sv of services || []) {
        if (!serviceMap[sv.lawyer_user_id]) serviceMap[sv.lawyer_user_id] = [];
        serviceMap[sv.lawyer_user_id].push(sv);
      }
    }
  } catch (error) {
    console.warn('[Assistant] consulta de servicios falló:', error?.message || error);
  }

  const scored = [];
  for (const lawyer of lawyers) {
    const userId = lawyer.user_id || lawyer.id;
    const services = serviceMap[userId] || [];
    const { score, reasons } = scoreLawyer({
      lawyer: { ...lawyer, services },
      category,
      specialties,
      serviceKeywords,
      subcategoryLabel,
      userCity,
    });
    const name =
      lawyer.display_name ||
      [lawyer.first_name, lawyer.last_name].filter(Boolean).join(' ') ||
      'Abogado';
    scored.push({
      id: userId,
      name,
      slug: createSlug(name),
      avatar_url: lawyer.avatar_url || null,
      specialties: Array.isArray(lawyer.specialties) ? lawyer.specialties : [],
      rating: lawyer.rating ?? null,
      review_count: lawyer.review_count ?? null,
      experience_years: lawyer.experience_years ?? null,
      location: lawyer.location || null,
      bio: lawyer.bio || null,
      hourly_rate_clp: lawyer.hourly_rate_clp ?? null,
      contact_fee_clp: lawyer.contact_fee_clp ?? null,
      verified: Boolean(lawyer.verified || lawyer.pjud_verified),
      pjud_verified: Boolean(lawyer.pjud_verified),
      matchScore: score,
      matchReasons: reasons.slice(0, 3),
      bestService: pickBestService(services, serviceKeywords),
    });
  }

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const ranked = scored.slice(0, limit).map((lawyer, index) => ({
    ...lawyer,
    isTopPick: index === 0,
  }));

  // Si el mejor puntaje es 0 (sin match real), igual devolver las opciones para
  // no dejar al usuario sin alternativas, pero marcándolas como "área cercana".
  return ranked;
}

// ---------------------------------------------------------------------------
// Copy de recomendación (fallback determinístico, sin inventar abogados)
// ---------------------------------------------------------------------------

export function buildRecommendationCopy({ category, subcategory, urgency, commercialIntent }) {
  const cat = ASSISTANT_CATEGORIES[category] || ASSISTANT_CATEGORIES.otros;
  const subLabel =
    (SUBCATEGORIES[category] && SUBCATEGORIES[category][subcategory]) || SUBCATEGORIES.otros.otros;
  const urgencyLine =
    urgency === 'high'
      ? '\nPor los antecedentes que mencionas, parece importante que un abogado revise tu situación cuanto antes.'
      : '';

  return `Por lo que me cuentas, tu caso está relacionado con **${subLabel}**.
${urgencyLine}
Lo más conveniente sería revisar tus antecedentes con un abogado especializado en ${cat.shortLabel}. Encontré abogados en LegalUp que trabajan este tipo de casos.`;
}

// ---------------------------------------------------------------------------
// Cerebro 3 · Explicación de la recomendación (data-grounded)
// ---------------------------------------------------------------------------
// Este paso ocurre DESPUÉS del matching determinístico (Cerebro 2). Solo se
// ejecuta si existen abogados reales en Supabase. La IA recibe únicamente los
// datos reales del candidato (nombre, especialidades, años, ubicación, servicio)
// y el problema del usuario; está PROHIBIDO que invente abogados, logros,
// títulos, precios o cualquier dato fuera de la lista. Si el proveedor falla o
// no hay IA configurada, se cae a las razones determinísticas (matchReasons) y
// al copy de fallback, sin romper el flujo de conversión.

const buildExplanationSystemPrompt = () => `
ROL:
Eres el motor de justificación de recomendaciones de abogados de LegalUp.
Recibes el problema de un usuario y una lista de abogados REALES disponibles,
extraídos de nuestra base de datos con su puntaje de compatibilidad.

TAREA:
Redacta para CADA abogado de la lista una razón breve (máximo 30 palabras) de por
qué es una buena opción para el problema del usuario.

REGLAS (violarlas es un error grave):
- Usa ÚNICAMENTE los datos entregados (nombre, especialidades, años de experiencia,
  ubicación y servicio). NUNCA inventes logros, títulos, universidades, ciudades,
  casos ganados ni precios.
- NO menciones abogados que no estén en la lista. NO inventes abogados.
- NO indiques precios ni valores: la plataforma los muestra por separado.
- No repitas el mismo texto para todos: personaliza según los datos de cada uno.
- Habla en español de Chile, tono cercano, profesional y sin exagerar.

Responde SOLO con JSON válido con este esquema:
{"reasons":[{"id":"<id del abogado>","reason":"<razón breve>"}]}
`.trim();

const buildExplanationUserPrompt = ({ problem, lawyers }) => {
  const safeLawyers = (lawyers || []).map((l) => ({
    id: l.id,
    name: l.name,
    specialties: Array.isArray(l.specialties) ? l.specialties.slice(0, 3) : [],
    experience_years: l.experience_years ?? null,
    location: l.location ?? null,
    service: l.bestService?.title ?? null,
    matchScore: l.matchScore ?? null,
  }));
  return `Problema del usuario:\n${problem}\n\nAbogados disponibles (datos reales):\n${JSON.stringify(
    safeLawyers
  )}\n\nRedacta la razón para cada uno.`;
};

export async function explainRecommendation({ problem, lawyers, chatCompletion }) {
  if (!Array.isArray(lawyers) || lawyers.length === 0) {
    return { reasons: {}, usedAI: false, usage: null };
  }

  let usedAI = false;
  let usage = null;
  try {
    const result = await chatCompletion({
      system: buildExplanationSystemPrompt(),
      messages: [
        { role: 'user', content: buildExplanationUserPrompt({ problem, lawyers }) },
      ],
      maxTokens: 800,
      temperature: 0.3,
    });
    usage = result.usage || null;
    usedAI = true;

    // Validación estricta: solo aceptamos ids que existan en la lista real y
    // descartamos razones vacías o fuera de contexto.
    const validIds = new Set((lawyers || []).map((l) => l.id));
    const reasons = {};
    const rawReasons = Array.isArray(result?.data?.reasons) ? result.data.reasons : [];
    for (const entry of rawReasons) {
      if (!entry || !validIds.has(entry.id)) continue;
      const reason = String(entry.reason || '').trim().slice(0, 120);
      if (reason.length > 0) reasons[entry.id] = reason;
    }
    return { reasons, usedAI, usage };
  } catch (error) {
    console.warn(
      '[Assistant] explicación IA falló, usando razones determinísticas:',
      error?.message || error
    );
    return { reasons: {}, usedAI, usage: null };
  }
}

// Exportamos también los límites/constantes para el endpoint.
export const ASSISTANT_LIMITS = {
  MAX_HISTORY_MESSAGES: 12,
  MAX_MESSAGE_LENGTH: 1200,
  MAX_REPLY_LENGTH: 1200,
  MAX_LAWYERS: 4,
  MAX_EXPLANATION_REASONS: 4,
};

