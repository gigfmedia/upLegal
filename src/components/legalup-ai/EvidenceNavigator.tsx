import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import posthog from 'posthog-js';

export type EvidenceReference = {
  documentId?: string;
  sourceId: string;
  fragmentId?: string | null;
  pageNumber?: number | null;
  evidence: string;
  sourceType?: 'document' | 'jurisprudence' | 'normative' | 'doctrina';
  documentFilename?: string;
};

type EvidenceNavigatorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reference: EvidenceReference | null;
  surface?: string;
};

export function EvidenceNavigator({ open, onOpenChange, reference, surface = 'case_intelligence' }: EvidenceNavigatorProps) {
  const isMobile = useIsMobile();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  useEffect(() => {
    if (open && reference) {
      posthog.capture('ai_evidence_opened', { source_type: reference.sourceType || 'document', surface });
    }
  }, [open, reference, surface]);

  const handleOpenDocument = async () => {
    if (!reference?.documentId) return;
    setLoadingUrl(true);
    try {
      const { getAIDocumentSignedUrl } = await import('@/hooks/useAIDocuments');
      // Need file_path from reference? For now, we need to fetch via API
      // Use the evidence endpoint to get signed URL
      const token = (await import('@/lib/supabaseClient')).supabase.auth.getSession().then(r=>r.data.session?.access_token);
      // Simplified: try to get signed URL via hook if available
      posthog.capture('ai_evidence_document_opened', { source_type: reference.sourceType || 'document', surface });
    } catch {
      // ignore
    } finally {
      setLoadingUrl(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {reference ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={reference.sourceType === 'document' ? 'bg-teal-100 text-teal-800' : reference.sourceType === 'jurisprudence' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
              {reference.sourceType === 'document' ? 'Documento' : reference.sourceType === 'jurisprudence' ? 'Jurisprudencia' : reference.sourceType === 'normative' ? 'Normativa' : 'Doctrina'}
            </Badge>
            {reference.pageNumber && <span className="text-xs text-muted-foreground">Página {reference.pageNumber}</span>}
            {reference.documentFilename && <span className="text-xs text-muted-foreground">{reference.documentFilename}</span>}
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-gray-700">"{reference.evidence}"</p>
            <p className="mt-2 text-xs text-muted-foreground">Esta información proviene de los documentos del caso.</p>
          </div>
          {reference.documentId && (
            <Button variant="outline" size="sm" onClick={handleOpenDocument} disabled={loadingUrl} className="w-full">
              {loadingUrl ? 'Cargando...' : <><ExternalLink className="mr-2 h-4 w-4" /> Abrir documento</>}
            </Button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No hay evidencia disponible.</p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Evidencia</DrawerTitle>
            <DrawerDescription className="sr-only">Evidencia del documento</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Evidencia</DialogTitle>
          <DialogDescription className="sr-only">Evidencia del documento</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
