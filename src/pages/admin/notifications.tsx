import { NotifyLawyersButton } from '@/components/admin/NotifyLawyersButton';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function AdminNotifications() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="bg-white container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold mb-8">Notificaciones a Abogados</h1>
          
          <div className="max-w-3xl mx-auto">
            <NotifyLawyersButton />
          </div>
          
          <Toaster />
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
