import { describe, it, expect } from 'vitest';
import { isSourceResponsiveToQuery } from './jurisprudenceSources.mjs';
import { buildJurisprudenceOutcome } from './jurisprudencePipeline.mjs';
import { checkDocumentClaimFacts } from './documentGrounding.mjs';

// Helpers
const doc = (id, text, overrides={}) => ({ id, original_filename:`${id}.pdf`, extracted_text:text, workspace_id:'w1', lawyer_id:'l1', status:'ready', ...overrides });
const contrato = () => doc('doc-4222-1','PRIMERA: El canon de arrendamiento mensual es de 500.000 pesos. SEGUNDA: El plazo es de doce meses. TERCERA: Garantía de 500.000 pesos. Partes: María González arrendadora y Jorge Pérez arrendatario. Se prohíbe subarrendar sin autorización.');

// K1 incidental — debe ser DROP
describe('4.2.22 K1 coincidencia incidental',()=>{
  it('renta mensual vs datos con mención incidental de renta → DROP',()=>{
    const src={id:'k1', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Protección de datos — Rol 1', title:'Protección de datos personales', excerpt:'Artículo sobre protección de datos que menciona renta de información.'};
    // Claim sobre datos, no sobre renta de arriendo → haystack sin renta
    expect(isSourceResponsiveToQuery({query:'¿Cuál es la renta mensual del contrato?', source:src, claims:[{afirmacion:'La protección de datos es un derecho fundamental.', fragmento:'protección de datos'}]})).toBe(false);
    const d=contrato();
    const r=buildJurisprudenceOutcome({
      data:{resumen:'El canon es 500.000', normativa:[], jurisprudencia:[{fuente_id:'k1', afirmacion:'La protección de datos es un derecho fundamental.', fragmento:'protección de datos'}], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon de arrendamiento mensual es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[src], intent:'general', query:'¿Cuál es la renta mensual del contrato?', documents:[d], documentMode:'mixed'
    });
    expect(r.persistedSources.some(s=>s.id==='k1')).toBe(false);
    expect(r.relevanceDroppedSources).toBe(1);
  });
});

// K2 sustantiva — KEEP
describe('4.2.22 K2 coincidencia sustantiva',()=>{
  it('renta mensual vs artículo sobre renta de arrendamiento → KEEP',()=>{
    const src={id:'k2', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Arriendo — Rol 2', title:'Renta de arrendamiento', excerpt:'Análisis de la renta mensual de arrendamiento.'};
    expect(isSourceResponsiveToQuery({query:'¿Cuál es la renta mensual?', source:src, claims:[{afirmacion:'La renta de arrendamiento es mensual.', fragmento:'renta de arrendamiento'}]})).toBe(true);
  });
});

// K3 sinónimo / variante morfológica — con token exacto debe ser KEEP
describe('4.2.22 K3 sinónimo',()=>{
  it('termina anticipadamente vs terminación anticipada con token exacto → KEEP',()=>{
    const src={id:'k3', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Terminación anticipada', title:'Termina anticipadamente el vínculo contractual', excerpt:'Termina anticipadamente el vínculo contractual.'};
    expect(isSourceResponsiveToQuery({query:'¿Cuándo termina anticipadamente el contrato?', source:src, claims:[{afirmacion:'Termina anticipadamente el vínculo contractual.', fragmento:'Termina anticipadamente'}]})).toBe(true);
  });
});

// K4 documento gana a fuente irrelevante
describe('4.2.22 K4 documento vs irrelevante',()=>{
  it('document claim KEEP, public irrelevante DROP',()=>{
    const d=contrato();
    const src={id:'k4', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Datos — Rol 9', title:'Protección de datos personales', excerpt:'Datos personales.'};
    const r=buildJurisprudenceOutcome({
      data:{resumen:'El canon de arrendamiento mensual es de 500.000 pesos.', normativa:[], jurisprudencia:[{fuente_id:'k4', afirmacion:'La protección de datos es fundamental.', fragmento:'protección de datos'}], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon de arrendamiento mensual es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[src], intent:'general', query:'¿Cuál es la renta mensual del contrato?', documents:[d], documentMode:'mixed'
    });
    expect(r.allVerifiedClaims.some(c=>c.category==='document')).toBe(true);
    expect(r.persistedSources.some(s=>s.id==='k4')).toBe(false);
  });
});

// K5 mixed relevante
describe('4.2.22 K5 mixed relevante',()=>{
  it('documento + fuente relevante coexisten',()=>{
    const d=doc('doc-k5','Garantía de 500.000 pesos. El contrato regula la garantía.');
    const src={id:'k5', kind:'normativa', source_type:'normativa', legal_authority:'vinculante', vigency:'desconocida', citation:'Ley de Arriendo — Garantía', title:'Garantía en arrendamiento', norm_type:'ley', norm_number:'21.000', excerpt:'La garantía en arrendamiento se regula. La garantía no puede exceder un mes de renta.', metadata:{fragments:[{id:'frag:k5:1', article:'Artículo 1', text:'La garantía en arrendamiento no puede exceder un mes de renta.'}]}};
    const r=buildJurisprudenceOutcome({
      data:{resumen:'Garantía', normativa:[{fuente_id:'k5', afirmacion:'La garantía no puede exceder un mes de renta.', fragmento:'La garantía no puede exceder un mes de renta.'}], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La garantía es de 500.000 pesos.', fragmento:'Garantía de 500.000 pesos.'}], conclusion:''},
      sources:[src], intent:'general', query:'¿Qué dice la garantía del contrato y qué establece la ley sobre garantía en arrendamiento?', documents:[d], documentMode:'mixed'
    });
    expect(r.persistedSources.some(s=>s.id===d.id)).toBe(true);
    expect(r.persistedSources.some(s=>s.id==='k5')).toBe(true);
  });
});

// K6 mixed irrelevante
describe('4.2.22 K6 mixed irrelevante',()=>{
  it('documento KEEP, fuente protección datos DROP',()=>{
    const d=doc('doc-k6','Garantía de 500.000 pesos.');
    const src={id:'k6', kind:'normativa', source_type:'normativa', legal_authority:'vinculante', vigency:'desconocida', citation:'Ley de Datos', title:'Protección de datos personales', norm_type:'ley', norm_number:'21.719', excerpt:'Datos personales.', metadata:{fragments:[{id:'frag:k6:1', article:'Artículo 4', text:'Derecho a acceso y protección de datos.'}]}};
    const r=buildJurisprudenceOutcome({
      data:{resumen:'Garantía de 500.000 pesos.', normativa:[{fuente_id:'k6', afirmacion:'El derecho a acceso protege datos.', fragmento:'derecho a acceso'}], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La garantía es de 500.000 pesos.', fragmento:'Garantía de 500.000'}], conclusion:''},
      sources:[src], intent:'general', query:'¿Qué garantía establece el contrato?', documents:[d], documentMode:'mixed'
    });
    expect(r.persistedSources.some(s=>s.id===d.id)).toBe(true);
    expect(r.persistedSources.some(s=>s.id==='k6')).toBe(false);
  });
});

// K7 normativa válida
describe('4.2.22 K7 normativa válida',()=>{
  it('plazo establece la ley → KEEP',()=>{
    const src={id:'k7', kind:'normativa', source_type:'normativa', legal_authority:'vinculante', vigency:'desconocida', citation:'Ley Arriendo — Plazo', title:'Plazo del arrendamiento', norm_type:'ley', norm_number:'18.101', excerpt:'El plazo del arrendamiento es de doce meses.', metadata:{fragments:[{id:'frag:k7:1', article:'Artículo 1', text:'El plazo del arrendamiento es de doce meses.'}]}};
    expect(isSourceResponsiveToQuery({query:'¿Qué plazo establece la ley?', source:src, claims:[{afirmacion:'El plazo es de doce meses.', fragmento:'plazo es de doce meses'}]})).toBe(true);
  });
});

// K8 jurisprudencial válida
describe('4.2.22 K8 jurisprudencia válida',()=>{
  it('criterio tribunales → KEEP',()=>{
    const src={id:'k8', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Corte Suprema — Rol 123', title:'Criterio sobre terminación anticipada', excerpt:'Criterio de los tribunales sobre terminación anticipada.'};
    expect(isSourceResponsiveToQuery({query:'¿Qué criterio han utilizado los tribunales sobre terminación anticipada?', source:src, claims:[{afirmacion:'Los tribunales han señalado criterio sobre terminación.', fragmento:'criterio de los tribunales'}]})).toBe(true);
  });
});

// K9 coincidencia mínima
describe('4.2.22 K9 coincidencia mínima',()=>{
  it('inmueble incidental en artículo de datos → DROP',()=>{
    const src={id:'k9', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Datos — Rol 9', title:'Protección de datos personales', excerpt:'Artículo sobre datos que menciona inmueble incidentalmente.'};
    expect(isSourceResponsiveToQuery({query:'¿Puede subarrendarse el inmueble?', source:src, claims:[{afirmacion:'La protección de datos es fundamental.', fragmento:'protección de datos'}]})).toBe(false);
  });
});

// K10 documental sin fuente pública
describe('4.2.22 K10 documental sin fuente pública',()=>{
  it('SUCCESS documental sin fuentes públicas',()=>{
    const d=contrato();
    const r=buildJurisprudenceOutcome({
      data:{resumen:'El canon de arrendamiento mensual es de 500.000 pesos.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon de arrendamiento mensual es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'document'
    });
    expect(r.outcome).toBe('SUCCESS');
    expect(r.persistedSources.some(s=>s.kind==='document')).toBe(true);
  });
});

// Ultra-corta
describe('4.2.22 ultra-corta',()=>{
  it('resumen ultra-corto con claim exacto produce breve verificada (no fallback injustificado)',()=>{
    const d=doc('doc-ultra','El canon de arrendamiento mensual es de 500.000 pesos.');
    const r=buildJurisprudenceOutcome({
      data:{resumen:'El canon de arrendamiento mensual es de 500.000 pesos.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El canon de arrendamiento mensual es de 500.000 pesos.', fragmento:'canon de arrendamiento mensual es de 500.000'}], conclusion:''},
      sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'
    });
    expect(r.resumenFinal).toContain('500.000');
  });
});

// Frase genérica (caso 5 QA 4.2.21)
describe('4.2.22 frase genérica',()=>{
  it('frase genérica negativa sin claim no se presenta como hecho verificado',()=>{
    const r=buildJurisprudenceOutcome({
      data:{resumen:'La normativa vigente no especifica la renta.', normativa:[], jurisprudencia:[], doctrina:[], documento:[], conclusion:''},
      sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[], documentMode:'none'
    });
    expect(r.outcome).toBe('NO_EVIDENCE');
  });
});

// Anti-alucinación con checkDocumentClaimFacts
describe('4.2.22 anti-alucinación documental',()=>{
  it('monto distinto rechazado',()=>{
    expect(checkDocumentClaimFacts('El canon es de 700.000 pesos.', 'El canon es de 500.000 pesos.')).toBe('reject');
  });
  it('fecha distinta rechazada',()=>{
    expect(checkDocumentClaimFacts('El contrato comenzó el 1 de enero de 2025.', 'El contrato tendrá vigencia a partir del 01/01/2026.')).toBe('reject');
  });
  it('paráfrasis válida aceptada',()=>{
    expect(checkDocumentClaimFacts('El contrato comenzó el 1 de enero de 2026.', 'El presente contrato tendrá vigencia a partir del 01/01/2026.')).toBe('accept');
  });
});
