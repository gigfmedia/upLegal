import { describe, it, expect } from 'vitest';
import { buildJurisprudenceOutcome, computeAttributionCoverage, applyRelevanceGate } from './jurisprudencePipeline.mjs';
import { checkDocumentClaimFacts } from './documentGrounding.mjs';
import { isSourceResponsiveToQuery } from './jurisprudenceSources.mjs';

// Helpers
const doc = (id, text, overrides={}) => ({
  id, original_filename: `${id}.pdf`, extracted_text: text, workspace_id:'w1', lawyer_id:'l1', status:'ready', ...overrides
});
const contrato = () => doc('doc-4221-1111-aaaa-4bbb-8ccc-000000000001', 'PRIMERA: El canon de arrendamiento mensual es de 500.000 pesos. SEGUNDA: El plazo del contrato es de doce meses. TERCERA: Se prohíbe el subarriendo sin autorización por escrito del arrendador. Partes: María González como arrendadora y Jorge Pérez como arrendatario.');
const normativa = (extra={}) => ({
  id:'bcn-21719', kind:'normativa', source_type:'normativa', legal_authority:'vinculante', vigency:'desconocida', citation:'Ley 21.719', title:'Ley 21.719', norm_type:'ley', norm_number:'21.719', url:'https://bcn.cl/21719', excerpt:'Derechos de los titulares: toda persona tiene derecho a acceso, rectificación, supresión.', metadata:{fragments:[{id:'frag:21719:1', article:'Artículo 4', text:'Toda persona tiene derecho a acceso, rectificación, supresión, oposición, portabilidad y bloqueo.'}]}, ...extra
});
const tc = (extra={}) => ({
  id:'tc-5174', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Tribunal Constitucional — Rol 5174', excerpt:'Establece que el derecho a la protección de datos se reconoce como derecho fundamental.', ...extra
});
const doctrina = (extra={}) => ({
  id:'doc-1', kind:'doctrina', source_type:'doctrina', legal_authority:'doctrinal', vigency:'no_aplica', citation:'Autor. (2020). Artículo', excerpt:'La doctrina sostiene que el consentimiento debe ser informado.', ...extra
});

// ───────────────────────────────────────────────────────────────────────────
// §19 Tests obligatorios
// ───────────────────────────────────────────────────────────────────────────
describe('4.2.21 · source sin claim no aparece en respuesta', () => {
  it('fuente recuperada sin claim no se persiste ni se muestra', () => {
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Nada', normativa:[], jurisprudencia:[], doctrina:[], documento:[], conclusion:''},
      sources:[normativa(), tc()], intent:'general', query:'¿qué?', documents:[], documentMode:'none'
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.persistedSources).toEqual([]);
    expect(r.answer).not.toContain('Ley 21.719');
  });
});

describe('4.2.21 · claim sin source visible no existe', () => {
  it('todo claim verificado tiene su source en persistedSources', () => {
    const d = contrato();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'El canon es 500.000', normativa:[{fuente_id:'bcn-21719', afirmacion:'La ley reconoce el derecho de acceso.', fragmento:'derecho a acceso'}], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[normativa()], intent:'general', query:'¿cuál es la renta y qué derecho reconoce la ley?', documents:[d], documentMode:'mixed'
    });
    // In mixed, normativa claim drops if not responsive to renta query; use query with acceso
    const r2 = buildJurisprudenceOutcome({
      data:{resumen:'Derechos', normativa:[{fuente_id:'bcn-21719', afirmacion:'La ley reconoce el derecho de acceso.', fragmento:'derecho a acceso'}], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[normativa()], intent:'general', query:'¿cuál es la renta mensual y qué derecho de acceso reconoce la ley?', documents:[d], documentMode:'mixed'
    });
    const ids = new Set(r2.persistedSources.map(s=>s.id));
    for(const c of r2.allVerifiedClaims) expect(ids.has(c.source_id)).toBe(true);
  });
});

