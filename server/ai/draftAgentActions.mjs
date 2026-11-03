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

// UA-5.2 — comentarios anclados a una selección real del borrador.
// El modelo devuelve sugerencias estructuradas; el cliente decide dónde
// anclarlas (quote + contexto) y solo persiste tras aceptación explícita.
export const DRAFT_COMMENT_LIMITS = {
  maxPerDraft: 100,
  maxBodyChars: 2000,
  maxAnchorQuoteChars: 2000,
  maxSuggestionQuoteChars: 500,
  maxSuggestions: 5,
  maxAnchorContextChars: 200,
};

export const DraftCommentAnchorSchema = z
  .object({
    // El quote es la selección literal: se valida sin recortar espacios porque
    // el cliente construye prefix/suffix/hints sobre el texto original.
    quote: z
      .string()
      .max(DRAFT_COMMENT_LIMITS.maxAnchorQuoteChars)
      .refine((value) => value.trim().length > 0, {
        message: 'El fragmento citado no puede estar vacío.',
      }),
    prefix: z.string().max(DRAFT_COMMENT_LIMITS.maxAnchorContextChars).default(''),
    suffix: z.string().max(DRAFT_COMMENT_LIMITS.maxAnchorContextChars).default(''),
    start_hint: z.number().int().min(0).optional(),
    end_hint: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((anchor, ctx) => {
    if (
      typeof anchor.start_hint === 'number' &&
      typeof anchor.end_hint === 'number' &&
      anchor.end_hint < anchor.start_hint
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_hint'],
        message: 'end_hint no puede ser menor que start_hint.',
      });
    }
  });

export const DraftCommentCreateSchema = z
  .object({
    body: z.string().trim().min(1).max(DRAFT_COMMENT_LIMITS.maxBodyChars),
    anchor: DraftCommentAnchorSchema,
    // Las sugerencias aceptadas desde el Agent AI conservan autoría 'ai'; los
    // comentarios manuales (si se añaden en el futuro) usan 'lawyer' por defecto.
    author: z.enum(['lawyer', 'ai']).optional(),
  })
  .strict();

export const DraftCommentUpdateSchema = z
  .object({
    body: z.string().trim().min(1).max(DRAFT_COMMENT_LIMITS.maxBodyChars).optional(),
    status: z.enum(['open', 'resolved', 'dismissed']).optional(),
    anchor: DraftCommentAnchorSchema.optional(),
  })
  .strict()
  .refine((value) => value.body !== undefined || value.status !== undefined || value.anchor !== undefined, {
    message: 'Debes indicar al menos un cambio.',
  });

export const DraftCommentSuggestionSchema = z
  .object({
    quote: z.string().trim().min(1).max(DRAFT_COMMENT_LIMITS.maxSuggestionQuoteChars),
    comment: z.string().trim().min(1).max(DRAFT_COMMENT_LIMITS.maxBodyChars),
  })
  .strict();

export const DraftCommentsResponseSchema = z.object({
  answer: z.string().min(1),
  sources: z.array(z.unknown()).default([]),
  comments: z
    .array(DraftCommentSuggestionSchema)
    .min(1)
    .max(DRAFT_COMMENT_LIMITS.maxSuggestions),
});

/**
 * Prompt del chat normal + contrato específico de comentarios sobre selección.
 * El modelo NO reescribe el documento: solo señala problemas/observaciones
 * sobre fragmentos textuales de la selección citada.
 */
export function buildDraftCommentsSystemPrompt() {
  return `${buildChatSystemPrompt({ mode: 'case' })}

TAREA ESPECÍFICA: COMENTARIOS SOBRE UNA SELECCIÓN DEL BORRADOR

IGNORA el contrato JSON anterior. Para esta solicitud debes devolver EXCLUSIVAMENTE un objeto JSON válido con esta forma:
{
  "answer": string,
  "sources": [{ "document_id": string, "file_name": string, "fragment_id"?: string, "evidence"?: string }],
  "comments": [
    { "quote": string, "comment": string }
  ]
}

Reglas de los comentarios:
1. Devuelve entre 1 y ${DRAFT_COMMENT_LIMITS.maxSuggestions} comentarios.
2. "quote" debe ser un fragmento EXACTO, literal y contiguo del texto seleccionado; máximo ${DRAFT_COMMENT_LIMITS.maxSuggestionQuoteChars} caracteres. No parafrasees ni inventes texto.
3. "comment" es una observación jurídica o editorial accionable, en español, de máximo ${DRAFT_COMMENT_LIMITS.maxBodyChars} caracteres. No reescribas el documento completo ni propongas reemplazos largos.
4. No repitas comentarios equivalentes sobre el mismo fragmento. Prioriza riesgos, ambigüedades, omisiones y mejoras concretas.
5. "answer" es una introducción breve (1-2 frases) que indique qué revisaste.
6. "sources" sigue las mismas reglas de verificación del chat: solo documentos del contexto.
7. No agregues texto, comentarios ni bloques Markdown fuera del JSON.`;
}

export function parseDraftCommentsResponse(value) {
  const parsed = DraftCommentsResponseSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
