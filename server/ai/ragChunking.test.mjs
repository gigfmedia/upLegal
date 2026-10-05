import { describe, it, expect } from 'vitest';
import {
  RAG_CHUNKING_VERSION,
  RAG_CHUNK_MAX_CHARS,
  RAG_EXTRACTION_VERSION,
  chunkDocumentText,
  chunkSegment,
  detectHeading,
  sha256Hex,
  splitPages,
} from './ragChunking.mjs';

const RUT = '12.345.678-9';
const ARTICLE = 'artículo 1545 del Código Civil';
const DATE = '15 de marzo de 2026';
const RIT = 'RIT C-1234-2026';

describe('4.61B chunking determinista', () => {
  it('documento simple de 1 página: un chunk con heading', () => {
    const chunks = chunkDocumentText(`Contrato de arriendo\n\nLas partes acuerdan lo siguiente.`);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].heading).toBe('Contrato de arriendo');
    expect(chunks[0].page_start).toBeNull();
    expect(chunks[0].chunk_index).toBe(0);
    expect(chunks[0].content_hash).toHaveLength(64);
  });

  it('respeta límites de párrafo y empaqueta hasta target', () => {
    const paras = Array.from({ length: 5 }, (_, i) => `Párrafo ${i} `.repeat(60).trim());
    const chunks = chunkDocumentText(paras.join('\n\n'));
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(RAG_CHUNK_MAX_CHARS);
    // Índices secuenciales globales.
    expect(chunks.map((c) => c.chunk_index)).toEqual(chunks.map((_, i) => i));
  });

  it('párrafo gigante: split duro sin perder contenido', () => {
    const big = 'x'.repeat(5000);
    const chunks = chunkDocumentText(big);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((c) => c.content).join('').replace(/\s+/g, '')).toContain('x'.repeat(100));
    for (const c of chunks) expect(c.content.length).toBeLessThanOrEqual(RAG_CHUNK_MAX_CHARS);
  });

  it('solape entre chunks consecutivos', () => {
    const text = `${'a'.repeat(1500)}\n\n${'b'.repeat(1500)}\n\n${'c'.repeat(1500)}`;
    const chunks = chunkDocumentText(text, { targetChars: 1600 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[1].content).toContain('a'.repeat(100));
  });

  it('preserva tokens legales exactos sin normalizar', () => {
    const chunks = chunkDocumentText(`Comparece don Juan con RUT ${RUT}.\n\nSe invoca el ${ARTICLE}.\n\nCon fecha ${DATE}, causa ${RIT}.`);
    const joined = chunks.map((c) => c.content).join('\n');
    expect(joined).toContain(RUT);
    expect(joined).toContain(ARTICLE);
    expect(joined).toContain(DATE);
    expect(joined).toContain(RIT);
  });

  it('marcadores de página → page_start/page_end reales', () => {
    const text = `--- Página 1 ---\nTexto uno.\n\n--- Página 2 ---\nTexto dos.`;
    expect(splitPages(text)).toEqual([
      { page: 1, text: expect.stringContaining('Texto uno') },
      { page: 2, text: expect.stringContaining('Texto dos') },
    ]);
    const chunks = chunkDocumentText(text);
    expect(chunks[0].page_start).toBe(1);
    expect(chunks[chunks.length - 1].page_end).toBe(2);
  });

  it('sin marcadores: páginas NULL (nunca inventar)', () => {
    const chunks = chunkDocumentText('Texto sin marcadores de página.');
    expect(chunks[0].page_start).toBeNull();
    expect(chunks[0].page_end).toBeNull();
  });

  it('determinismo: mismo input, mismos chunks y hashes', () => {
    const text = `Demanda\n\n${'Hechos fundados. '.repeat(200)}`;
    const a = chunkDocumentText(text);
    const b = chunkDocumentText(text);
    expect(a).toEqual(b);
  });

  it('versiones explícitas', () => {
    expect(RAG_CHUNKING_VERSION).toBe('case-rag-chunk-v1');
    expect(RAG_EXTRACTION_VERSION).toBe('pdf-pages-v1');
  });

  it('sha256 estable de 64 chars', () => {
    expect(sha256Hex('hola')).toBe(sha256Hex('hola'));
    expect(sha256Hex('hola')).toHaveLength(64);
    expect(sha256Hex('hola')).not.toBe(sha256Hex('chao'));
  });

  it('heading null si la primera línea es larga', () => {
    expect(detectHeading('x'.repeat(200))).toBeNull();
    expect(detectHeading('')).toBeNull();
  });

  it('chunkSegment respeta maxChars', () => {
    const pieces = chunkSegment('a'.repeat(5000), { targetChars: 1000, maxChars: 1000 });
    for (const p of pieces) expect(p.length).toBeLessThanOrEqual(1000);
  });
});
