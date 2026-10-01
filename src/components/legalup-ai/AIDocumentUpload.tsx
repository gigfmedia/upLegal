import { useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import posthog from 'posthog-js';
import { FileText, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useUploadAIDocument,
  MAX_DOCUMENT_SIZE_BYTES,
  type AIDocument,
} from '@/hooks/useAIDocuments';

type AIDocumentUploadProps = {
  workspaceId?: string;
  ensureWorkspace?: () => Promise<string>;
  onUploaded: (doc: AIDocument) => void;
  compact?: boolean;
  disabled?: boolean;
};

export function AIDocumentUpload({ workspaceId, ensureWorkspace, onUploaded, compact = false, disabled = false }: AIDocumentUploadProps) {
  const upload = useUploadAIDocument(workspaceId || ensureWorkspace);
  const busy = useRef(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || busy.current || disabled) return;

      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF.');
        return;
      }
      if (file.size <= 0) {
        toast.error('El archivo está vacío.');
        return;
      }
      if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
        toast.error('El PDF no puede superar los 20 MB.');
        return;
      }

      busy.current = true;
      posthog.capture('ai_document_upload_started');

      upload.mutate(file, {
        onSettled: () => { busy.current = false; },
        onSuccess: (doc) => {
          posthog.capture('ai_document_uploaded', { file_size_bytes: doc.file_size_bytes });
          toast.success('Documento subido', { description: doc.original_filename });
          onUploaded(doc);
        },
        onError: (error) => {
          toast.error(error.message || 'No se pudo subir el documento.');
        },
      });
    },
    [upload, onUploaded, disabled]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: upload.isPending || disabled,
  });

  if (compact) return (
    <div>
      <input {...getInputProps({ 'aria-label': 'Seleccionar PDF del caso' })} />
      <Button type="button" onClick={open} disabled={upload.isPending || disabled}>
        {upload.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
        {upload.isPending ? 'Preparando y subiendo…' : 'Subir documento'}
      </Button>
    </div>
  );

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        upload.isPending
          ? 'cursor-not-allowed bg-gray-50 opacity-70'
          : 'cursor-pointer hover:border-gray-400',
        isDragActive && !upload.isPending ? 'border-green-600 bg-green-50/60' : 'border-gray-300'
      )}
    >
      <input {...getInputProps()} />
      {upload.isPending ? (
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" aria-hidden="true" />
      ) : (
        <FileText className="h-8 w-8 text-gray-400" aria-hidden="true" />
      )}
      <div>
        <p className="text-sm font-medium">
          {upload.isPending ? 'Preparando y subiendo documento…' : 'Sube un PDF de tu caso'}
        </p>
        <p className="text-xs text-muted-foreground">o arrástralo aquí</p>
      </div>
      <p className="text-xs text-muted-foreground">Solo PDF · máx. 20 MB</p>
    </div>
  );
}
