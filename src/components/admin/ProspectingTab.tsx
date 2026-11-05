import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Mail, Play, RefreshCw, Send, Settings, ShieldAlert, Users } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

interface ProspectingSettings {
  enabled: boolean;
  dry_run: boolean;
  daily_target: number;
  max_sends_per_run: number;
  max_sends_per_day: number;
  schedule_time: string;
  timezone: string;
  sender_name: string;
  sender_email: string;
  reply_to: string;
  app_url: string;
}

interface ProspectingRun {
  id: string;
  run_key: string;
  trigger: string;
  mode: string;
  status: string;
  started_at: string;
  finished_at?: string | null;
  discovered: number;
  inserted: number;
  eligible: number;
  sent: number;
  failed: number;
  skipped: number;
  error?: string | null;
  summary?: Record<string, unknown>;
}

interface Overview {
  settings: ProspectingSettings;
  counts: {
    total_prospects: number;
    pending_contact: number;
    valid_today: number;
    sent_today: number;
    delivered_today: number;
    bounced_today: number;
    complained_today: number;
    failed_today: number;
    suppressions: number;
    month: { sent: number; delivered: number; bounced: number; complained: number };
  };
  latest_run: ProspectingRun | null;
  next_run_at: string | null;
  timezone: string;
  server_time: string;
  readiness: {
    search_provider: string | null;
    unsubscribe_secret: boolean;
    webhook_secret: boolean;
    cron_secret: boolean;
    resend: boolean;
  };
}

interface Prospect {
  id: string;
  firm_name: string;
  contact_name?: string | null;
  email?: string | null;
  city?: string | null;
  status: string;
  validation_status: string;
  source: string;
  source_url?: string | null;
  discovered_at: string;
}

interface ProspectSend {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  attempt: number;
  sent_at?: string | null;
  last_error?: string | null;
  prospects?: { firm_name?: string; contact_name?: string } | null;
}

interface Suppression {
  id: string;
  email_normalized: string;
  reason: string;
  source?: string | null;
  created_at: string;
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${apiBase}/api/admin/prospecting${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token || ''}`,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Error ${response.status}`);
  }
  return (payload?.data ?? payload) as T;
}

const emptySettings: ProspectingSettings = {
  enabled: false,
  dry_run: true,
  daily_target: 100,
  max_sends_per_run: 50,
  max_sends_per_day: 100,
  schedule_time: '10:00',
  timezone: 'America/Santiago',
  sender_name: 'Juan Guajardo | LegalUp',
  sender_email: 'juan@legalup.cl',
  reply_to: 'juan@legalup.cl',
  app_url: 'https://legalup.cl/pro',
};

