import { useState } from 'react';
import { Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  useDeleteAIDocument,
  formatFileSize,
  type AIDocumentListItem,
} from '@/hooks/useAIDocuments';
import { AIDocumentStatusBadge, AIAnalysisStatusBadge } from './AIDocumentStatus';
import { AIDocumentPreviewDialog } from './AIDocumentPreviewDialog';

type AIDocumentListProps = {
  documents: AIDocumentListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function AIDocumentList({ documents, selectedId, onSelect }: AIDocumentListProps) {
  const deleteMutation = useDeleteAIDocument();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<AIDocumentListItem | null>(null);

  const handleDelete = (doc: AIDocumentListItem) => {
    setConfirmingId(doc.id);
    deleteMutation.mutate(doc, {
      onSuccess: () => {
        toast.success('Documento eliminado', { description: doc.original_filename });
      },
      onError: (error) => {
        toast.error(error.message || 'No se pudo eliminar el documento.');
      },
      onSettled: () => setConfirmingId(null),
    });
  };

  if (documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        Aún no hay documentos en este caso. Sube el primer PDF para comenzar.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2">
      {documents.map((doc) => {
        const isSelected = doc.id === selectedId;
        const isConfirming = confirmingId === doc.id;
        return (
          <li key={doc.id}>
            <div
              className={cn(
                'rounded-lg border p-3 transition-colors',
                isSelected ? 'border-green-600 bg-green-50/50' : 'cursor-pointer hover:bg-gray-50'
              )}
              onClick={() => onSelect(doc.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-green-900 text-green-600">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {doc.original_filename}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size_bytes)}</span>
                      {doc.page_count != null && <span>{doc.page_count} páginas</span>}
                      {doc.model && <span>Modelo: {doc.model}</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <AIDocumentStatusBadge status={doc.status} />
                      <AIAnalysisStatusBadge status={doc.analysis_status} />
                    </div>
                    {doc.analysis_error && (
                      <p className="mt-1 text-xs text-destructive">{doc.analysis_error}</p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Ver PDF"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    title="Eliminar"
                    onClick={() => handleDelete(doc)}
                    disabled={deleteMutation.isPending && confirmingId === doc.id}
                  >
                    {isConfirming ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>

    <AIDocumentPreviewDialog
      doc={previewDoc}
      open={previewDoc !== null}
      onOpenChange={(open) => {
        if (!open) setPreviewDoc(null);
      }}
    />
    </>
  );
}
