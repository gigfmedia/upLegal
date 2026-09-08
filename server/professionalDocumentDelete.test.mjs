// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Helper that mirrors the fixed removeDocument logic
async function handleDelete({ currentDocumentUrl, bucket, userId, folder, storageRemove, onUpload }) {
  if (!currentDocumentUrl) {
    await onUpload('', '');
    return { status: 'cleared_no_document' };
  }
  const oldFileName = currentDocumentUrl.split('/').pop();
  if (oldFileName) {
    const { error } = await storageRemove(`${userId}/${folder}/${oldFileName}`);
    if (error) {
      const msg = String(error.message || '').toLowerCase();
      const isNotFound = msg.includes('not found') || msg.includes('does not exist') || msg.includes('no such');
      if (!isNotFound) throw error;
    }
  }
  try {
    await onUpload('', '');
  } catch (e) {
    throw new Error('db_cleanup_failed');
  }
  return { status: 'deleted' };
}

describe('FASE 3F — professional document delete', () => {
  it('happy path: storage success + DB success', async () => {
    const onUpload = vi.fn(async () => {});
    const storageRemove = vi.fn(async () => ({ error: null }));
    const res = await handleDelete({
      currentDocumentUrl: 'https://x.supabase.co/storage/v1/object/public/documents/user1/documents/file.pdf',
      bucket: 'documents', userId: 'user1', folder: 'documents',
      storageRemove, onUpload,
    });
    expect(storageRemove).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith('', '');
    expect(res.status).toBe('deleted');
  });

  it('ReferenceError regression: file no longer contains setFileName', () => {
    const src = readFileSync(new URL('../src/components/ui/document-upload.tsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/\bsetFileName\s*\(/);
    // ensure fixed logic exists
    expect(src).toContain('setPreviewUrl(null)');
    expect(src).toContain("onUpload('', '')");
  });

  it('storage failure → DB not cleared', async () => {
    const onUpload = vi.fn(async () => {});
    const storageRemove = vi.fn(async () => ({ error: { message: 'storage error' } }));
    await expect(handleDelete({
      currentDocumentUrl: 'https://x/documents/user1/documents/file.pdf',
      bucket: 'documents', userId: 'user1', folder: 'documents',
      storageRemove, onUpload,
    })).rejects.toThrow();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('DB failure after storage success → no success', async () => {
    const onUpload = vi.fn(async () => { throw new Error('db error'); });
    const storageRemove = vi.fn(async () => ({ error: null }));
    await expect(handleDelete({
      currentDocumentUrl: 'https://x/documents/user1/documents/file.pdf',
      bucket: 'documents', userId: 'user1', folder: 'documents',
      storageRemove, onUpload,
    })).rejects.toThrow('db_cleanup_failed');
  });

  it('retry after partial delete: storage already missing → still clears DB', async () => {
    const onUpload = vi.fn(async () => {});
    const storageRemove = vi.fn(async () => ({ error: { message: 'Not found' } }));
    const res = await handleDelete({
      currentDocumentUrl: 'https://x/documents/user1/documents/file.pdf',
      bucket: 'documents', userId: 'user1', folder: 'documents',
      storageRemove, onUpload,
    });
    expect(res.status).toBe('deleted');
    expect(onUpload).toHaveBeenCalled();
  });

  it('no document → idempotent no-op', async () => {
    const onUpload = vi.fn(async () => {});
    const storageRemove = vi.fn();
    const res = await handleDelete({
      currentDocumentUrl: '', bucket: 'documents', userId: 'user1', folder: 'documents',
      storageRemove, onUpload,
    });
    expect(storageRemove).not.toHaveBeenCalled();
    expect(onUpload).toHaveBeenCalledWith('', '');
    expect(res.status).toBe('cleared_no_document');
  });
});
