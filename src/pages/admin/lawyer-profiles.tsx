import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { Loader2, Mail, User, Check, AlertTriangle, Send, Eye, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateProfileCompletion } from '@/utils/profileCompletion';

interface LawyerProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  profile_completion?: number;
  last_profile_update?: string;
  hourly_rate_clp?: number;
  visits?: number;
  profile_fields?: {
    bio: boolean;
    experience: boolean;
    education: boolean;
    specialties: boolean;
    languages: boolean;
    availability: boolean;
    pricing: boolean;
    location: boolean;
  };
}

export default function LawyerProfilesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmails, setSendingEmails] = useState<string[]>([]);
  const [testMode, setTestMode] = useState(true);
  const [selectedAIIds, setSelectedAIIds] = useState<Set<string>>(new Set());
  const [showAIInviteDialog, setShowAIInviteDialog] = useState(false);
  const [sendingAIInvite, setSendingAIInvite] = useState(false);
  const [aiInviteResult, setAiInviteResult] = useState<null | { sent: number; skipped: number; failed: number }>(null);
  const { toast } = useToast();


  const loadLawyers = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseAdminClient();

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch service counts to include in completion logic
      const { data: servicesData, error: servicesError } = await supabase
        .from('lawyer_services')
        .select('lawyer_user_id');

      if (servicesError) {
        console.error('Error fetching services for completion check:', servicesError);
      }

      const serviceCounts = (servicesData || []).reduce((acc: Record<string, number>, s) => {
        acc[s.lawyer_user_id] = (acc[s.lawyer_user_id] || 0) + 1;
        return acc;
      }, {});

      // Fetch page views for lawyer profiles
      const { data: viewsData, error: viewsError } = await supabase
        .from('page_views')
        .select('page_path')
        .ilike('page_path', '%/abogado/%');

      const viewCounts = (viewsData || []).reduce((acc: Record<string, number>, v) => {
        const uuidMatch = v.page_path.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
        if (uuidMatch) {
          const id = uuidMatch[0];
          acc[id] = (acc[id] || 0) + 1;
        }
        return acc;
      }, {});

      const lawyersWithCompletion = (profilesData || []).map(lawyer => {
        const servicesCount = serviceCounts[lawyer.id] || 0;
        return {
          ...lawyer,
          services_count: servicesCount,
          visits: viewCounts[lawyer.id] || 0,
          profile_completion: calculateProfileCompletion({
            ...lawyer,
            servicesCount: servicesCount
          }),
          last_profile_update: lawyer.updated_at || lawyer.created_at,
        };
      });

      setLawyers(lawyersWithCompletion);
    } catch (error) {
      console.error('Error loading lawyers:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los perfiles de abogados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const sendReminderEmail = async (lawyer: LawyerProfile) => {
    try {
      setSendingEmails(prev => [...prev, lawyer.id]);
      const supabase = getSupabaseAdminClient();

      // Llamar a la función para enviar el correo
      const { error } = await supabase.functions.invoke('send-profile-reminder', {
        body: {
          lawyerEmail: lawyer.email,
          lawyerName: `${lawyer.first_name} ${lawyer.last_name}`,
          completionPercentage: lawyer.profile_completion,
          isMissingPriceOnly: (lawyer.profile_completion || 0) >= 70 && (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0),
          testMode,
        },
      });

      if (error) throw error;

      toast({
        title: 'Correo enviado',
        description: `Se envió un recordatorio a ${lawyer.first_name} ${lawyer.last_name}`,
      });
    } catch (error) {
      console.error('Error sending reminder email:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el correo de recordatorio',
        variant: 'destructive',
      });
    } finally {
      setSendingEmails(prev => prev.filter(id => id !== lawyer.id));
    }
  };

  const sendBulkReminders = async () => {
    const incompleteLawyers = lawyers.filter(lawyer =>
      (lawyer.profile_completion !== undefined && lawyer.profile_completion < 80) ||
      (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0)
    );

    if (incompleteLawyers.length === 0) {
      toast({
        title: 'Información',
        description: 'No hay abogados con perfiles incompletos',
      });
      return;
    }

    try {
      setSendingEmails(incompleteLawyers.map(lawyer => lawyer.id));
      const supabase = getSupabaseAdminClient();

      // Enviar correos en lote
      const emailPromises = incompleteLawyers.map(lawyer =>
        supabase.functions.invoke('send-profile-reminder', {
          body: {
            lawyerEmail: lawyer.email,
            lawyerName: `${lawyer.first_name} ${lawyer.last_name}`,
            completionPercentage: lawyer.profile_completion,
            isMissingPriceOnly: (lawyer.profile_completion || 0) >= 70 && (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0),
            testMode,
          },
        })
      );

      const results = await Promise.all(emailPromises);
      const failures = results.filter(r => r.error);

      if (failures.length > 0) {
        console.error('Some emails failed to send:', failures);
        toast({
          title: 'Envío parcial',
          description: `Se enviaron ${incompleteLawyers.length - failures.length} recordatorios, pero ${failures.length} fallaron.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Correos enviados',
          description: `Se enviaron ${incompleteLawyers.length} recordatorios de perfil correctamente`,
        });
      }
    } catch (error) {
      console.error('Error sending bulk reminders:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron enviar algunos correos',
        variant: 'destructive',
      });
    } finally {
      setSendingEmails([]);
    }
  };

  const toggleAISelection = (id: string) => {
    setSelectedAIIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllAI = () => {
    if (selectedAIIds.size === lawyers.length) {
      setSelectedAIIds(new Set());
    } else {
      setSelectedAIIds(new Set(lawyers.map(l => l.id)));
    }
  };

  const sendAIInvite = async () => {
    if (selectedAIIds.size === 0) {
      toast({ title: 'Selecciona al menos un abogado', variant: 'destructive' });
      return;
    }
    try {
      setSendingAIInvite(true);
      const { data: { session } } = await (await import('@/lib/supabaseClient')).supabase.auth.getSession();
      const res = await fetch('/api/admin/ai/send-lawyer-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ lawyerIds: Array.from(selectedAIIds) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Error al enviar invitaciones');
      setAiInviteResult({ sent: body.sent || 0, skipped: body.skipped || 0, failed: body.failed || 0 });
      toast({ title: 'Invitaciones enviadas', description: `${body.sent} enviados, ${body.skipped} omitidos, ${body.failed} fallidos` });
      setSelectedAIIds(new Set());
      setShowAIInviteDialog(false);
      if (body.failed === 0 && body.sent > 0) {
        try { (await import('posthog-js')).default.capture('ai_lawyer_email_sent', { source: 'admin', campaign: 'legalup_ai_trial', sent: body.sent }); } catch {
          // ignore tracking error
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'No se pudieron enviar las invitaciones';
      console.error('Error sending AI invites:', error);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setSendingAIInvite(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/admin');
      return;
    }
    loadLawyers();
  }, [user, navigate, loadLawyers]);

  const getCompletionColor = (completion: number) => {
    if (completion >= 80) return 'text-green-600';
    if (completion >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionVariant = (completion: number) => {
    if (completion >= 80) return 'default';
    if (completion >= 60) return 'secondary';
    return 'destructive';
  };

  const incompleteLawyers = lawyers.filter(lawyer =>
    (lawyer.profile_completion && lawyer.profile_completion < 80) ||
    (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-6 pt-2">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">
              Perfiles de Abogados
            </h2>
            <p className="text-muted-foreground">
              Gestiona y monitorea el estado de completitud de los perfiles de abogados
            </p>
          </div>
          <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border shadow-sm">
            <span className="text-sm font-medium">Modo Prueba</span>
            <button
              type="button"
              onClick={() => setTestMode(!testMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${testMode ? 'bg-green-900' : 'bg-gray-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${testMode ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>

        {testMode && (
          <Alert className="bg-blue-50 border-blue-200 mb-6">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800">Modo Prueba Activo</AlertTitle>
            <AlertDescription className="text-blue-700">
              Todos los correos se enviarán a <strong>juan.fercommerce@gmail.com</strong> en lugar de a los abogados reales.
            </AlertDescription>
          </Alert>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Abogados</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lawyers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfiles Completos</CardTitle>
              <Check className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {lawyers.filter(l => l.profile_completion && l.profile_completion >= 80).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perfiles Incompletos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{incompleteLawyers.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Completitud</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {lawyers.length > 0
                  ? Math.round(lawyers.reduce((sum, lawyer) => sum + (lawyer.profile_completion || 0), 0) / lawyers.length)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones */}
        <div className="space-y-4 mb-6">
          {incompleteLawyers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Acciones Requeridas
                </CardTitle>
                <CardDescription>
                  Hay {incompleteLawyers.length} abogados con perfiles menos del 60% completados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={sendBulkReminders}
                  disabled={sendingEmails.length > 0}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-green-900 text-white"
                >
                  {sendingEmails.length > 0 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar Recordatorios ({incompleteLawyers.length})
                </Button>
              </CardContent>
            </Card>
          )}
            <Card className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  LegalUp AI
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Invita a abogados registrados a probar LegalUp AI durante 5 días gratis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-center">
                  <Button onClick={() => setShowAIInviteDialog(true)} className="bg-gray-900 hover:bg-green-900 text-white flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Enviar email LegalUp AI
                  </Button>
                  {aiInviteResult && (
                    <span className="text-sm text-emerald-700">
                      Último envío: {aiInviteResult.sent} enviados, {aiInviteResult.skipped} omitidos, {aiInviteResult.failed} fallidos
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">5 días gratis · luego $49.900 CLP/mes · Sin permanencia · Flujo real: /ai → trial</p>
              </CardContent>
            </Card>
        </div>

        {/* Lista de Abogados */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Abogados</CardTitle>
            <CardDescription>
              Estado de completitud de perfiles de todos los abogados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lawyers.map((lawyer) => (
                <div key={lawyer.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center">
                      {lawyer.avatar_url ? (
                        <img
                          src={lawyer.avatar_url}
                          alt={`${lawyer.first_name} ${lawyer.last_name}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">
                        {lawyer.first_name} {lawyer.last_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="truncate">{lawyer.email}</span>
                        <span className="flex items-center gap-1 text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          <Eye className="w-3 h-3" />
                          {lawyer.visits || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto space-x-4">
                    <div className="text-right flex-shrink-0">
                      <div className={`text-sm font-medium ${getCompletionColor(lawyer.profile_completion || 0)}`}>
                        {lawyer.profile_completion || 0}%
                      </div>
                      <Progress
                        value={lawyer.profile_completion || 0}
                        className="w-24 sm:w-32 h-2"
                      />
                    </div>

                    <Badge variant={getCompletionVariant(lawyer.profile_completion || 0)} className="whitespace-nowrap">
                      {lawyer.profile_completion && lawyer.profile_completion >= 80
                        ? 'Completo'
                        : lawyer.profile_completion && lawyer.profile_completion >= 60
                          ? 'En Progreso'
                          : 'Incompleto'
                      }
                    </Badge>

                    {((lawyer.profile_completion && lawyer.profile_completion < 80) ||
                      !lawyer.hourly_rate_clp ||
                      lawyer.hourly_rate_clp === 0) && (
                        <div className="flex items-center gap-2">
                          {(!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0) && (
                            <div className="flex items-center text-amber-600 mr-1" title="Falta precio por hora">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminderEmail(lawyer)}
                            disabled={sendingEmails.includes(lawyer.id)}
                            className="flex-shrink-0"
                          >
                            {sendingEmails.includes(lawyer.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dialog Invitación LegalUp AI */}
        <Dialog open={showAIInviteDialog} onOpenChange={setShowAIInviteDialog}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Enviar email LegalUp AI
              </DialogTitle>
              <DialogDescription>
                Selecciona los abogados registrados que recibirán la invitación a probar LegalUp AI durante 5 días gratis. El CTA lleva a <span className="font-mono text-xs">/ai?utm_source=email…</span>
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-between py-2 border-y">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-ai"
                  checked={lawyers.length > 0 && selectedAIIds.size === lawyers.length}
                  onCheckedChange={toggleAllAI}
                />
                <label htmlFor="select-all-ai" className="text-sm font-medium">
                  Seleccionar todos ({lawyers.length})
                </label>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedAIIds.size} seleccionados
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-2" style={{ maxHeight: '340px' }}>
              {lawyers.map(lawyer => (
                <label key={lawyer.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <Checkbox
                    checked={selectedAIIds.has(lawyer.id)}
                    onCheckedChange={() => toggleAISelection(lawyer.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lawyer.first_name} {lawyer.last_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lawyer.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{lawyer.profile_completion || 0}%</Badge>
                </label>
              ))}
              {lawyers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No hay abogados para mostrar</p>
              )}
            </div>

            {selectedAIIds.size > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-amber-900">Vas a enviar LegalUp AI a {selectedAIIds.size} abogado{selectedAIIds.size > 1 ? 's' : ''}.</p>
                <p className="text-xs text-amber-700 mt-1">Asunto: Conoce LegalUp AI — 5 días gratis para probarlo · 5 días gratis · luego $49.900 CLP/mes</p>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAIInviteDialog(false)} disabled={sendingAIInvite}>
                Cancelar
              </Button>
              <Button onClick={sendAIInvite} disabled={selectedAIIds.size === 0 || sendingAIInvite} className="bg-gray-900 hover:bg-green-900 text-white">
                {sendingAIInvite ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : `Enviar email (${selectedAIIds.size})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
