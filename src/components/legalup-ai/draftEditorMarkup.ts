// FASE 4.62C — conversión de borradores legacy (markdown) al formato editor.
// Regla dura: escape-first. El contenido jurídico nunca se interpreta como
// HTML crudo; solo se promueven a etiquetas los constructos de la lista
// blanca (heading, negrita, cursiva, listas). Todo lo demás queda como texto
// visible. Sin dangerouslySetInnerHTML en producción: la salida alimenta el
// schema de TipTap, que descarta etiquetas no permitidas.
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

function inlineFormat(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^\w*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\w*])/g, '$1<em>$2</em>');
  return out;
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string }
  | { kind: 'bullet'; items: string[] }
  | { kind: 'ordered'; items: string[] }
  | { kind: 'paragraph'; text: string };

function parseBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  const pushItem = (kind: 'bullet' | 'ordered', text: string) => {
    const cur = blocks[blocks.length - 1];
    if (cur?.kind === kind) cur.items.push(text);
    else blocks.push({ kind, items: [text] });
  };
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      continue;
    }
    const bullet = /^[-•]\s+(.+)$/.exec(line);
    if (bullet) { pushItem('bullet', bullet[1]); continue; }
    const ordered = /^(\d+[.)])\s+(.+)$/.exec(line);
    if (ordered) { pushItem('ordered', ordered[2]); continue; }
    const prev = blocks[blocks.length - 1];
    if (prev?.kind === 'paragraph') prev.text = `${prev.text}\n${line}`;
    else blocks.push({ kind: 'paragraph', text: line });
  }
  return blocks;
}

function blockHtml(block: Block): string {
  if (block.kind === 'heading') {
    return `<h${block.level}>${inlineFormat(block.text)}</h${block.level}>`;
  }
  if (block.kind === 'bullet') {
    return `<ul>${block.items.map((i) => `<li>${inlineFormat(i)}</li>`).join('')}</ul>`;
  }
  if (block.kind === 'ordered') {
    return `<ol>${block.items.map((i) => `<li>${inlineFormat(i)}</li>`).join('')}</ol>`;
  }
  return `<p>${block.text
    .split('\n')
    .map((l) => inlineFormat(l))
    .join('<br>')}</p>`;
}

/** Convierte el markdown de generación/legacy en HTML aceptado por TipTap. */
export function convertDraftMarkdownToHtml(markdown: string): string {
  return parseBlocks(markdown)
    .map(blockHtml)
    .join('');
}

/** Texto plano (fallback de portapapeles y previews ligeros). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h1|h2|h3|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
