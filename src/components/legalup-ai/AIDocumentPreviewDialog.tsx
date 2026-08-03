import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { getAIDocumentSignedUrl, type AIDocumentListItem } from '@/hooks/useAIDocuments';

type AIDocumentPreviewDialogProps = {
  doc: AIDocumentListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Vista previa inline del PDF usando una URL firmada (expira en 1 hora). */
export function AIDocumentPreviewDialog({
  doc,
  open,
  onOpenChange,
}: AIDocumentPreviewDialogProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    setUrl(null);
    setError(null);

    getAIDocumentSignedUrl(doc.file_path)
      .then((signedUrl) => {
        if (!cancelled) setUrl(signedUrl);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar la vista previa.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, doc]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col gap-4 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-green-700" aria-hidden="true" />
            <span className="truncate">{doc?.original_filename ?? 'Vista previa'}</span>
          </DialogTitle>
          <DialogDescription>
            Vista previa del documento. La URL firmada expira en 1 hora.
          </DialogDescription>
        </DialogHeader>

        <div className="h-[75vh] w-full overflow-hidden rounded-lg border bg-gray-50">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">
                No se pudo cargar la vista previa
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            </div>
          ) : url ? (
            <iframe
              src={url}
              title="Vista previa del PDF"
              className="h-full w-full"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Generando vista previa…</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
