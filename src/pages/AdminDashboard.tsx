import { useState, useEffect, useMemo } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Play, Users, CreditCard, DollarSign, BarChart2, Calendar, Eye, Clock, Database, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import { PaymentWithDetails } from '@/types/payment';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { fetchPayoutLogs, triggerManualPayout } from '@/services/payoutLogs';
import { getAllPayments } from '@/services/paymentService';
import Header from '@/components/Header';
import RequireAdmin from '@/components/auth/RequireAdmin';
import { UserManagement } from '@/components/admin/UserManagement';
import { PaymentsTable } from '@/components/admin/PaymentsTable';
import { NotifyLawyersButton } from '@/components/admin/NotifyLawyersButton';
import AnalyticsDashboard from './admin/analytics';
import LawyerProfilesPage from './admin/lawyer-profiles';

interface ErrorData {
  id: string;
  type: string;
  message: string;
  details?: any;
  user_id?: string;
  path?: string;
  created_at: string;
  is_database_error?: boolean;
}

interface ErrorTableProps {
  errors: ErrorData[];
  isLoading: boolean;
  showDatabaseDetails?: boolean;
}

const ErrorTable = ({ errors, isLoading, showDatabaseDetails = false }: ErrorTableProps) => {
  const renderErrorDetails = (error: ErrorData) => {
    if (!error.details) return null;
    
    if (showDatabaseDetails) {
      return (
        <div className="mt-2 text-xs text-muted-foreground space-y-1">
          {error.details.code && <div><span className="font-medium">Código:</span> {error.details.code}</div>}
          {error.details.table && <div><span className="font-medium">Tabla:</span> {error.details.table}</div>}
          {error.details.column && <div><span className="font-medium">Columna:</span> {error.details.column}</div>}
          {error.details.constraint && <div><span className="font-medium">Restricción:</span> {error.details.constraint}</div>}
          {error.details.query && (
            <div className="mt-2">
              <div className="font-medium mb-1">Consulta:</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                {error.details.query}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2">
        <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(error.details, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Tipo</TableHead>
          <TableHead>Mensaje</TableHead>
          {!showDatabaseDetails && <TableHead>Usuario</TableHead>}
          <TableHead className="text-right">Fecha</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-4">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              <p className="mt-2 text-sm text-muted-foreground">Cargando errores...</p>
            </TableCell>
          </TableRow>
        ) : errors.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
              No hay errores para mostrar
            </TableCell>
          </TableRow>
        ) : (
          errors.map((error) => (
            <TableRow key={error.id} className="group">
              <TableCell>
                <div className="flex items-center">
                  {showDatabaseDetails ? (
                    <Database className="h-4 w-4 mr-2 text-red-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  )}
                  <Badge 
                    variant={error.type.includes('error') ? 'destructive' : 'outline'}
                    className="text-xs"
                  >
                    {error.type}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="max-w-[300px] align-top">
                <div className="font-medium">{error.message}</div>
                {error.path && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {error.path}
                  </div>
                )}
                {renderErrorDetails(error)}
              </TableCell>
              {!showDatabaseDetails && (
                <TableCell>
                  {error.user_id ? (
                    <span className="text-sm text-muted-foreground">
                      {error.user_id.substring(0, 6)}...
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sistema</span>
                  )}
                </TableCell>
              )}
              <TableCell className="whitespace-nowrap text-right">
                <div className="text-sm">
                  {format(new Date(error.created_at), 'dd/MM/yy')}
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(error.created_at), 'HH:mm:ss')}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.error('Error details:', error);
                    toast.info('Ver consola para más detalles', {
                      description: 'Los detalles del error se han registrado en la consola',
                    });
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Detalles
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

const TABS = {
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',
  USERS: 'users',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  LAWYER_PROFILES: 'lawyer-profiles',
} as const;

type TabType = typeof TABS[keyof typeof TABS];

export default function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType;
  
  // Use URL param as initial state, fallback to DASHBOARD
  const initialTab = useMemo(() => {
    return (Object.values(TABS) as string[]).includes(tabParam) 
      ? tabParam 
      : TABS.DASHBOARD;
  }, [tabParam]);

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Sync state to URL
  useEffect(() => {
    if (activeTab !== tabParam) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('tab', activeTab);
        return newParams;
      }, { replace: true });
    }
  }, [activeTab, tabParam, setSearchParams]);

  // Fetch payments data
  const {
    data: paymentsData,
    isLoading: isLoadingPayments,
    isFetching: isFetchingPayments,
    refetch: refetchPayments,
  } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const data = await getAllPayments();
      return data;
    },
    enabled: activeTab === TABS.PAYMENTS,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // No longer needed here as they are in AnalyticsDashboard

  useEffect(() => {
    if (activeTab === TABS.PAYMENTS) {
      refetchPayments();
    }
  }, [activeTab, refetchPayments]);

  return (
    <div className="w-full">
      <Header />
      <RequireAdmin>
        <div className="min-h-screen bg-slate-50 pt-20 pb-10">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <header>
              <Badge variant="outline" className="mb-2">
                Panel interno
              </Badge>
              <h1 className="text-3xl font-bold text-slate-900">Administración</h1>
              <p className="text-slate-500 mt-1">
                Configura tarifas, revisa pagos y monitorea transferencias hacia los abogados.
              </p>
              
              <div className="border-b border-gray-200 mt-4 mb-4">
                <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                  <nav className="-mb-px flex space-x-8 min-w-max sm:min-w-0">
                    <button
                      onClick={() => setActiveTab(TABS.DASHBOARD)}
                      className={`${activeTab === TABS.DASHBOARD 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <DollarSign className="h-4 w-4" />
                      Tarifas
                    </button>
                    <button
                      onClick={() => setActiveTab(TABS.PAYMENTS)}
                      className={`${activeTab === TABS.PAYMENTS 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <CreditCard className="h-4 w-4" />
                      Pagos
                    </button>
                    <button
                      onClick={() => setActiveTab(TABS.USERS)}
                      className={`${activeTab === TABS.USERS 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <Users className="h-4 w-4" />
                      Usuarios
                    </button>
                    <button
                      onClick={() => setActiveTab(TABS.ANALYTICS)}
                      className={`${activeTab === TABS.ANALYTICS 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <BarChart2 className="h-4 w-4" />
                      Analytics
                    </button>

                    <button
                      onClick={() => setActiveTab(TABS.NOTIFICATIONS)}
                      className={`${activeTab === TABS.NOTIFICATIONS 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <AlertCircle className="h-4 w-4" />
                      Notificaciones
                    </button>
                    <button
                      onClick={() => setActiveTab(TABS.LAWYER_PROFILES)}
                      className={`${activeTab === TABS.LAWYER_PROFILES 
                        ? 'border-blue-500 text-blue-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <Users className="h-4 w-4" />
                      Perfiles Abogados
                    </button>
                  </nav>
                </div>
              </div>
            </header>

            <div className="space-y-6">
              {activeTab === TABS.DASHBOARD && (
                <div className="grid gap-6 md:grid-cols-2">
                  <FeeSettingsCard />
                  <TransferStatusCard />
                </div>
              )}

              {activeTab === TABS.PAYMENTS && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Pagos</CardTitle>
                        <CardDescription>
                          Revisa y gestiona los pagos realizados en la plataforma.
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetchPayments()}
                        disabled={isFetchingPayments}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingPayments ? 'animate-spin' : ''}`} />
                        Actualizar
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PaymentsTable payments={paymentsData || []} loading={isLoadingPayments || isFetchingPayments} />
                  </CardContent>
                </Card>
              )}

              {activeTab === TABS.USERS && (
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Gestión de Usuarios</CardTitle>
                        <CardDescription>
                          Revisa todos los usuarios registrados en la plataforma
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>  
                  <CardContent>
                    <UserManagement />
                  </CardContent>
                </Card>
              )}

              {activeTab === TABS.NOTIFICATIONS && (
                <div className="space-y-6">
                  <h2 className="text-lg font-medium">Notificaciones a Abogados</h2>
                  <div className="max-w-2xl">
                    <NotifyLawyersButton />
                  </div>
                </div>
              )}

              {activeTab === TABS.ANALYTICS && (
                <AnalyticsDashboard />
              )}

              {activeTab === TABS.LAWYER_PROFILES && (
                <LawyerProfilesPage />
              )}
            </div>
          </div>
        </div>
      </RequireAdmin>
    </div>
  );
}

function FeeSettingsCard() {
  const { settings, isLoading, isSaving, save, refresh } = usePlatformSettings()

  const [clientSurcharge, platformFee] = useMemo(
    () => [settings.client_surcharge_percent * 100, settings.platform_fee_percent * 100],
    [settings]
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const clientPercent = parseFloat(formData.get('clientSurcharge') as string) / 100;
    const platformPercent = parseFloat(formData.get('platformFee') as string) / 100;

    try {
      await save({ client_surcharge_percent: clientPercent, platform_fee_percent: platformPercent });
      toast.success('Configuración guardada exitosamente');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Error al guardar la configuración');
    }
  };

  const lastUpdate = settings.updated_at
    ? format(new Date(settings.updated_at), 'dd MMM yyyy HH:mm')
    : 'N/D'

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Tarifas de la plataforma</CardTitle>
            <CardDescription>
              Actualmente los clientes pagan {clientSurcharge}% extra y la plataforma retiene {platformFee}%.
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading || isSaving}>
            <RefreshCw className={isLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="clientSurcharge">Recargo al cliente (%)</Label>
            <Input
              id="clientSurcharge"
              name="clientSurcharge"
              type="number"
              min={0}
              max={25}
              step={0.5}
              defaultValue={clientSurcharge}
            />
          </div>
          <div>
            <Label htmlFor="platformFee">Retención a abogados (%)</Label>
            <Input
              id="platformFee"
              name="platformFee"
              type="number"
              min={0}
              max={30}
              step={0.5}
              defaultValue={platformFee}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Moneda principal: {settings.currency}</span>
            <span>Actualizado: {lastUpdate}</span>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
            <Button type="button" variant="outline" onClick={refresh} disabled={isLoading || isSaving}>
              Revertir cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface PayoutLog {
  id: string;
  created_at: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_amount?: number;
  error?: string;
  metadata?: {
    payment_ids?: string[];
  };
}

function TransferStatusCard() {
  const [logs, setLogs] = useState<PayoutLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await fetchPayoutLogs(10);
      setLogs(data);
    } catch (error) {
      console.error('Error loading payout logs:', error);
      toast.error('Error al cargar el historial de pagos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleManualTrigger = async () => {
    try {
      setIsTriggering(true);
      const { success, error } = await triggerManualPayout();
      
      if (success) {
        toast.success('Proceso de pago iniciado correctamente');
        // Recargar logs después de un pequeño retraso
        setTimeout(loadLogs, 2000);
      } else {
        throw new Error(error || 'Error desconocido al iniciar el pago');
      }
    } catch (error: any) {
      console.error('Error triggering payout:', error);
      toast.error(`Error al iniciar el pago: ${error.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string, variant: 'outline' | 'secondary' | 'default' | 'destructive' }> = {
      pending: { label: 'Pendiente', variant: 'outline' },
      processing: { label: 'Procesando', variant: 'secondary' },
      completed: { label: 'Completado', variant: 'default' },
      failed: { label: 'Fallido', variant: 'destructive' },
    };
    
    const { label, variant } = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Transferencias semanales</CardTitle>
            <CardDescription className="mt-1">
              Procesamiento automático los lunes a las 09:00 (America/Santiago)
            </CardDescription>
          </div>
          <Button 
            onClick={handleManualTrigger} 
            disabled={isTriggering}
            className="flex items-center gap-2"
          >
            {isTriggering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Ejecutar ahora
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-slate-50 px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-slate-700">Estado actual</p>
              <p className="text-xs text-slate-500">
                {logs[0] ? (
                  <span>Última ejecución: {format(new Date(logs[0].created_at), "PPPp", { locale: es })}</span>
                ) : (
                  'No hay registros de ejecución'
                )}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={loadLogs}
              disabled={isLoading}
              className="h-8 w-8 p-0" 
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="font-medium mb-3">Historial de ejecuciones</h3>
          <div className="border rounded-md overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : logs.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No hay registros de ejecución
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Pagos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.created_at), "PPp", { locale: es })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                        {log.error && (
                          <p className="text-xs text-red-500 mt-1 line-clamp-1">
                            {log.error}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        ${log.total_amount?.toLocaleString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.metadata?.payment_ids?.length || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Notas</h4>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
            <li>Solo se procesan pagos con estado "succeeded" y "payout_status = pending"</li>
            <li>Los pagos se agrupan por abogado</li>
            <li>En caso de error, se registra en la base de datos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}