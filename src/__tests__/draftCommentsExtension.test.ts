import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { buildDraftCommentAnchor } from '@/components/legalup-ai/draftCommentAnchor';
import { DraftComments, draftCommentsPluginKey } from '@/components/legalup-ai/draftCommentsExtension';
import type { DraftComment } from '@/hooks/useDraftComments';

function makeComment(anchor: DraftComment['anchor'], over: Partial<DraftComment> = {}): DraftComment {
  return {
    id: 'c1',
    draft_id: 'd1',
    lawyer_id: 'u1',
    lawyer_case_id: 'case1',
    workspace_id: 'ws1',
    body: 'Revisar esta afirmación.',
    author: 'ai',
    status: 'open',
    anchor,
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
    resolved_at: null,
    ...over,
  };
}

describe('UA-5.2 — decoraciones de comentarios', () => {
  let editor: Editor | null = null;

  afterEach(() => {
    editor?.destroy();
    editor = null;
  });

  it('resalta el fragmento sin agregarlo al HTML persistido', () => {
    editor = new Editor({
      extensions: [StarterKit, DraftComments],
      content: '<p>Se notificó al demandado el 3 de enero.</p>',
    });
    const built = buildDraftCommentAnchor(editor.state.doc, 1, 15);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    editor.view.dispatch(
      editor.state.tr
        .setMeta(draftCommentsPluginKey, [makeComment(built.anchor)])
        .setMeta('addToHistory', false)
    );

    const highlight = editor.view.dom.querySelector('.draft-comment-highlight');
    expect(highlight).not.toBeNull();
    expect(editor.view.dom.querySelector('[data-draft-comment-id="c1"]')).not.toBeNull();
    expect(highlight?.getAttribute('style')).not.toContain('cursor');
    expect(editor.getHTML()).toBe('<p>Se notificó al demandado el 3 de enero.</p>');
    expect(editor.getHTML()).not.toContain('draft-comment');
  });

  it('no decora anclas huérfanas ni comentarios resueltos', () => {
    editor = new Editor({
      extensions: [StarterKit, DraftComments],
      content: '<p>Texto original.</p>',
    });
    const built = buildDraftCommentAnchor(editor.state.doc, 1, 6);
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    editor.view.dispatch(
      editor.state.tr
        .setMeta(draftCommentsPluginKey, [
          makeComment({ ...built.anchor, quote: 'fragmento inexistente', prefix: '', suffix: '', start_hint: 1, end_hint: 2 }),
          makeComment(built.anchor, { id: 'c2', status: 'resolved' }),
        ])
        .setMeta('addToHistory', false)
    );

    expect(editor.view.dom.querySelector('.draft-comment-highlight')).toBeNull();
    expect(editor.getHTML()).toBe('<p>Texto original.</p>');
  });
});
