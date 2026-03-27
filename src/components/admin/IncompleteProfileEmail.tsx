import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Mail, Send, AlertCircle, CheckCircle, User, DollarSign, Star, X, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getSupabaseAdminClient } from '@/lib/supabaseClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LawyerProfile {
  id: string;
  email: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  hourly_rate_clp?: number;
  bio?: string;
  specialties?: string[];
  avatar_url?: string;
  review_count?: number;
  rating?: number;
}

interface IncompleteProfileEmailProps {
  onClose?: () => void;
}

export function IncompleteProfileEmail({ onClose }: IncompleteProfileEmailProps) {
  const [loading, setLoading] = useState(false);
  const [lawyers, setLawyers] = useState<LawyerProfile[]>([]);
  const [selectedLawyers, setSelectedLawyers] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Auto-load profiles when component mounts
  useEffect(() => {
    fetchIncompleteProfiles();
  }, []);

  const fetchIncompleteProfiles = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseAdminClient();
      
      // Get all lawyers first, then filter for incomplete profiles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          display_name,
          first_name,
          last_name,
          hourly_rate_clp,
          bio,
          specialties,
          avatar_url,
          review_count,
          rating
        `)
        .eq('role', 'lawyer');

      if (error) throw error;
      
      // Filter for incomplete profiles in frontend
      const incompleteProfiles = (data || []).filter(lawyer => {
        const missing = [];
        if (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0) missing.push('Tarifa');
        if (!lawyer.bio) missing.push('Biografía');
        if (!lawyer.specialties || lawyer.specialties.length === 0) missing.push('Especialidades');
        if (!lawyer.avatar_url) missing.push('Foto');
        return missing.length > 0;
      });
      
      setLawyers(incompleteProfiles);
    } catch (error) {
      console.error('Error fetching incomplete profiles:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los perfiles incompletos',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleLawyerSelection = (lawyerId: string) => {
    setSelectedLawyers(prev => 
      prev.includes(lawyerId) 
        ? prev.filter(id => id !== lawyerId)
        : [...prev, lawyerId]
    );
  };

  const selectAllLawyers = () => {
    setSelectedLawyers(lawyers.map(l => l.id));
  };

  const clearSelection = () => {
    setSelectedLawyers([]);
  };

  const handleSendClick = () => {
    if (selectedLawyers.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un abogado',
        variant: 'destructive',
      });
      return;
    }

    if (isTestMode) {
      sendEmails();
    } else {
      setShowConfirmDialog(true);
    }
  };

  const sendEmails = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseAdminClient();

      // Get selected lawyers' data
      const selectedLawyersData = lawyers.filter(l => selectedLawyers.includes(l.id));
      
      // Determine emails based on mode
      const targetEmails = isTestMode 
        ? ['gigfmedia@icloud.com'] // Test mode: admin email
        : selectedLawyersData.map(l => l.email); // Production: real lawyer emails

      // Message template
      const defaultMessage = `Estimado/a abogado/a,

Hemos notado que tu perfil en LegalUp está incompleto. Esto está afectando tu visibilidad y la posibilidad de que clientes contraten tus servicios.

<strong>¿Qué falta por completar?</strong>
${selectedLawyersData.map(lawyer => {
  const missing = [];
  if (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0) missing.push('Tarifa por hora');
  if (!lawyer.bio) missing.push('Biografía');
  if (!lawyer.specialties || lawyer.specialties.length === 0) missing.push('Especialidades');
  if (!lawyer.avatar_url) missing.push('Foto de perfil');
  
  return `${lawyer.display_name || lawyer.email}: ${missing.join(', ')}`;
}).join('\n')}

<strong>¿Por qué es importante completar tu perfil?</strong>
• Los clientes no pueden contratar servicios sin precio establecido
• Tu perfil aparece más bajo en los resultados de búsqueda
• Pierdes oportunidades de conseguir nuevos clientes

Para completar tu perfil, ingresa a:
https://legalup.cl/lawyer/profile

¡No dejes pasar más clientes! Tu perfil completo es tu mejor herramienta de marketing.

${selectedLawyersData.some(l => l.review_count && l.review_count > 0) ? `<p>Por otro lado:</p><strong>¡Tienes nuevas reseñas en tu perfil!</strong>
Actualmente tienes ${
  selectedLawyersData.length === 1 
    ? (selectedLawyersData[0].review_count === 1 ? '1 reseña' : `${selectedLawyersData[0].review_count} reseñas`) 
    : 'reseñas'
} de clientes satisfechos. Completa tu perfil ahora para aprovechar estas recomendaciones, generar más confianza y conseguir nuevos clientes.\n\n` : ''}`;

      const finalMessage = customMessage || defaultMessage;

      const { error } = await supabase.functions.invoke('send-incomplete-profile-emails', {
        body: {
          emails: targetEmails,
          message: finalMessage,
          lawyers: selectedLawyersData,
          testMode: isTestMode,
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(typeof error === 'string' ? error : error.message || 'Error desconocido');
      }

      setEmailSent(true);
      toast({
        title: isTestMode ? 'Email de prueba enviado' : 'Emails enviados',
        description: isTestMode 
          ? `Revisa tu bandeja de entrada: gigfmedia@icloud.com`
          : `Se enviaron ${targetEmails.length} emails a los abogados seleccionados`,
      });
      
      // Close modal immediately
      onClose();

    } catch (error: any) {
      console.error('Error sending emails:', error);
      toast({
        title: 'Error',
        description: error?.message || `No se pudo enviar el email${isTestMode ? ' de prueba' : ''}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setShowConfirmDialog(false);
    }
  };

  const getMissingFields = (lawyer: LawyerProfile): string[] => {
    const missing = [];
    if (!lawyer.hourly_rate_clp || lawyer.hourly_rate_clp === 0) missing.push('Tarifa');
    if (!lawyer.bio) missing.push('Biografía');
    if (!lawyer.specialties || lawyer.specialties.length === 0) missing.push('Especialidades');
    if (!lawyer.avatar_url) missing.push('Foto');
    return missing;
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {isTestMode ? 'Email de Prueba' : 'Enviar Email'} - Perfiles Incompletos
              </CardTitle>
              <div className="mt-2">
                <p>
                  {isTestMode 
                    ? 'Envía un email de prueba a gigfmedia@icloud.com para validar el funcionamiento antes de enviar a abogados.'
                    : `Envía emails reales a ${selectedLawyers.length} abogado(s) seleccionado(s) para que completen su perfil.`}
                </p>
                <div className="mt-2">
                  <Badge variant={isTestMode ? "secondary" : "destructive"} className="w-fit">
                    {isTestMode ? 'MODO PRUEBA' : 'MODO PRODUCCIÓN'}
                  </Badge>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <span className="text-sm font-medium text-gray-700">Modo de envío:</span>
            
            <div className="flex items-center gap-3">
              <span className={`text-sm ${isTestMode ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                Prueba (gigfmedia@icloud.com)
              </span>
              <Switch
                checked={!isTestMode}
                onCheckedChange={(checked) => setIsTestMode(!checked)}
              />
              <span className={`text-sm ${!isTestMode ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                Producción (abogados)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Lawyers list */}
        {!loading && lawyers.length > 0 && (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedLawyers.length} de {lawyers.length} seleccionados
                </span>
                <Button variant="outline" size="sm" onClick={selectAllLawyers}>
                  Seleccionar todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar selección
                </Button>
              </div>
            </div>

            {/* Lawyers grid */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lawyers.map((lawyer) => {
                const missingFields = getMissingFields(lawyer);
                const isSelected = selectedLawyers.includes(lawyer.id);
                
                return (
                  <div
                    key={lawyer.id}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleLawyerSelection(lawyer.id)}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { /* Handled by parent div */ }}
                        className="rounded border-gray-300 pointer-events-none"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {lawyer.display_name || `${lawyer.first_name} ${lawyer.last_name}`}
                        </div>
                        <div className="text-sm text-gray-600">{lawyer.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {lawyer.average_rating && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span className="text-sm">{lawyer.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                      {lawyer.reviews_count && (
                        <Badge variant="secondary" className="text-xs">
                          {lawyer.reviews_count} reseñas
                        </Badge>
                      )}
                      <div className="flex gap-1">
                        {missingFields.map((field, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom message */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Mensaje personalizado (opcional)
              </label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Deja vacío para usar el mensaje predeterminado..."
                className="min-h-[100px]"
              />
            </div>

            {/* Send button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSendClick}
                disabled={selectedLawyers.length === 0 || loading}
                variant={isTestMode ? "default" : "destructive"}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {isTestMode ? 'Enviando prueba...' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {isTestMode 
                      ? 'Enviar email de prueba' 
                      : `Enviar a ${selectedLawyers.length} abogado(s)`}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && lawyers.length === 0 && (
          <div className="text-center py-8">
            <CheckCircle className="h-10 w-10 text-green-900 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">¡Todos los perfiles están completos!</h3>
            <p className="text-gray-600">
              No hay abogados con perfiles incompletos en este momento.
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Confirmation Dialog for Production Mode */}
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar envío de emails?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de enviar emails reales a {selectedLawyers.length} abogado(s) con perfiles incompletos.
            <br /><br />
            <strong>Abogados seleccionados:</strong>
            <ul className="mt-2 space-y-1">
              {lawyers.filter(l => selectedLawyers.includes(l.id)).map(l => (
                <li key={l.id} className="text-sm">• {l.display_name || `${l.first_name} ${l.last_name}`} ({l.email})</li>
              ))}
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={sendEmails} className="bg-red-600 hover:bg-red-700">
            Sí, enviar emails
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
