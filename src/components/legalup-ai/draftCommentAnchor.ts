import type { Node as PMNode } from '@tiptap/pm/model';

// UA-5.2 — anclaje textual V1 de comentarios.
//
// El comentario se ancla a UNA selección dentro de un único textblock
// (párrafo, título, ítem de lista o celda). El ancla guarda el texto exacto
// (`quote`) más contexto corto a izquierda/derecha y las posiciones originales
// como pistas. La resolución es determinista:
// - una coincidencia con el mejor contexto => anclado;
// - varias coincidencias empatadas => ambiguo (no se elige una en silencio);
// - ninguna coincidencia => huérfano.
// Las pistas NUNCA se usan para mover un ancla a otro fragmento: solo
// desempatan si coinciden exactamente con la posición original.

export const DRAFT_COMMENT_CONTEXT_CHARS = 32;
// Debe coincidir con DRAFT_COMMENT_LIMITS.maxAnchorQuoteChars del servidor.
export const DRAFT_COMMENT_MAX_QUOTE_CHARS = 2000;
export const DRAFT_COMMENT_MAX_PER_DRAFT = 100;

export type DraftCommentAnchor = {
  quote: string;
  prefix: string;
  suffix: string;
  start_hint: number;
  end_hint: number;
};

export type BuildDraftCommentAnchorResult =
  | { ok: true; anchor: DraftCommentAnchor }
  | { ok: false; error: 'empty' | 'cross_block' | 'invalid' | 'too_long' };

export type ResolveDraftCommentAnchorResult =
  | { status: 'anchored'; from: number; to: number }
  | { status: 'orphaned' }
  | { status: 'ambiguous' };

type Textblock = {
  start: number;
  end: number;
  text: string;
};

function textblockText(node: PMNode): string {
  return node.textBetween(0, node.content.size, '\n', (leaf) => (
    leaf.type.name === 'hardBreak' ? '\n' : ''
  ));
}

// Los documentos de ProseMirror son inmutables: el mismo nodo conserva el
// mismo índice hasta que una transacción lo reemplaza. Cachear por documento
// evita recorrer el árbol dos veces por tecla (decoraciones + panel).
const textblocksByDoc = new WeakMap<PMNode, Textblock[]>();

/** Bloques de texto con posición absoluta de su primer carácter. */
export function collectDraftCommentTextblocks(doc: PMNode): Textblock[] {
  const cached = textblocksByDoc.get(doc);
  if (cached) return cached;

  const blocks: Textblock[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    blocks.push({
      start: pos + 1,
      end: pos + node.nodeSize - 1,
      text: textblockText(node),
    });
    return false;
  });
  textblocksByDoc.set(doc, blocks);
  return blocks;
}

export function buildDraftCommentAnchor(
  doc: PMNode,
  from: number,
  to: number,
): BuildDraftCommentAnchorResult {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to <= from) {
    return { ok: false, error: 'empty' };
  }
  const $from = doc.resolve(from);
  const $to = doc.resolve(to);
  if (!$from.parent.isTextblock || !$from.sameParent($to)) {
    return { ok: false, error: 'cross_block' };
  }

  const blockStart = $from.start();
  const blockText = textblockText($from.parent);
  const localFrom = from - blockStart;
  const localTo = to - blockStart;
  const quote = blockText.slice(localFrom, localTo);
  if (!quote.trim()) return { ok: false, error: 'empty' };
  if (localFrom < 0 || localTo > blockText.length) return { ok: false, error: 'invalid' };
  if (quote.length > DRAFT_COMMENT_MAX_QUOTE_CHARS) return { ok: false, error: 'too_long' };

  return {
    ok: true,
    anchor: {
      quote,
      prefix: blockText.slice(Math.max(0, localFrom - DRAFT_COMMENT_CONTEXT_CHARS), localFrom),
      suffix: blockText.slice(localTo, localTo + DRAFT_COMMENT_CONTEXT_CHARS),
      start_hint: from,
      end_hint: to,
    },
  };
}

function matchesContext(
  blockText: string,
  index: number,
  quoteLength: number,
  prefix: string,
  suffix: string,
): { matches: boolean; score: number } {
  const beforeStart = index - prefix.length;
  if (beforeStart < 0) return { matches: false, score: 0 };
  const before = blockText.slice(beforeStart, index);
  if (before !== prefix) return { matches: false, score: 0 };

  const afterStart = index + quoteLength;
  const after = blockText.slice(afterStart, afterStart + suffix.length);
  if (after !== suffix) return { matches: false, score: 0 };

  return { matches: true, score: prefix.length + suffix.length };
}

/** Resuelve el ancla contra el documento ACTUAL sin modificar el comentario. */
export function resolveDraftCommentAnchor(
  doc: PMNode,
  anchor: Pick<DraftCommentAnchor, 'quote' | 'prefix' | 'suffix' | 'start_hint' | 'end_hint'>,
  textblocks?: Textblock[],
): ResolveDraftCommentAnchorResult {
  const quote = anchor.quote;
  if (!quote) return { status: 'orphaned' };

  type Candidate = { from: number; to: number; score: number; exactPosition: boolean };
  const candidates: Candidate[] = [];

  for (const block of textblocks ?? collectDraftCommentTextblocks(doc)) {
    let index = block.text.indexOf(quote);
    while (index !== -1) {
      const context = matchesContext(block.text, index, quote.length, anchor.prefix, anchor.suffix);
      if (context.matches) {
        const from = block.start + index;
        candidates.push({
          from,
          to: from + quote.length,
          score: context.score,
          exactPosition: from === anchor.start_hint && from + quote.length === anchor.end_hint,
        });
      }
      index = block.text.indexOf(quote, index + 1);
    }
  }

  if (candidates.length === 0) return { status: 'orphaned' };
  if (candidates.length === 1) return { status: 'anchored', from: candidates[0].from, to: candidates[0].to };

  const exact = candidates.find((candidate) => candidate.exactPosition);
  if (exact) return { status: 'anchored', from: exact.from, to: exact.to };

  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  if (sorted[0].score > sorted[1].score) {
    return { status: 'anchored', from: sorted[0].from, to: sorted[0].to };
  }
  return { status: 'ambiguous' };
}

/** Valida que una cita sugerida por la IA pertenezca a la selección real. */
export function isSuggestionInsideAnchor(anchorQuote: string, suggestionQuote: string): boolean {
  const normalizedAnchor = anchorQuote.replace(/\s+/g, ' ').trim();
  const normalizedSuggestion = suggestionQuote.replace(/\s+/g, ' ').trim();
  return !!normalizedSuggestion && normalizedAnchor.includes(normalizedSuggestion);
}