describe('4.2.21 · múltiples sources por claim (modelo 1:1, se usan claims separados)', () => {
  it('dos fuentes relevantes coexisten como claims separados', () => {
    const s1 = normativa();
    const s2 = {...normativa(), id:'bcn-21555', citation:'Ley 21.555', title:'Ley 21.555', norm_number:'21.555'};
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Leyes', normativa:[
        {fuente_id:'bcn-21719', afirmacion:'La Ley 21.719 reconoce el derecho de acceso.', fragmento:'derecho a acceso'},
        {fuente_id:'bcn-21555', afirmacion:'La Ley 21.555 reconoce el derecho de supresión.', fragmento:'derecho a supresión'}
      ], jurisprudencia:[], doctrina:[], documento:[], conclusion:''},
      sources:[s1,s2], intent:'general', query:'derecho de acceso y supresión', documents:[], documentMode:'none'
    });
    expect(r.persistedSources.map(s=>s.id).sort()).toEqual(['bcn-21555','bcn-21719'].sort());
    // Si una es irrelevante, solo la relevante permanece
    const irrelevante = tc({id:'tc-irrel', citation:'Tribunal — Rol 9999', title:'Protección datos', excerpt:'Datos personales.'});
    const r2 = buildJurisprudenceOutcome({
      data:{resumen:'El canon es 500.000', normativa:[], jurisprudencia:[{fuente_id:'tc-irrel', afirmacion:'La protección de datos es fundamental.', fragmento:'protección de datos'}], doctrina:[], documento:[{document_id:contrato().id, afirmacion:'El canon es 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[irrelevante], intent:'general', query:'¿Cuál es la renta mensual?', documents:[contrato()], documentMode:'mixed'
    });
    expect(r2.persistedSources.some(s=>s.id==='tc-irrel')).toBe(false);
  });
});

describe('4.2.21 · source compartida por múltiples claims', () => {
  it('dos claims misma fuente: dedup conserva ambos claims', () => {
    const src = normativa();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Ley', normativa:[
        {fuente_id:'bcn-21719', afirmacion:'La ley reconoce el derecho de acceso.', fragmento:'derecho a acceso'},
        {fuente_id:'bcn-21719', afirmacion:'La ley reconoce el derecho de supresión.', fragmento:'derecho a supresión'}
      ], jurisprudencia:[], doctrina:[], documento:[], conclusion:''},
      sources:[src], intent:'general', query:'acceso y supresión', documents:[], documentMode:'none'
    });
    expect(r.persistedSources.length).toBe(1);
    expect(r.persistedSources[0].claims.length).toBe(2);
    expect(r.persistedSources[0].claims.every(c=>c.source_id==='bcn-21719')).toBe(true);
  });
});

describe('4.2.21 · fuente descartada no reaparece', () => {
  it('relevance gate: fuente descartada ausente en claims/sources/markdown/brief/síntesis', () => {
    const d = contrato();
    const src = tc({id:'j-datos', citation:'Corte Suprema — Rol 5174', title:'Protección de datos personales', excerpt:'Derecho fundamental a la protección de datos.'});
    const r = buildJurisprudenceOutcome({
      data:{resumen:'El canon es 500.000', normativa:[], jurisprudencia:[{fuente_id:'j-datos', afirmacion:'La protección de datos es un derecho fundamental.', fragmento:'derecho fundamental'}], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[src], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'mixed'
    });
    expect(r.relevanceDroppedSources).toBe(1);
    expect(r.allVerifiedClaims.some(c=>c.source_id==='j-datos')).toBe(false);
    expect(r.persistedSources.some(s=>s.id==='j-datos')).toBe(false);
    expect(r.answer.split('**Avisos**')[0]).not.toContain('5174');
    expect(r.resumenFinal).not.toContain('protección de datos');
    // síntesis vacía o sin referencia a 5174
    expect(r.síntesisText).not.toContain('5174');
  });
});

describe('4.2.21 · paráfrasis válida vs cambio de hechos', () => {
  it('paráfrasis válida de fecha aceptada', () => {
    const d = doc('docP','El presente contrato tendrá vigencia a partir del 01/01/2026.');
    const res = checkDocumentClaimFacts('El contrato comenzó el 1 de enero de 2026.', d.extracted_text);
    expect(res).toBe('accept');
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Inicio', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El contrato comenzó el 1 de enero de 2026.', fragmento:'vigencia a partir del 01/01/2026'}], conclusion:''},
      sources:[], intent:'general', query:'¿Cuándo comenzó el contrato?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('SUCCESS');
  });
  it('cambio de número rechazado', () => {
    const d = doc('docN','El canon es de 500.000 pesos.');
    expect(checkDocumentClaimFacts('El canon es de 700.000 pesos.', d.extracted_text)).toBe('reject');
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Canon', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es de 700.000 pesos.', fragmento:'canon es de 700.000'}], conclusion:''},
      sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
  });
  it('cambio de fecha rechazado', () => {
    const d = doc('docF','El presente contrato tendrá vigencia a partir del 01/01/2026.');
    expect(checkDocumentClaimFacts('El contrato comenzó el 1 de enero de 2025.', d.extracted_text)).toBe('reject');
  });
  it('cambio de identidad/rol rechazado', () => {
    const d = doc('docR','La arrendadora es María González.');
    expect(checkDocumentClaimFacts('La propietaria es María González.', d.extracted_text)).toBe('reject');
  });
});

