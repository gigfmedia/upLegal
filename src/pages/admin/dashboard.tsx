import { useState } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import ErrorBoundary from '@/components/ErrorBoundary';
import { NotifyLawyersButton } from '@/components/admin/NotifyLawyersButton';

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t-lg ${
      active
        ? 'bg-white text-blue-600 border-t border-l border-r border-gray-200'
        : 'text-gray-500 hover:text-gray-700 bg-gray-100'
    }`}
  >
    {children}
  </button>
);

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('stats');

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <div className="flex space-x-1 border-b border-gray-200">
              <TabButton 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')}
              >
                Estadísticas
              </TabButton>
              <TabButton 
                active={activeTab === 'notifications'} 
                onClick={() => setActiveTab('notifications')}
              >
                Notificaciones
              </TabButton>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            {activeTab === 'stats' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4">Estadísticas</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Total de abogados</p>
                      <p className="text-2xl font-semibold">--</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Servicios activos</p>
                      <p className="text-2xl font-semibold">--</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Resumen</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">Usuarios activos</p>
                      <p className="text-2xl font-semibold">--</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Consultas hoy</p>
                      <p className="text-2xl font-semibold">--</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-medium mb-4">Notificaciones a Abogados</h2>
                <div className="max-w-2xl">
                  <NotifyLawyersButton />
                </div>
              </div>
            )}
          </div>
          
          <Toaster />
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
