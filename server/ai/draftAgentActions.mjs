import { z } from 'zod';
import { buildChatSystemPrompt } from './legalChatPrompt.mjs';

export const COMPARISON_TABLE_LIMITS = {
  minColumns: 2,
  maxColumns: 6,
  minRows: 1,
  maxRows: 8,
  maxCellChars: 300,
  maxTitleChars: 160,
};

const tableText = (max) => z.string().trim().min(1).max(max);

export const ComparisonTableSchema = z
  .object({
    title: tableText(COMPARISON_TABLE_LIMITS.maxTitleChars),
    columns: z
      .array(tableText(COMPARISON_TABLE_LIMITS.maxCellChars))
      .min(COMPARISON_TABLE_LIMITS.minColumns)
      .max(COMPARISON_TABLE_LIMITS.maxColumns),
    rows: z
      .array(
        z
          .array(z.string().trim().max(COMPARISON_TABLE_LIMITS.maxCellChars))
          .min(COMPARISON_TABLE_LIMITS.minColumns)
          .max(COMPARISON_TABLE_LIMITS.maxColumns)
      )
      .min(COMPARISON_TABLE_LIMITS.minRows)
      .max(COMPARISON_TABLE_LIMITS.maxRows),
  })
  .superRefine((table, ctx) => {
    table.rows.forEach((row, index) => {
      if (row.length !== table.columns.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rows', index],
          message: 'Cada fila debe tener exactamente una celda por columna.',
        });
      }
    });
  });

export const ComparisonTableResponseSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(z.unknown()).default([]),
  table: ComparisonTableSchema,
});

/**
 * Prompt del chat normal + contrato específico de tabla comparativa.
 * El modelo entrega DATOS, nunca HTML: el cliente construye el HTML seguro.
 */
export function buildComparisonTableSystemPrompt() {
  return `${buildChatSystemPrompt({ mode: 'case' })}

TAREA ESPECÍFICA: TABLA COMPARATIVA

IGNORA el contrato JSON anterior. Para esta solicitud debes devolver EXCLUSIVAMENTE un objeto JSON válido con esta forma:
{
  "answer": string,
  "sources": [{ "document_id": string, "file_name": string, "fragment_id"?: string, "evidence"?: string }],
  "table": {
    "title": string,
    "columns": string[],
    "rows": string[][]
  }
}

Reglas de la tabla:
1. "columns" define los criterios de comparación: entre ${COMPARISON_TABLE_LIMITS.minColumns} y ${COMPARISON_TABLE_LIMITS.maxColumns} columnas.
2. "rows" contiene entre ${COMPARISON_TABLE_LIMITS.minRows} y ${COMPARISON_TABLE_LIMITS.maxRows} filas; cada fila debe tener exactamente una celda por columna.
3. Cada celda y cada columna son texto plano de máximo ${COMPARISON_TABLE_LIMITS.maxCellChars} caracteres. No uses HTML, Markdown, saltos de línea, atributos ni estilos.
4. "title" es un título breve de máximo ${COMPARISON_TABLE_LIMITS.maxTitleChars} caracteres.
5. Usa únicamente hechos verificables del contexto. Si falta un dato, escribe "[POR COMPLETAR: dato faltante]"; no inventes.
6. "answer" es una introducción breve (1-3 frases) que explique qué compara la tabla y qué limitaciones tiene.
7. "sources" sigue las mismas reglas de verificación del chat: solo documentos del contexto.
8. No agregues texto, comentarios ni bloques Markdown fuera del JSON.`;
}

export function parseComparisonTableResponse(value) {
  const parsed = ComparisonTableResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
