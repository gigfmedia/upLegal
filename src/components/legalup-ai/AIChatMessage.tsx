import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, User, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AIChatMessage as ChatMessage } from '@/hooks/useAIChat';
import { useTypewriter } from '@/hooks/useTypewriter';
import { EvidenceNavigator, type EvidenceReference } from './EvidenceNavigator';

const USER_ENTRY_MS = 220;
const ASSISTANT_ENTRY_S = 0.25;
const SECONDARY_DELAY_AFTER_MS = 120;

const EASE = [0.25, 0.1, 0.25, 1] as const;

type Block =
  | { type: 'p'; text: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] };

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Renderiza inline safe: **negrita**, *cursiva* y `código`, sin HTML arbitrario. */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={index}>{escapeHtml(part.slice(2, -2))}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-900"
        >
          {escapeHtml(part.slice(1, -1))}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{escapeHtml(part.slice(1, -1))}</em>;
    }
    return <span key={index}>{escapeHtml(part)}</span>;
  });
}

/** Parsea Markdown básico (listas, negrita, encabezados) en bloques seguros. */
function parseMarkdown(content: string): Block[] {
  const blocks: Block[] = [];
  let list: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flush = () => {
    if (list) {
      blocks.push({ type: list.type, items: list.items });
      list = null;
    }
  };

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd();
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);

    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
    } else if (bullet || numbered) {
      if (!list || list.type !== (numbered ? 'ol' : 'ul')) {
        flush();
        list = { type: numbered ? 'ol' : 'ul', items: [] };
      }
      list.items.push((bullet || numbered)![1]);
    } else if (line.trim() === '') {
      flush();
    } else {
      flush();
      blocks.push({ type: 'p', text: line });
    }
  }
  flush();
  return blocks;
}

function splitSentencesForEvidence(text: string): string[] {
  return String(text || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function findEvidenceForSentence(sentence: string, sources: Array<{ document_id: string; file_name: string; fragment_id?: string | null; evidence?: string | null }>) {
  const normSentence = sentence.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const src of sources) {
    if (!src.fragment_id || !src.evidence) continue;
    const normEvidence = String(src.evidence).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 40);
    if (normEvidence && normSentence.includes(normEvidence.slice(0, 20))) return src;
  }
  return null;
}

function MarkdownText({ content, sources, onEvidenceClick }: { content: string; sources?: Array<{ document_id: string; file_name: string; fragment_id?: string | null; evidence?: string | null; page_number?: number | null }>; onEvidenceClick?: (src: { document_id: string; file_name: string; fragment_id?: string | null; evidence?: string | null; page_number?: number | null }) => void }) {
  const blocks = parseMarkdown(content);

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const headingClass =
            block.level === 1 ? 'text-base font-semibold' : 'text-sm font-semibold';
          return (
            <p key={index} className={headingClass}>
              {renderInline(block.text)}
            </p>
          );
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const ListTag = block.type === 'ul' ? 'ul' : 'ol';
          return (
            <ListTag key={index} className="ml-4 list-disc space-y-1">
              {block.items.map((item, itemIndex) => {
                const evidence = sources ? findEvidenceForSentence(item, sources) : null;
                return (
                  <li key={itemIndex} className="leading-relaxed">
                    {renderInline(item)}
                    {evidence && onEvidenceClick && (
                      <button type="button" onClick={() => onEvidenceClick(evidence)} className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline">
                        <FileText className="h-3 w-3" /> Ver evidencia
                      </button>
                    )}
                  </li>
                );
              })}
            </ListTag>
          );
        }
        const evidence = sources ? findEvidenceForSentence(block.text, sources) : null;
        return (
          <p key={index} className="leading-relaxed">
            {renderInline(block.text)}
            {evidence && onEvidenceClick && (
              <button type="button" onClick={() => onEvidenceClick(evidence)} className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline">
                <FileText className="h-3 w-3" /> Ver evidencia
              </button>
            )}
          </p>
        );
      })}
    </div>
  );
}

