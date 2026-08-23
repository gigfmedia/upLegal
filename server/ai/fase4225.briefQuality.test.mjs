import { describe, it, expect } from 'vitest';
import { buildJurisprudenceOutcome } from './jurisprudencePipeline.mjs';

const doc = (id, text, overrides={}) => ({ id, original_filename:`${id}.pdf`, extracted_text:text, workspace_id:'w1', lawyer_id:'l1', status:'ready', ...overrides });
const baseDoc = () => doc('doc-4225-1', `CONTRATO DE ARRIENDO
Arrendadora: María López.
Arrendatario: Jorge Pérez.
La renta mensual es de $500.000.
El contrato comenzó el 1 de enero de 2026.
La garantía corresponde a $500.000.
El contrato tiene una duración de doce meses.
La cláusula QUINTA contempla el término anticipado con aviso de 60 días.`);

// A monto
describe('4.2.25 A monto',()=>{
  it('claim renta mensual → brief útil',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'La renta mensual es de $500.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta mensual es de $500.000.', fragmento:'La renta mensual es de $500.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'document'});
    expect(r.outcome).toBe('SUCCESS');
    expect(r.resumenFinal).toContain('500.000');
    expect(r.briefFallbackUsed).toBe(false);
  });
  it('ultra-corta El canon es $500.000 → fallback a claim verificado',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'El canon es $500.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta mensual es de $500.000.', fragmento:'La renta mensual es de $500.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'document'});
    expect(r.outcome).toBe('SUCCESS');
    expect(r.resumenFinal).toContain('500.000');
    expect(r.briefFallbackUsed).toBe(true);
    expect(r.persistedSources[0].claims[0].afirmacion).toBe('La renta mensual es de $500.000.');
  });
});
// B fecha
describe('4.2.25 B fecha',()=>{
  it('claim fecha → brief',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'El contrato comenzó el 1 de enero de 2026.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El contrato comenzó el 1 de enero de 2026.', fragmento:'El contrato comenzó el 1 de enero de 2026.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuándo comenzó el contrato?', documents:[d], documentMode:'document'});
    expect(r.resumenFinal).toContain('2026');
  });
});
// C duración
describe('4.2.25 C duración',()=>{
  it('duración doce meses',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'El contrato tiene una duración de doce meses.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'El contrato tiene una duración de doce meses.', fragmento:'El contrato tiene una duración de doce meses.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuánto dura el contrato?', documents:[d], documentMode:'document'});
    expect(r.resumenFinal).toContain('doce meses');
  });
});
// D rol
describe('4.2.25 D rol',()=>{
  it('partes',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'María López es arrendadora y Jorge Pérez es arrendatario.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'María López es arrendadora y Jorge Pérez es arrendatario.', fragmento:'Arrendadora: María López. Arrendatario: Jorge Pérez.'}], conclusion:''}, sources:[], intent:'general', query:'¿Quiénes son las partes?', documents:[d], documentMode:'document'});
    expect(r.resumenFinal).toContain('María López');
    expect(r.resumenFinal).toContain('Jorge Pérez');
  });
});
// E cláusula
describe('4.2.25 E cláusula',()=>{
  it('cláusula QUINTA',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'La cláusula QUINTA contempla el término anticipado con aviso de 60 días.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La cláusula QUINTA contempla el término anticipado con aviso de 60 días.', fragmento:'La cláusula QUINTA contempla el término anticipado con aviso de 60 días.'}], conclusion:''}, sources:[], intent:'general', query:'¿Existe una cláusula de término anticipado?', documents:[d], documentMode:'document'});
    expect(r.resumenFinal).toContain('QUINTA');
  });
});
// F ausencia
describe('4.2.25 F ausencia',()=>{
  it('sin claim → NO_EVIDENCE, no fallback',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'Existe daños al inmueble.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'Existe daños al inmueble.', fragmento:'Existe daños al inmueble.'}], conclusion:''}, sources:[], intent:'general', query:'¿El contrato menciona daños al inmueble?', documents:[d], documentMode:'document'});
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.briefFallbackUsed).toBe(false);
  });
});
// Evidencia validación
describe('4.2.25 evidencia',()=>{
  it('source_id inválido → no fallback',()=>{
    const d=baseDoc();
    // Claim con document_id inexistente será descartado, sin claim verificado → no fallback
    const r=buildJurisprudenceOutcome({data:{resumen:'El canon es $500.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:'no-existe', afirmacion:'La renta es $500.000.', fragmento:'La renta es $500.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'});
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.briefFallbackUsed).toBe(false);
  });
  it('claim descartado por monto incorrecto → no fallback',()=>{
    const d=doc('doc-1','La renta es de $500.000.');
    const r=buildJurisprudenceOutcome({data:{resumen:'El canon es $700.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta es de $700.000.', fragmento:'La renta es de $700.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'});
    expect(r.outcome).toBe('NO_EVIDENCE');
    expect(r.briefFallbackUsed).toBe(false);
  });
});
// Mixed
describe('4.2.25 mixed',()=>{
  it('document + irrelevante → solo document',()=>{
    const d=baseDoc();
    const src={id:'irrel', kind:'jurisprudencia', source_type:'jurisprudencia', legal_authority:'persuasiva', vigency:'no_aplica', citation:'Datos', title:'Datos', excerpt:'Datos'};
    const r=buildJurisprudenceOutcome({data:{resumen:'La renta es $500.000.', normativa:[], jurisprudencia:[{fuente_id:'irrel', afirmacion:'Datos es fundamental.', fragmento:'Datos es fundamental.'}], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta mensual es de $500.000.', fragmento:'La renta mensual es de $500.000.'}], conclusion:''}, sources:[src], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'mixed'});
    expect(r.persistedSources.some(s=>s.id==='irrel')).toBe(false);
    expect(r.resumenFinal).toContain('500.000');
  });
  it('documentMode none no usa fallback documental',()=>{
    const r=buildJurisprudenceOutcome({data:{resumen:'El canon es $500.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[], documentMode:'none'});
    expect(r.briefFallbackUsed).toBe(false);
    expect(r.outcome).toBe('NO_EVIDENCE');
  });
});
// NO_EVIDENCE intacto
describe('4.2.25 NO_EVIDENCE',()=>{
  it('sin claim → NO_EVIDENCE',()=>{
    const r=buildJurisprudenceOutcome({data:{resumen:'Nada', normativa:[], jurisprudencia:[], doctrina:[], documento:[], conclusion:''}, sources:[], intent:'general', query:'¿test?', documents:[], documentMode:'none'});
    expect(r.outcome).toBe('NO_EVIDENCE');
  });
});
// Anti-alucinación
describe('4.2.25 anti-alucinación',()=>{
  it('brief con multa inventada → solo claim',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'La renta mensual es de $500.000. Existe una multa de $2.000.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta mensual es de $500.000.', fragmento:'La renta mensual es de $500.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'});
    expect(r.resumenFinal).toContain('500.000');
    expect(r.resumenFinal).not.toContain('2.000.000');
    expect(r.resumenFinal).not.toContain('multa');
  });
});
// Ultra-corta regresión
describe('4.2.25 ultra-corta regresión',()=>{
  it('claim La renta mensual del inmueble es de $500.000. + brief El canon es $500.000. → fallback a claim',()=>{
    const d=doc('doc-uc','La renta mensual del inmueble es de $500.000.');
    const r=buildJurisprudenceOutcome({data:{resumen:'El canon es $500.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta mensual del inmueble es de $500.000.', fragmento:'La renta mensual del inmueble es de $500.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta mensual?', documents:[d], documentMode:'document'});
    expect(r.briefFallbackUsed).toBe(true);
    expect(r.resumenFinal).toBe('La renta mensual del inmueble es de $500.000.');
    expect(r.persistedSources[0].claims[0].afirmacion).toBe('La renta mensual del inmueble es de $500.000.');
  });
});
// Attribution
describe('4.2.25 attribution',()=>{
  it('coverage 1 cuando fallback usado',()=>{
    const d=baseDoc();
    const r=buildJurisprudenceOutcome({data:{resumen:'El canon es $500.000.', normativa:[], jurisprudencia:[], doctrina:[], documento:[{document_id:d.id, afirmacion:'La renta mensual es de $500.000.', fragmento:'La renta mensual es de $500.000.'}], conclusion:''}, sources:[], intent:'general', query:'¿Cuál es la renta?', documents:[d], documentMode:'document'});
    expect(r.attributionCoverage).toBe(1);
    expect(r.persistedSources[0].claims[0].verified).toBe(true);
  });
});
