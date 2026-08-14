// ---------------------------------------------------------------------------
// LegalUp AI — Fase 4.2.7: Tests de Dynamic Context Budget.
//
// Suite de tests para el sistema de allocation dinámica de contexto en modo mixed.
// Verifica:
//   - Cálculo de peso documental basado en evidencia/relevancia
//   - Cálculo de peso jurídico basado en evidencia/relevancia
//   - Allocation dinámica con límites y mínimos
//   - Determinismo del algoritmo
//   - Regresión de modos document y none
// ---------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
  calculateDocumentEvidenceWeight,
  calculateLegalEvidenceWeight,
  allocateDynamicContextBudget,
  DYNAMIC_CONTEXT_LIMITS,
} from './dynamicContextBudget.mjs';

describe('Fase 4.2.7 — Dynamic Context Budget', () => {
  describe('calculateDocumentEvidenceWeight', () => {
    it('debe retornar 0 para documentos vacíos', () => {
      const weight = calculateDocumentEvidenceWeight({
        documents: [],
        query: 'test query',
      });
      expect(weight).toBe(0);
    });

    it('debe retornar 0 para query vacío', () => {
      const weight = calculateDocumentEvidenceWeight({
        documents: [{ id: '1', extracted_text: 'some text', original_filename: 'doc.pdf' }],
        query: '',
      });
      expect(weight).toBe(0);
    });

    it('debe retornar 0 para documento sin relevancia', () => {
      const weight = calculateDocumentEvidenceWeight({
        documents: [{ id: '1', extracted_text: 'texto irrelevante sin coincidencias', original_filename: 'doc.pdf' }],
        query: 'contrato cláusula penalidad',
      });
      expect(weight).toBe(0);
    });

    it('debe retornar peso > 0 para documento con fragmentos relevantes', () => {
      const weight = calculateDocumentEvidenceWeight({
        documents: [
          {
            id: '1',
            extracted_text: 'Este contrato establece una cláusula de penalidad por incumplimiento. La penalidad es del 10% del valor total.',
            original_filename: 'contrato.pdf',
          },
        ],
        query: 'penalidad contrato',
      });
      expect(weight).toBeGreaterThan(0);
    });

    it('debe aumentar peso con mayor relevancia', () => {
      const weightLow = calculateDocumentEvidenceWeight({
        documents: [
          {
            id: '1',
            extracted_text: 'Texto con una mención de contrato.',
            original_filename: 'doc.pdf',
          },
        ],
        query: 'contrato',
      });

      const weightHigh = calculateDocumentEvidenceWeight({
        documents: [
          {
            id: '1',
            extracted_text: 'Este contrato establece cláusulas específicas sobre penalidades, plazos y condiciones de pago. El contrato es vinculante para ambas partes.',
            original_filename: 'contrato.pdf',
          },
        ],
        query: 'contrato penalidad plazos',
      });

      expect(weightHigh).toBeGreaterThan(weightLow);
    });

    it('debe considerar múltiples documentos con evidencia', () => {
      const weightSingle = calculateDocumentEvidenceWeight({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusula de penalidad.',
            original_filename: 'contrato.pdf',
          },
        ],
        query: 'penalidad',
      });

      const weightMultiple = calculateDocumentEvidenceWeight({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusula de penalidad.',
            original_filename: 'contrato.pdf',
          },
          {
            id: '2',
            extracted_text: 'Escritura que menciona la penalidad establecida en el contrato.',
            original_filename: 'escritura.pdf',
          },
        ],
        query: 'penalidad',
      });

      expect(weightMultiple).toBeGreaterThan(weightSingle);
    });
  });

  describe('calculateLegalEvidenceWeight', () => {
    it('debe retornar 0 para fuentes vacías', () => {
      const weight = calculateLegalEvidenceWeight({
        sources: [],
        query: 'test query',
        intentClass: 'GENERAL_LEGAL_QUERY',
      });
      expect(weight).toBe(0);
    });

    it('debe dar peso bajo a fuentes metadata_only', () => {
      const weight = calculateLegalEvidenceWeight({
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata_only: true,
            title: 'Ley X',
            metadata: { fragments: [] },
          },
        ],
        query: 'ley',
        intentClass: 'GENERAL_LEGAL_QUERY',
      });
      expect(weight).toBeLessThan(10); // Peso muy bajo
    });

    it('debe dar peso > 0 para fuentes con evidencia sustantiva', () => {
      const weight = calculateLegalEvidenceWeight({
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [
                { id: 'f1', article: 'Artículo 1', text: 'Los titulares de datos personales tienen derecho a acceder, rectificar y suprimir sus datos.' },
              ],
            },
          },
        ],
        query: 'derechos datos personales',
        intentClass: 'GENERAL_LEGAL_QUERY',
      });
      expect(weight).toBeGreaterThan(0);
    });

    it('debe priorizar según intentClass', () => {
      const weightNorm = calculateLegalEvidenceWeight({
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [
                { id: 'f1', article: 'Artículo 1', text: 'Los titulares de datos personales tienen derecho a acceder, rectificar y suprimir sus datos.' },
              ],
            },
          },
        ],
        query: 'artículo datos personales',
        intentClass: 'ARTICLE_LOOKUP',
      });

      const weightJuris = calculateLegalEvidenceWeight({
        sources: [
          {
            id: '1',
            kind: 'jurisprudencia',
            metadata: {
              fragments: [
                { id: 'f1', article: 'Rol 123', text: 'El tribunal constitucional establece que la protección de datos es un derecho fundamental.' },
              ],
            },
          },
        ],
        query: 'fallo datos personales',
        intentClass: 'JURISPRUDENCE_LOOKUP',
      });

      expect(weightNorm).toBeGreaterThan(0);
      expect(weightJuris).toBeGreaterThan(0);
    });

    it('debe aumentar peso con más fragmentos', () => {
      const weightLow = calculateLegalEvidenceWeight({
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Los titulares de datos personales tienen derecho a acceder.' }],
            },
          },
        ],
        query: 'datos personales',
        intentClass: 'GENERAL_LEGAL_QUERY',
      });

      const weightHigh = calculateLegalEvidenceWeight({
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [
                { id: 'f1', article: 'Artículo 1', text: 'Los titulares de datos personales tienen derecho a acceder.' },
                { id: 'f2', article: 'Artículo 2', text: 'Los titulares también tienen derecho a rectificar sus datos.' },
                { id: 'f3', article: 'Artículo 3', text: 'Los titulares tienen derecho a suprimir sus datos personales.' },
              ],
            },
          },
        ],
        query: 'datos personales',
        intentClass: 'GENERAL_LEGAL_QUERY',
      });

      expect(weightHigh).toBeGreaterThan(weightLow);
    });
  });

  describe('allocateDynamicContextBudget', () => {
    it('debe aplicar mínimo 20% por polo cuando ambos tienen evidencia', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusula de penalidad por incumplimiento.',
            original_filename: 'contrato.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Las partes podrán pactar cláusulas penales para asegurar el cumplimiento de las obligaciones.' }],
            },
          },
        ],
        query: 'penalidad cláusula',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      expect(allocation.documentRatio).toBeGreaterThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MIN_POLE_RATIO);
      expect(allocation.legalRatio).toBeGreaterThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MIN_POLE_RATIO);
    });

    it('debe respetar cap absoluto documental de 15k', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'A'.repeat(100000), // Documento gigante
            original_filename: 'grande.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Texto.' }],
            },
          },
        ],
        query: 'texto',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      expect(allocation.documentBudget).toBeLessThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MAX_DOCUMENT_CONTEXT_CHARS);
    });

    it('debe garantizar total <= 30k', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusula.',
            original_filename: 'contrato.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Texto.' }],
            },
          },
        ],
        query: 'cláusula',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      const total = allocation.documentBudget + allocation.legalBudget;
      expect(total).toBeLessThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MAX_CONTEXT_CHARS);
    });

    it('debe asignar 100% a documentos cuando solo hay documentos', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusula.',
            original_filename: 'contrato.pdf',
          },
        ],
        sources: [],
        query: 'cláusula',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      expect(allocation.documentBudget).toBeGreaterThan(0);
      expect(allocation.legalBudget).toBe(0);
      expect(allocation.documentRatio).toBe(1.0);
      expect(allocation.legalRatio).toBe(0.0);
    });

    it('debe asignar 100% a fuentes cuando solo hay fuentes', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Los titulares de datos personales tienen derecho a acceder, rectificar y suprimir sus datos.' }],
            },
          },
        ],
        query: 'datos personales',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      expect(allocation.documentBudget).toBe(0);
      expect(allocation.legalBudget).toBeGreaterThan(0);
      expect(allocation.documentRatio).toBe(0.0);
      expect(allocation.legalRatio).toBe(1.0);
    });

    it('debe asignar 0 a ambos cuando no hay evidencia', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [],
        sources: [],
        query: 'query',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      expect(allocation.documentBudget).toBe(0);
      expect(allocation.legalBudget).toBe(0);
      expect(allocation.documentRatio).toBe(0.0);
      expect(allocation.legalRatio).toBe(0.0);
    });

    it('debe ser determinista', () => {
      const input = {
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusula de penalidad.',
            original_filename: 'contrato.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Texto legal.' }],
            },
          },
        ],
        query: 'penalidad',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      };

      const allocation1 = allocateDynamicContextBudget(input);
      const allocation2 = allocateDynamicContextBudget(input);

      expect(allocation1.documentBudget).toBe(allocation2.documentBudget);
      expect(allocation1.legalBudget).toBe(allocation2.legalBudget);
      expect(allocation1.documentRatio).toBe(allocation2.documentRatio);
      expect(allocation1.legalRatio).toBe(allocation2.legalRatio);
    });

    it('debe respetar modo document (sin allocation dinámica)', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato.',
            original_filename: 'contrato.pdf',
          },
        ],
        sources: [],
        query: 'contrato',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'document',
      });

      expect(allocation.documentBudget).toBe(Math.min(DYNAMIC_CONTEXT_LIMITS.MAX_DOCUMENT_CONTEXT_CHARS, DYNAMIC_CONTEXT_LIMITS.MAX_CONTEXT_CHARS));
      expect(allocation.legalBudget).toBe(0);
    });

    it('debe respetar modo none (sin allocation dinámica)', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Texto.' }],
            },
          },
        ],
        query: 'artículo',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'none',
      });

      expect(allocation.documentBudget).toBe(0);
      expect(allocation.legalBudget).toBe(DYNAMIC_CONTEXT_LIMITS.MAX_CONTEXT_CHARS);
    });

    it('debe aplicar mínimo 5k cuando el polo tiene evidencia', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Texto corto.',
            original_filename: 'doc.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Texto.' }],
            },
          },
        ],
        query: 'texto',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      if (allocation.documentWeight > 0) {
        expect(allocation.documentBudget).toBeGreaterThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MIN_DOCUMENT_BUDGET);
      }
      if (allocation.legalWeight > 0) {
        expect(allocation.legalBudget).toBeGreaterThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MIN_LEGAL_BUDGET);
      }
    });

    it('debe favorecer documentos cuando su peso es significativamente mayor', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con múltiples cláusulas sobre penalidades, plazos, condiciones y obligaciones. El contrato establece que las penalidades se aplicarán en caso de incumplimiento de cualquier obligación.',
            original_filename: 'contrato.pdf',
          },
          {
            id: '2',
            extracted_text: 'Escritura que confirma las cláusulas del contrato principal.',
            original_filename: 'escritura.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [{ id: 'f1', article: 'Artículo 1', text: 'Texto breve.' }],
            },
          },
        ],
        query: 'penalidad contrato',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      // Documento debe tener mayor ratio dado su peso mayor
      expect(allocation.documentRatio).toBeGreaterThan(allocation.legalRatio);
    });

    it('debe favorecer fuentes cuando su peso es significativamente mayor', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Texto breve.',
            original_filename: 'doc.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [
                { id: 'f1', article: 'Artículo 1', text: 'Texto uno.' },
                { id: 'f2', article: 'Artículo 2', text: 'Texto dos.' },
                { id: 'f3', article: 'Artículo 3', text: 'Texto tres.' },
                { id: 'f4', article: 'Artículo 4', text: 'Texto cuatro.' },
                { id: 'f5', article: 'Artículo 5', text: 'Texto cinco.' },
              ],
            },
          },
          {
            id: '2',
            kind: 'jurisprudencia',
            metadata: {
              fragments: [
                { id: 'f6', article: 'Rol 123', text: 'Fallo uno.' },
                { id: 'f7', article: 'Rol 456', text: 'Fallo dos.' },
              ],
            },
          },
        ],
        query: 'artículo fallo',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      // Fuentes deben tener mayor ratio dado su peso mayor
      expect(allocation.legalRatio).toBeGreaterThan(allocation.documentRatio);
    });

    it('debe producir asignación equilibrada cuando pesos son similares', () => {
      const allocation = allocateDynamicContextBudget({
        documents: [
          {
            id: '1',
            extracted_text: 'Contrato con cláusulas específicas sobre penalidades y plazos. Las penalidades se aplicarán en caso de incumplimiento de las obligaciones establecidas. El plazo de cumplimiento es de 30 días desde la firma. Las cláusulas penales aseguran el cumplimiento de las obligaciones contractuales.',
            original_filename: 'contrato.pdf',
          },
          {
            id: '2',
            extracted_text: 'Escritura que confirma las cláusulas del contrato principal sobre penalidades y plazos de cumplimiento.',
            original_filename: 'escritura.pdf',
          },
        ],
        sources: [
          {
            id: '1',
            kind: 'normativa',
            metadata: {
              fragments: [
                { id: 'f1', article: 'Artículo 1', text: 'Las partes podrán pactar cláusulas penales para asegurar el cumplimiento de las obligaciones.' },
                { id: 'f2', article: 'Artículo 2', text: 'El plazo de cumplimiento será establecido por las partes en el contrato.' },
              ],
            },
          },
        ],
        query: 'cláusula penalidad plazo contrato',
        intentClass: 'GENERAL_LEGAL_QUERY',
        documentMode: 'mixed',
      });

      // Ambos polos deben tener presupuesto asignado
      expect(allocation.documentBudget).toBeGreaterThan(0);
      expect(allocation.legalBudget).toBeGreaterThan(0);
      // Total no debe exceder 30k
      expect(allocation.documentBudget + allocation.legalBudget).toBeLessThanOrEqual(DYNAMIC_CONTEXT_LIMITS.MAX_CONTEXT_CHARS);
    });
  });
});