type AIChatMessageProps = {
  message: Pick<ChatMessage, 'role' | 'content' | 'metadata' | 'created_at'>;
  /** true solo para respuestas que llegan en vivo; las del historial se muestran completas. */
  animate?: boolean;
};

export function AIChatMessage({ message, animate = true }: AIChatMessageProps) {
  const reducedMotion = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [evidenceRef, setEvidenceRef] = useState<EvidenceReference | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const isAssistant = message.role === 'assistant';
  const sources = message.metadata?.sources ?? [];

  // Efecto de escritura progresiva: el backend devuelve la respuesta completa y
  // el frontend la revela poco a poco (como ChatGPT). Solo se anima cuando la
  // burbuja llega en vivo (prop animate), no al recargar la página (historial).
  // Con reduced-motion, texto corto o historial, se muestra de inmediato.
  const typed = useTypewriter(isAssistant ? message.content : '', {
    disabled: reducedMotion || !animate,
  });
  const secondaryDelay = isAssistant
    ? (reducedMotion ? 0 : typed.durationMs / 1000) + SECONDARY_DELAY_AFTER_MS / 1000
    : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* sin permisos de portapapeles: se ignora */
    }
  };

  if (isAssistant) {
    return (
      <motion.div
        className="flex items-start gap-3"
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ASSISTANT_ENTRY_S, ease: EASE }}
      >
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
            <MarkdownText
              content={typed.text}
              sources={sources as Array<{ document_id: string; file_name: string; fragment_id?: string | null; evidence?: string | null; page_number?: number | null }>}
              onEvidenceClick={(src) => {
                setEvidenceRef({
                  documentId: src.document_id,
                  sourceId: src.document_id,
                  fragmentId: src.fragment_id ?? null,
                  pageNumber: src.page_number ?? null,
                  evidence: src.evidence || '',
                  sourceType: 'document',
                  documentFilename: src.file_name,
                });
                setEvidenceOpen(true);
              }}
            />
            {!typed.done && !reducedMotion && (
              <motion.span
                className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-green-700"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            )}
          </div>

          {sources.length > 0 && (
            <motion.div
              className="mt-2"
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: secondaryDelay, duration: 0.3, ease: EASE }}
            >
              <p className="text-xs font-medium text-gray-500">Fuentes utilizadas:</p>
              <ul className="mt-1 space-y-1">
                {sources.map((source, index) => (
                  <li key={index} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green-600" />
                    <span>{source.file_name}</span>
                    {source.fragment_id && source.evidence && (
                      <button
                        type="button"
                        onClick={() => {
                          setEvidenceRef({
                            documentId: source.document_id,
                            sourceId: source.document_id,
                            fragmentId: source.fragment_id ?? null,
                            pageNumber: source.page_number ?? null,
                            evidence: source.evidence || '',
                            sourceType: 'document',
                            documentFilename: source.file_name,
                          });
                          setEvidenceOpen(true);
                        }}
                        className="ml-2 inline-flex items-center gap-1 text-[0.7rem] font-medium text-green-700 hover:underline"
                      >
                        <FileText className="h-3 w-3" /> Ver evidencia
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <motion.div
            className="mt-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: secondaryDelay, duration: 0.25 }}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1 px-2 text-xs text-gray-500 hover:text-gray-900"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copiar
                </>
              )}
            </Button>
          </motion.div>
          <EvidenceNavigator open={evidenceOpen} onOpenChange={setEvidenceOpen} reference={evidenceRef} surface="chat" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex items-start justify-end gap-3"
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: USER_ENTRY_MS / 1000, ease: 'easeOut' }}
    >
      <div className="min-w-0 max-w-[85%]">
        <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-green-900 px-4 py-3 text-sm text-white shadow-sm">
          {message.content}
        </div>
      </div>
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <User className="h-4 w-4" aria-hidden="true" />
      </span>
    </motion.div>
  );
}
