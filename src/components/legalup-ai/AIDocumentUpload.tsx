import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import posthog from 'posthog-js';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useUploadAIDocument,
  MAX_DOCUMENT_SIZE_BYTES,
  type AIDocument,
} from '@/hooks/useAIDocuments';

type AIDocumentUploadProps = {
  workspaceId: string;
  onUploaded: (doc: AIDocument) => void;
};

export function AIDocumentUpload({ workspaceId, onUploaded }: AIDocumentUploadProps) {
  const upload = useUploadAIDocument(workspaceId);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

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

      posthog.capture('ai_document_upload_started');

      upload.mutate(file, {
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
    [upload, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
    disabled: upload.isPending,
  });

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
          {upload.isPending ? 'Subiendo…' : 'Sube un PDF de tu caso'}
        </p>
        <p className="text-xs text-muted-foreground">o arrástralo aquí</p>
      </div>
      <p className="text-xs text-muted-foreground">Solo PDF · máx. 20 MB</p>
    </div>
  );
}
