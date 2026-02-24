import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import { Loader2, Mail, User, Check, AlertTriangle, Send, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Header from '@/components/Header';

interface LawyerProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  role: string;
  profile_completion?: number;
  last_profile_update?: string;
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
  const { toast } = useToast();

  const calculateProfileCompletion = (lawyer: any): number => {
    const fields = {
      bio: !!lawyer.bio && lawyer.bio.length > 20,
      experience: (!!lawyer.experience_years && lawyer.experience_years > 0) || (!!lawyer.experience && lawyer.experience.length > 10),
      education: (!!lawyer.education && lawyer.education.length > 5) || !!lawyer.university,
      specialties: !!lawyer.specialties && lawyer.specialties.length > 0,
      languages: !!lawyer.languages && lawyer.languages.length > 0,
      availability: !!lawyer.availability && (lawyer.availability !== '24/7' || !!lawyer.availability),
      pricing: !!lawyer.hourly_rate_clp || !!lawyer.contact_fee_clp || !!lawyer.hourly_rate || !!lawyer.consultation_fee,
      location: !!lawyer.location || !!lawyer.city,
    };

    const completedFields = Object.values(fields).filter(Boolean).length;
    const totalFields = Object.keys(fields).length;
    return Math.round((completedFields / totalFields) * 100);
  };

  const loadLawyers = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseAdminClient();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const lawyersWithCompletion = (data || []).map(lawyer => ({
        ...lawyer,
        profile_completion: calculateProfileCompletion(lawyer),
        last_profile_update: lawyer.updated_at || lawyer.created_at,
      }));

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
      lawyer.profile_completion !== undefined && lawyer.profile_completion < 60
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
    lawyer.profile_completion && lawyer.profile_completion < 60
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto space-y-6">
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${testMode ? 'bg-blue-600' : 'bg-gray-200'}`}
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
        {incompleteLawyers.length > 0 && (
          <Card className="mb-6">
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
                className="flex items-center gap-2"
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
                      <p className="text-sm text-gray-500 truncate">{lawyer.email}</p>
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

                    {lawyer.profile_completion && lawyer.profile_completion < 60 && (
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
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
