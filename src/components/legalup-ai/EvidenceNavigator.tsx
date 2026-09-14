import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { fragmentLabelFromId } from '@/lib/evidenceLocation';
import { supabase } from '@/lib/supabaseClient';
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
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (open && reference) {
      posthog.capture('ai_evidence_opened', { source_type: reference.sourceType || 'document', surface });
    }
    if (!open) {
      setSignedUrl(null);
      setUrlError(null);
      setLoadingUrl(false);
    }
  }, [open, reference, surface]);

  const getApiBaseUrl = (): string => {
    const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    return (base || 'http://localhost:3001').replace(/\/+$/, '');
  };

  // Apertura segura: el backend valida ownership canónico 4.34B antes de firmar.
  const handleOpenDocument = async () => {
    if (!reference?.documentId || loadingUrl) return;
    setLoadingUrl(true);
    setUrlError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      const res = await fetch(`${getApiBaseUrl()}/api/ai/documents/${reference.documentId}/open`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.signedUrl) throw new Error(body?.error || 'No se pudo abrir el documento.');
      setSignedUrl(body.signedUrl as string);
      posthog.capture('ai_evidence_document_opened', { source_type: reference.sourceType || 'document', surface });
    } catch (e) {
      setUrlError(e instanceof Error ? e.message : 'No se pudo abrir el documento.');
    } finally {
      setLoadingUrl(false);
    }
  };

  const fragmentLabel = fragmentLabelFromId(reference?.fragmentId);

  const content = (
    <div className="space-y-4">
      {reference ? (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={reference.sourceType === 'document' ? 'bg-teal-100 text-teal-800' : reference.sourceType === 'jurisprudence' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
              {reference.sourceType === 'document' ? 'Documento' : reference.sourceType === 'jurisprudence' ? 'Jurisprudencia' : reference.sourceType === 'normative' ? 'Normativa' : 'Doctrina'}
            </Badge>
            {fragmentLabel && <span className="text-xs text-muted-foreground">{fragmentLabel}</span>}
            {reference.documentFilename && <span className="text-xs text-muted-foreground">{reference.documentFilename}</span>}
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-sm italic leading-relaxed text-gray-700">"{reference.evidence}"</p>
            <p className="mt-2 text-xs text-muted-foreground">Esta información proviene de los documentos del caso.</p>
          </div>
          {reference.documentId && !signedUrl && (
            <Button variant="outline" size="sm" onClick={handleOpenDocument} disabled={loadingUrl} className="w-full">
              {loadingUrl ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…</> : <><ExternalLink className="mr-2 h-4 w-4" /> Abrir documento</>}
            </Button>
          )}
          {urlError && (
            <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{urlError}
            </p>
          )}
          {signedUrl && (
            <div className="h-[50vh] w-full overflow-hidden rounded-lg border bg-gray-50">
              <iframe src={signedUrl} title="Vista previa del documento" className="h-full w-full" loading="lazy" />
            </div>
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