export function ProspectingTab() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [runs, setRuns] = useState<ProspectingRun[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [sends, setSends] = useState<ProspectSend[]>([]);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [settingsForm, setSettingsForm] = useState<ProspectingSettings>(emptySettings);
  const [testRecipient, setTestRecipient] = useState('juan@legalup.cl');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    try {
      const [overviewData, runsData, prospectsData, sendsData, suppressionsData] = await Promise.all([
        apiRequest<Overview>('/overview'),
        apiRequest<ProspectingRun[]>('/runs?limit=25'),
        apiRequest<{ rows: Prospect[] }>('/prospects?page_size=25'),
        apiRequest<{ rows: ProspectSend[] }>('/sends?page_size=25'),
        apiRequest<Suppression[]>('/suppressions?limit=50'),
      ]);
      setOverview(overviewData);
      setRuns(runsData || []);
      setProspects(prospectsData?.rows || []);
      setSends(sendsData?.rows || []);
      setSuppressions(suppressionsData || []);
      if (overviewData?.settings) {
        setSettingsForm({
          ...overviewData.settings,
          schedule_time: String(overviewData.settings.schedule_time || '10:00:00').slice(0, 5),
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al cargar prospección');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const running = overview?.latest_run?.status === 'running';
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(refreshAll, 5000);
    return () => clearInterval(timer);
  }, [running, refreshAll]);

  const readiness = overview?.readiness;
  const missing = useMemo(() => {
    if (!readiness) return [];
    const items: string[] = [];
    if (!readiness.resend) items.push('RESEND_API_KEY');
    if (!readiness.search_provider) items.push('SERPER_API_KEY / BRAVE_SEARCH_API_KEY / GOOGLE_CSE_*');
    if (!readiness.unsubscribe_secret) items.push('PROSPECTING_UNSUBSCRIBE_SECRET');
    if (!readiness.webhook_secret) items.push('RESEND_WEBHOOK_SECRET');
    if (!readiness.cron_secret) items.push('PROSPECTING_CRON_SECRET');
    return items;
  }, [readiness]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiRequest<ProspectingSettings>('/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      toast.success('Configuración guardada');
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async (mode: 'dry_run' | 'send') => {
    if (mode === 'send' && !window.confirm('Esto enviará correos reales a prospectos validados. ¿Confirmas el envío?')) {
      return;
    }
    setAction(mode);
    try {
      await apiRequest('/run', {
        method: 'POST',
        body: JSON.stringify({ mode, confirm: mode === 'send' }),
      });
      toast.success(mode === 'send' ? 'Campaña real iniciada' : 'Dry-run iniciado');
      setTimeout(refreshAll, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar');
    } finally {
      setAction(null);
    }
  };

  const handleTestEmail = async () => {
    if (!testRecipient.trim()) {
      toast.error('Ingresa un destinatario de prueba');
      return;
    }
    setAction('test');
    try {
      await apiRequest('/test-email', {
        method: 'POST',
        body: JSON.stringify({ to: testRecipient.trim() }),
      });
      toast.success('Correo de prueba enviado');
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo enviar la prueba');
    } finally {
      setAction(null);
    }
  };

  const handleDeleteSuppression = async (id: string) => {
    if (!window.confirm('¿Eliminar esta supresión? El email podría volver a recibir correos.')) return;
    try {
      await apiRequest(`/suppressions/${id}`, { method: 'DELETE' });
      toast.success('Supresión eliminada');
      await refreshAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando prospección...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {missing.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">Faltan variables de entorno</p>
              <p className="text-sm text-amber-800 mt-1">
                La automatización no enviará correos reales hasta configurar: {missing.join(', ')}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Prospectos" value={overview?.counts.total_prospects ?? 0} icon={<Users className="h-4 w-4" />} />
        <MetricCard title="Válidos hoy" value={overview?.counts.valid_today ?? 0} icon={<Mail className="h-4 w-4" />} />
        <MetricCard title="Enviados hoy" value={overview?.counts.sent_today ?? 0} icon={<Send className="h-4 w-4" />} />
        <MetricCard title="Supresiones" value={overview?.counts.suppressions ?? 0} icon={<ShieldAlert className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Configuración
            </CardTitle>
            <CardDescription>
              Automatización diaria a las {settingsForm.schedule_time} ({settingsForm.timezone}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={settingsForm.enabled}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, enabled: event.target.checked }))}
                />
                Automatización activa
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={settingsForm.dry_run}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, dry_run: event.target.checked }))}
                />
                Dry-run por defecto
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Prospectos/día">
                <Input type="number" min={1} max={500} value={settingsForm.daily_target}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, daily_target: Number(event.target.value) }))} />
              </Field>
              <Field label="Máx. por corrida">
                <Input type="number" min={0} max={500} value={settingsForm.max_sends_per_run}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, max_sends_per_run: Number(event.target.value) }))} />
              </Field>
              <Field label="Máx. por día">
                <Input type="number" min={0} max={1000} value={settingsForm.max_sends_per_day}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, max_sends_per_day: Number(event.target.value) }))} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hora (America/Santiago)">
                <Input type="time" value={settingsForm.schedule_time}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, schedule_time: event.target.value }))} />
              </Field>
              <Field label="Zona horaria">
                <Input value={settingsForm.timezone}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, timezone: event.target.value }))} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre remitente">
                <Input value={settingsForm.sender_name}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, sender_name: event.target.value }))} />
              </Field>
              <Field label="Email remitente">
                <Input type="email" value={settingsForm.sender_email}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, sender_email: event.target.value }))} />
              </Field>
              <Field label="Reply-To">
                <Input type="email" value={settingsForm.reply_to}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, reply_to: event.target.value }))} />
              </Field>
              <Field label="Landing / Pro">
                <Input value={settingsForm.app_url}
                  onChange={(event) => setSettingsForm((current) => ({ ...current, app_url: event.target.value }))} />
              </Field>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar configuración
              </Button>
              <Button variant="outline" onClick={() => handleRun('dry_run')} disabled={Boolean(action)}>
                {action === 'dry_run' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Ejecutar dry-run
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleRun('send')}
                disabled={Boolean(action) || settingsForm.dry_run}
                title={settingsForm.dry_run ? 'Desactiva dry-run y guarda para enviar correos reales' : undefined}
              >
                {action === 'send' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Enviar campaña real
              </Button>
              <Button variant="ghost" onClick={refreshAll} disabled={Boolean(action)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
            <CardDescription>Última y próxima ejecución</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Último run" value={overview?.latest_run ? `${overview.latest_run.status} · ${formatDate(overview.latest_run.started_at)}` : 'Sin ejecuciones'} />
            <Row label="Próximo run" value={overview?.next_run_at ? formatDate(overview.next_run_at) : '—'} />
            <Row label="Proveedor búsqueda" value={readiness?.search_provider || 'No configurado'} />
            <Row label="Resend" value={readiness?.resend ? 'Configurado' : 'No configurado'} />
            <Row label="Webhook" value={readiness?.webhook_secret ? 'Firmado' : 'Sin secreto'} />
            <Row label="Cron externo" value={readiness?.cron_secret ? 'Configurado' : 'Sin secreto'} />
            {overview?.latest_run?.error && (
              <p className="text-xs text-red-600 break-words">Error: {overview.latest_run.error}</p>
            )}
            <div className="pt-2">
              <Label htmlFor="test-recipient">Enviar correo de prueba</Label>
              <div className="flex gap-2 mt-1">
                <Input id="test-recipient" value={testRecipient} onChange={(event) => setTestRecipient(event.target.value)} />
                <Button variant="outline" onClick={handleTestEmail} disabled={Boolean(action)}>
                  {action === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Probar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ejecuciones</CardTitle>
          <CardDescription>Historial de descubrimiento y envío</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTable
            headers={['Inicio', 'Disparo', 'Modo', 'Estado', 'Descubiertos', 'Insertados', 'Elegibles', 'Enviados', 'Fallidos']}
            empty="Sin ejecuciones"
            rows={runs.map((run) => [
              formatDate(run.started_at),
              run.trigger,
              run.mode,
              <StatusBadge key={run.id} status={run.status} />,
              run.discovered,
              run.inserted,
              run.eligible,
              run.sent,
              run.failed,
            ])}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prospectos</CardTitle>
          <CardDescription>Últimos 25 descubiertos</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleTable
            headers={['Estudio', 'Contacto', 'Email', 'Ciudad', 'Validación', 'Estado', 'Origen']}
            empty="Sin prospectos"
            rows={prospects.map((prospect) => [
              prospect.firm_name,
              prospect.contact_name || '—',
              prospect.email || '—',
              prospect.city || '—',
              prospect.validation_status,
              <StatusBadge key={prospect.id} status={prospect.status} />,
              <a key={`${prospect.id}-source`} href={prospect.source_url || '#'} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                {prospect.source}
              </a>,
            ])}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Envíos</CardTitle>
            <CardDescription>Últimos 25 correos</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable
              headers={['Para', 'Asunto', 'Estado', 'Intentos', 'Fecha']}
              empty="Sin envíos"
              rows={sends.map((send) => [
                send.to_email,
                send.subject,
                <StatusBadge key={send.id} status={send.status} />,
                send.attempt,
                send.sent_at ? formatDate(send.sent_at) : '—',
              ])}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supresiones</CardTitle>
            <CardDescription>Bajas, rebotes y quejas</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleTable
              headers={['Email', 'Motivo', 'Fecha', '']}
              empty="Sin supresiones"
              rows={suppressions.map((row) => [
                row.email_normalized,
                row.reason,
                formatDate(row.created_at),
                <Button key={row.id} variant="ghost" size="sm" onClick={() => handleDeleteSuppression(row.id)}>
                  Eliminar
                </Button>,
              ])}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string; value: number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          </div>
          <div className="text-slate-400">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 text-right break-words">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant = ['failed', 'bounced', 'complained', 'error'].includes(status)
    ? 'destructive'
    : ['succeeded', 'sent', 'delivered', 'validated', 'contacted'].includes(status)
      ? 'default'
      : 'secondary';
  return <Badge variant={variant}>{status}</Badge>;
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: ReactNode[][]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="whitespace-nowrap">{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headers.length} className="text-center py-6 text-muted-foreground">{empty}</TableCell>
            </TableRow>
          ) : rows.map((row, index) => (
            <TableRow key={index}>
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex} className="align-top">{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatDate(value: string) {
  try {
    return format(new Date(value), "d MMM yyyy, HH:mm", { locale: es });
  } catch {
    return value;
  }
}