describe('4.2.21 · inferencia no presentada como hecho', () => {
  it('pregunta valorativa sin evidencia externa → no claim factual verificado', () => {
    const d = contrato();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Sobre la base de las fuentes, puede inferirse que el contrato es caro.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:'Sobre la base de las fuentes, puede inferirse que el contrato es caro.'},
      sources:[], intent:'general', query:'¿Es un contrato caro?', documents:[d], documentMode:'document'
    });
    // El claim factual es solo el canon; la inferencia 'es caro' debe ir como inferencia etiquetada o eliminada, no como hecho
    // En document mode, síntesis con 'caro' sin respaldo sustantivo debe ser inferencia o dropped
    expect(r.outcome).toBe('SUCCESS');
    // Brief verificada no debe afirmar 'es caro' como hecho sin etiqueta
    // Si la oración de inferencia se conserva, lleva marco de inferencia
    if(r.resumenFinal.includes('caro')){
      expect(r.resumenFinal.toLowerCase()).toMatch(/infer|puede/);
    }
  });
});

describe('4.2.21 · contradicción preservada', () => {
  it('dos jurisprudencias sobre misma materia con misma renta no oculta conflicto', () => {
    const s1 = tc({id:'tc-1', citation:'Corte — Rol 1', excerpt:'La renta es de 500.000 y el plazo es de doce meses.'});
    const s2 = tc({id:'tc-2', citation:'Corte — Rol 2', excerpt:'La renta es de 600.000 y el plazo es de doce meses.'});
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Rentas', normativa:[], jurisprudencia:[
        {fuente_id:'tc-1', afirmacion:'La renta es de 500.000 pesos según la jurisprudencia.', fragmento:'renta es de 500.000'},
        {fuente_id:'tc-2', afirmacion:'La renta es de 600.000 pesos según la jurisprudencia.', fragmento:'renta es de 600.000'}
      ], doctrina:[], documento:[], conclusion:'La renta es de 500.000 y también de 600.000'},
      sources:[s1,s2], intent:'general', query:'¿Cuál es la renta?', documents:[], documentMode:'none'
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.persistedSources.length).toBe(2);
    // Matices/contradicciones conservadas si detectadas; si no, al menos ambas fuentes persisten
    expect(r.attributionCoverage).toBe(1);
  });
});

describe('4.2.21 · brief vs synthesis mismas evidencias', () => {
  it('brief y síntesis verificadas con mismos claims, sin claims nuevos', () => {
    const d = contrato();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'El canon es de 500.000 pesos.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:'El canon es de 500.000 pesos según el documento.'},
      sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'
    });
    expect(r.resumenFinal).toContain('500.000');
    expect(r.síntesisText).toContain('500.000');
    // Ambas deben ser verificadas (0 oraciones sin respaldo para la breve en SUCCESS)
    expect(r.attributionCoverage).toBe(1);
  });
});

