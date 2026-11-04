// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import {
  DRAFT_COMMENT_MAX_QUOTE_CHARS,
  buildDraftCommentAnchor,
  collectDraftCommentTextblocks,
  isSuggestionInsideAnchor,
  resolveDraftCommentAnchor,
} from '@/components/legalup-ai/draftCommentAnchor';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { content: 'inline*', group: 'block' },
    heading: { content: 'inline*', group: 'block', attrs: { level: { default: 1 } } },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline' },
  },
  marks: {},
});

const paragraph = (text: string) => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const docWith = (...texts: string[]) => schema.node('doc', null, texts.map(paragraph));

describe('UA-5.2 draft comment anchor', () => {
  it('construye quote + contexto + hints desde una selección de un solo bloque', () => {
    const doc = docWith('Hola mundo cruel');
    const result = buildDraftCommentAnchor(doc, 6, 11);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.anchor.quote).toBe('mundo');
    expect(result.anchor.prefix).toBe('Hola ');
    expect(result.anchor.suffix).toBe(' cruel');
    expect(result.anchor.start_hint).toBe(6);
    expect(result.anchor.end_hint).toBe(11);
  });

  it('rechaza selecciones vacías', () => {
    const doc = docWith('Hola');
    expect(buildDraftCommentAnchor(doc, 1, 1)).toEqual({ ok: false, error: 'empty' });
    expect(buildDraftCommentAnchor(doc, 1, 3).ok).toBe(true);
  });

  it('preserva espacios iniciales/finales y resuelve el anchor de ida y vuelta', () => {
    const cases = [
      { text: 'Hola mundo ', from: 1, to: 12, quote: 'Hola mundo ' },
      { text: ' Hola mundo', from: 1, to: 12, quote: ' Hola mundo' },
      { text: '  Hola mundo  ', from: 1, to: 14, quote: '  Hola mundo ' },
    ];
    for (const item of cases) {
      const doc = docWith(item.text);
      const built = buildDraftCommentAnchor(doc, item.from, item.to);
      expect(built.ok).toBe(true);
      if (!built.ok) continue;
      expect(built.anchor.quote).toBe(item.quote);
      expect(resolveDraftCommentAnchor(doc, built.anchor)).toEqual({
        status: 'anchored',
        from: item.from,
        to: item.to,
      });
    }
  });

  it('conserva un salto de línea manual (Shift+Enter) en quote y resolución', () => {
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, [
        schema.text('foo'),
        schema.nodes.hardBreak.create(),
        schema.text('bar'),
      ]),
    ]);
    const built = buildDraftCommentAnchor(doc, 1, 8);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.anchor.quote).toBe('foo\nbar');
    expect(collectDraftCommentTextblocks(doc)[0]?.text).toBe('foo\nbar');
    expect(resolveDraftCommentAnchor(doc, built.anchor)).toEqual({
      status: 'anchored',
      from: 1,
      to: 8,
    });
    expect(isSuggestionInsideAnchor(built.anchor.quote, 'foo bar')).toBe(true);
  });

  it('reutiliza los bloques extraídos sin alterar la resolución', () => {
    const doc = docWith('Hola mundo', 'mundo final');
    const blocks = collectDraftCommentTextblocks(doc);
    const anchor = { quote: 'mundo', prefix: 'Hola ', suffix: '', start_hint: 6, end_hint: 11 };
    expect(resolveDraftCommentAnchor(doc, anchor, blocks)).toEqual({ status: 'anchored', from: 6, to: 11 });
  });

  it('rechaza selecciones que exceden el máximo del servidor', () => {
    const doc = docWith('x'.repeat(DRAFT_COMMENT_MAX_QUOTE_CHARS + 1));
    expect(buildDraftCommentAnchor(doc, 1, DRAFT_COMMENT_MAX_QUOTE_CHARS + 2)).toEqual({
      ok: false,
      error: 'too_long',
    });
  });

  it('rechaza selecciones que cruzan bloques', () => {
    const doc = docWith('Uno', 'Dos');
    const result = buildDraftCommentAnchor(doc, 1, 7);
    expect(result).toEqual({ ok: false, error: 'cross_block' });
  });

  it('resuelve una única coincidencia dentro del documento', () => {
    const doc = docWith('Hola mundo cruel');
    const built = buildDraftCommentAnchor(doc, 6, 11);
    if (!built.ok) throw new Error('anchor');
    expect(resolveDraftCommentAnchor(doc, built.anchor)).toEqual({ status: 'anchored', from: 6, to: 11 });
  });

  it('marca huérfano cuando el fragmento ya no existe', () => {
    const original = docWith('Hola mundo cruel');
    const built = buildDraftCommentAnchor(original, 6, 11);
    if (!built.ok) throw new Error('anchor');
    expect(resolveDraftCommentAnchor(docWith('Hola país cruel'), built.anchor)).toEqual({ status: 'orphaned' });
  });

  it('usa el contexto para desambiguar coincidencias repetidas', () => {
    const doc = docWith('mundo A', 'mundo B');
    const anchor = { quote: 'mundo', prefix: '', suffix: ' A', start_hint: 1, end_hint: 6 };
    expect(resolveDraftCommentAnchor(doc, anchor)).toEqual({ status: 'anchored', from: 1, to: 6 });
  });

  it('no elige en silencio cuando hay coincidencias empatadas', () => {
    const doc = docWith('mundo A', 'mundo A');
    const anchor = { quote: 'mundo', prefix: '', suffix: ' A', start_hint: 999, end_hint: 1004 };
    expect(resolveDraftCommentAnchor(doc, anchor)).toEqual({ status: 'ambiguous' });
  });

  it('conserva la posición exacta original sin reanclar a otra coincidencia', () => {
    const doc = docWith('mundo A', 'mundo A');
    const anchor = { quote: 'mundo', prefix: '', suffix: ' A', start_hint: 10, end_hint: 15 };
    expect(resolveDraftCommentAnchor(doc, anchor)).toEqual({ status: 'anchored', from: 10, to: 15 });
  });

  it('valida que una cita sugerida pertenezca a la selección real', () => {
    expect(isSuggestionInsideAnchor('El plazo vence el viernes', 'plazo vence')).toBe(true);
    expect(isSuggestionInsideAnchor('El plazo vence el viernes', 'otra cosa')).toBe(false);
  });
});
