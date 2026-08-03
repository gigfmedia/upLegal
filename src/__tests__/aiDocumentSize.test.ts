import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MAX_DOCUMENT_SIZE_BYTES,
  isDocumentOverMaxSize,
  isStorageSizeLimitError,
  toFriendlyUploadError,
} from '@/lib/aiDocumentLimits';

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260803000200_ai_documents_bucket_size_limit.sql'
);

describe('Límite de 20 MB de documentos LegalUp AI', () => {
  it('Caso 1: PDF menor a 20 MB es permitido', () => {
    expect(isDocumentOverMaxSize(MAX_DOCUMENT_SIZE_BYTES - 1)).toBe(false);
    expect(isDocumentOverMaxSize(5 * 1024 * 1024)).toBe(false);
  });

  it('Caso 2: PDF exactamente en el límite (20 MB) es permitido', () => {
    expect(isDocumentOverMaxSize(MAX_DOCUMENT_SIZE_BYTES)).toBe(false);
  });

  it('Caso 3: PDF superior a 20 MB es rechazado', () => {
    expect(isDocumentOverMaxSize(MAX_DOCUMENT_SIZE_BYTES + 1)).toBe(true);
    expect(isDocumentOverMaxSize(25 * 1024 * 1024)).toBe(true);
  });

  it('Caso 4: aunque se manipule el frontend, la infraestructura mantiene el límite real', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    // El bucket impone 20 MB server-side en Supabase Storage.
    expect(sql).toContain("'ai-documents'");
    expect(sql).toContain('20971520');
    expect(sql).toContain('20 MB en bytes');
    // El bucket se mantiene privado (public = false) y solo acepta PDF.
    expect(sql).toContain("array['application/pdf']");
    expect(sql).toMatch(/ai-documents',\s*\n\s*'ai-documents',\s*\n\s*false,/);
    expect(sql).toContain('public = excluded.public');
    expect(sql).not.toContain('public = true');

    // La constante del frontend está sincronizada con el límite de la infraestructura.
    expect(MAX_DOCUMENT_SIZE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_DOCUMENT_SIZE_BYTES).toBe(20971520);
  });

  it('Caso 4b: un rechazo de Storage por tamaño se muestra como error amigable', () => {
    const storageError = {
      statusCode: '413',
      message: 'The object exceeded the maximum allowed size',
    };
    expect(isStorageSizeLimitError(storageError)).toBe(true);
    expect(toFriendlyUploadError(storageError).message).toBe(
      'El documento supera el tamaño máximo permitido de 20 MB.'
    );
    expect(toFriendlyUploadError(storageError).message).not.toMatch(
      /supabase|table|bucket|status|stack/i
    );
  });

  it('Otros errores de Storage no filtran detalles internos ni el límite de tamaño', () => {
    const otherError = { statusCode: '400', message: 'invalid file type' };
    expect(isStorageSizeLimitError(otherError)).toBe(false);
    expect(toFriendlyUploadError(otherError).message).toBe(
      'No se pudo subir el PDF. Inténtalo de nuevo.'
    );
  });

  it('Caso 4c: variantes del mensaje de "archivo demasiado grande" se detectan', () => {
    expect(
      isStorageSizeLimitError({ statusCode: '400', message: 'payload too large' })
    ).toBe(true);
    expect(
      isStorageSizeLimitError({ statusCode: '413' })
    ).toBe(true);
    expect(isStorageSizeLimitError(null)).toBe(false);
    expect(isStorageSizeLimitError({})).toBe(false);
  });
});