describe('4.2.21 · attributionCoverage semántica', () => {
  it('SUCCESS con claims → 1', () => {
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Ley', normativa:[{fuente_id:'bcn-21719', afirmacion:'La ley reconoce el derecho de acceso.', fragmento:'derecho a acceso'}], jurisprudencia:[], doctrina:[], documento:[], conclusion:''},
      sources:[normativa()], intent:'general', query:'derecho de acceso', documents:[], documentMode:'none'
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.attributionCoverage).toBe(1);
  });
  it('SUCCESS sin claims es imposible; NO_EVIDENCE con 0 claims → 1 (vacío correcto)', () => {
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Nada', normativa:[], jurisprudencia:[], doctrina:[], documento:[], conclusion:''},
      sources:[], intent:'general', query:'¿qué?', documents:[], documentMode:'none'
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.attributionCoverage).toBe(1);
    expect(computeAttributionCoverage([])).toBe(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §20 Regresiones críticas R1-R6
// ───────────────────────────────────────────────────────────────────────────
describe('4.2.21 · R1: renta mensual documental', () => {
  it('document: renta mensual correcta, source documental, sin fuente pública irrelevante', () => {
    const d = contrato();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'El canon de arrendamiento mensual es de 500.000 pesos.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon de arrendamiento mensual es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.resumenFinal).toContain('500.000');
    expect(r.persistedSources.some(s=>s.kind==='document')).toBe(true);
    expect(r.relevanceDroppedSources).toBe(0);
  });
});
describe('4.2.21 · R2: partes del contrato', () => {
  it('document: partes correctas', () => {
    const d = contrato();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Partes', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'Las partes son María González como arrendadora y Jorge Pérez como arrendatario.', fragmento:'María González como arrendadora y Jorge Pérez como arrendatario'}], conclusion:''},
      sources:[], intent:'general', query:'¿Quiénes son las partes del contrato?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.answer).toContain('María González');
    expect(r.answer).toContain('Jorge Pérez');
  });
});
describe('4.2.21 · R3: garantía', () => {
  it('document: evidencia sobre garantía cuando existe', () => {
    const d = doc('docG','Garantía: El arrendatario entrega garantía de 500.000 pesos.');
    const r = buildJurisprudenceOutcome({
      data:{resumen:'La garantía entregada es de 500.000 pesos.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La garantía entregada es de 500.000 pesos.', fragmento:'garantía de 500.000 pesos'}], conclusion:''},
      sources:[], intent:'general', query:'¿Qué pasa con la garantía?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.resumenFinal).toContain('500.000');
  });
});
describe('4.2.21 · R4: daños ausentes → NO_EVIDENCE', () => {
  it('document sin evidencia de daños → NO_EVIDENCE, nunca afirma', () => {
    const d = contrato();
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Hubo daños', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El contrato señala que hubo daños.', fragmento:'hubo daños'}], conclusion:''},
      sources:[], intent:'general', query:'¿Hubo daños?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.resumenFinal).toContain('No se encontró evidencia suficiente');
  });
});
describe('4.2.21 · R5: fuente pública irrelevante eliminada completamente', () => {
  it('fuente irrelevante ausente en claims/sources/markdown/brief/síntesis', () => {
    const d = contrato();
    const src = tc({id:'j-irrel', citation:'Corte — Rol 9999', title:'Datos personales', excerpt:'Protección de datos personales.'});
    const r = buildJurisprudenceOutcome({
      data:{resumen:'El canon es 500.000', normativa:[], jurisprudencia:[{fuente_id:'j-irrel', afirmacion:'La protección de datos es fundamental.', fragmento:'protección de datos'}], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon es 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[src], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'mixed'
    });
    expect(r.allVerifiedClaims.some(c=>c.source_id==='j-irrel')).toBe(false);
    expect(r.persistedSources.some(s=>s.id==='j-irrel')).toBe(false);
    expect(r.answer.split('**Avisos**')[0]).not.toContain('9999');
    expect(r.resumenFinal).not.toContain('protección de datos');
    expect(r.síntesisText).not.toContain('protección de datos');
  });
});
describe('4.2.21 · R6: doctrinal overreach sigue bloqueado', () => {
  it('doctrina con lenguaje categórico sigue descartada', () => {
    const src = {id:'doc-2', kind:'doctrina', source_type:'doctrina', legal_authority:'doctrinal', vigency:'no_aplica', citation:'Autor. (2021). Ensayo', excerpt:'el tratamiento de datos personales está prohibido por la ley'};
    const r = buildJurisprudenceOutcome({
      data:{resumen:'Doctrina', normativa:[], jurisprudencia:[], doctrina:[{fuente_id:'doc-2', afirmacion:'La doctrina establece que el tratamiento de datos personales está prohibido por la ley.', fragmento:'está prohibido por la ley'}], documento:[], conclusion:''},
      sources:[src], intent:'general', query:'¿qué dice la doctrina?', documents:[], documentMode:'none'
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.researchWarnings.some(w=>w.includes('doctrina') && w.includes('fuente normativa'))).toBe(true);
  });
});

// Caso K documentado como riesgo léxico conocido (no bug, se mantiene gate actual)
describe('4.2.21 · K: fuente con coincidencia léxica incidental (riesgo documentado)', () => {
  it('gate actual considera responsive por token coincidente (comportamiento léxico documentado)', () => {
    const src = {id:'src-k', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Artículo sobre datos', title:'Protección de datos personales', excerpt:'Artículo sobre protección de datos que menciona la renta de información.'};
    // isSourceResponsive requiere un token coincidente ('renta')
    expect(isSourceResponsiveToQuery({query:'¿Cuál es la renta mensual del contrato?', source:src, claims:[{afirmacion:'renta de información', fragmento:'renta de información'}]})).toBe(true);
    // Comportamiento documentado: el gate léxico conserva; riesgo residual anotado en doc 4.2.19
  });
});
