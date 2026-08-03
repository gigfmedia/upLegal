import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

/** Estado del pipeline de extracción de texto (status de ai_documents). */
export function AIDocumentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return <Badge variant="secondary" className="bg-green-50 text-green-800">Listo</Badge>;
    case 'processing':
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
          Procesando
        </Badge>
      );
    case 'pending':
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Pendiente</Badge>;
    case 'failed':
      return <Badge variant="destructive">Falló</Badge>;
    default:
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">{status}</Badge>;
  }
}

/** Estado del análisis IA (analysis_status de ai_documents). */
export function AIAnalysisStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'ready':
      return <Badge variant="secondary" className="bg-green-50 text-green-800">Analizado</Badge>;
    case 'processing':
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden="true" />
          Analizando
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">Análisis fallido</Badge>;
    default:
      return <Badge variant="secondary" className="bg-gray-100 text-gray-600">Sin analizar</Badge>;
  }
}
