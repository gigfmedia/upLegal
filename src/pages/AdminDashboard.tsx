import { useMemo, useState, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Loader2, RefreshCw, Play } from 'lucide-react'

import RequireAdmin from '@/components/auth/RequireAdmin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { usePlatformSettings } from '@/hooks/usePlatformSettings'
import { fetchPayoutLogs, triggerManualPayout } from '@/services/payoutLogs'

export default function AdminDashboard() {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-slate-50 pt-20 pb-10">
        <div className="max-w-6xl mx-auto px-4 space-y-8">
          <header>
            <Badge variant="outline" className="mb-2">
              Panel interno
            </Badge>
            <h1 className="text-3xl font-bold text-slate-900">Administración</h1>
            <p className="text-slate-500">
              Configura tarifas, revisa pagos y monitorea transferencias hacia los abogados.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            <FeeSettingsCard />
            <TransferStatusCard />
          </div>
        </div>
      </div>
    </RequireAdmin>
  )
}

function FeeSettingsCard() {
  const { settings, isLoading, isSaving, save, refresh } = usePlatformSettings()

  const [clientSurcharge, platformFee] = useMemo(
    () => [settings.client_surcharge_percent * 100, settings.platform_fee_percent * 100],
    [settings]
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    const clientPercent = Number(formData.get('client_surcharge_percent')) / 100
    const platformPercent = Number(formData.get('platform_fee_percent')) / 100

    await save({
      ...settings,
      client_surcharge_percent: clientPercent,
      platform_fee_percent: platformPercent,
    })
  }

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
            <Label htmlFor="client_surcharge_percent">Recargo al cliente (%)</Label>
            <Input
              id="client_surcharge_percent"
              name="client_surcharge_percent"
              type="number"
              min={0}
              max={25}
              step={0.5}
              defaultValue={clientSurcharge}
            />
          </div>
          <div>
            <Label htmlFor="platform_fee_percent">Retención a abogados (%)</Label>
            <Input
              id="platform_fee_percent"
              name="platform_fee_percent"
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

function TransferStatusCard() {
  const [logs, setLogs] = useState([]);
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
    } catch (error) {
      console.error('Error triggering payout:', error);
      toast.error(`Error al iniciar el pago: ${error.message}`);
    } finally {
      setIsTriggering(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
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
          <div className="border rounded-md">
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
