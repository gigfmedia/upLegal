import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Send, CheckCircle, X, Loader2, Upload, Users } from 'lucide-react';
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

interface CustomerData {
  id?: string;
  email: string;
  name?: string;
  source?: string;
  created_at?: string;
}

interface CustomerMarketingEmailProps {
  onClose?: () => void;
}

export function CustomerMarketingEmail({ onClose }: CustomerMarketingEmailProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isTestMode, setIsTestMode] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState('¿Tienes un problema legal? Te ayudamos en minutos');
  const [csvUploading, setCsvUploading] = useState(false);
  const { toast } = useToast();

  // No database fetch - only CSV upload

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const newCustomers: CustomerData[] = [];
        
        lines.forEach((line, index) => {
          if (index === 0 && (line.toLowerCase().includes('email') || line.toLowerCase().includes('correo'))) {
            return; // Skip header
          }
          
          const columns = line.split(',').map(c => c.trim());
          const email = columns[0];
          const name = columns[1];
          
          if (email && email.includes('@')) {
            newCustomers.push({
              email: email.toLowerCase(),
              name: name || undefined,
              source: 'CSV Import'
            });
          }
        });

        // Add new customers, avoiding duplicates
        setCustomers(prev => {
          const existingEmails = new Set(prev.map(c => c.email.toLowerCase()));
          const uniqueNew = newCustomers.filter(c => !existingEmails.has(c.email.toLowerCase()));
          return [...prev, ...uniqueNew];
        });

        toast({
          title: 'CSV importado',
          description: `Se agregaron ${newCustomers.length} emails nuevos`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'No se pudo procesar el archivo CSV',
          variant: 'destructive',
        });
      } finally {
        setCsvUploading(false);
      }
    };

    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const toggleCustomerSelection = (email: string) => {
    setSelectedCustomers(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.email));
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  const handleSendClick = () => {
    if (selectedCustomers.length === 0) {
      toast({
        title: 'Error',
        description: 'Debes seleccionar al menos un destinatario',
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

      const targetEmails = isTestMode 
        ? ['gigfmedia@icloud.com'] 
        : selectedCustomers;

      const selectedCustomersData = customers.filter(c => selectedCustomers.includes(c.email));

      const { error } = await supabase.functions.invoke('send-customer-marketing-emails', {
        body: {
          emails: targetEmails,
          subject: emailSubject,
          customers: selectedCustomersData,
          testMode: isTestMode,
        }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(typeof error === 'string' ? error : error.message || 'Error desconocido');
      }

      toast({
        title: isTestMode ? 'Email de prueba enviado' : 'Emails enviados',
        description: isTestMode 
          ? `Revisa tu bandeja de entrada: gigfmedia@icloud.com`
          : `Se enviaron ${targetEmails.length} emails a los clientes seleccionados`,
      });
      
      onClose?.();

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

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {isTestMode ? 'Email de Prueba' : 'Enviar Email'} - Marketing a Clientes
              </CardTitle>
              <div className="mt-2">
                <p>
                  {isTestMode 
                    ? 'Envía un email de prueba a gigfmedia@icloud.com para validar el diseño antes de enviar a clientes.'
                    : `Envía emails de marketing a ${selectedCustomers.length} cliente(s) seleccionado(s).`}
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
                Producción (clientes)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Loading state for CSV */}
        {csvUploading && (
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Subject line */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Asunto del email
          </label>
          <Input
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Asunto del email..."
          />
        </div>

        {/* CSV Upload */}
        <div className="border rounded-lg p-4 bg-gray-50">
          <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar emails desde CSV
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Formato: email,nombre (una fila por email, primera fila puede ser header)
          </p>
          <Input
            type="file"
            accept=".csv,.txt"
            onChange={handleCsvUpload}
            disabled={csvUploading}
          />
        </div>

        {/* Customers list */}
        {customers.length > 0 && (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {selectedCustomers.length} de {customers.length} seleccionados
                </span>
                <Button variant="outline" size="sm" onClick={selectAllCustomers}>
                  Seleccionar todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar selección
                </Button>
              </div>
            </div>

            {/* Customers grid */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {customers.map((customer) => {
                const isSelected = selectedCustomers.includes(customer.email);
                
                return (
                  <div
                    key={customer.email}
                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => toggleCustomerSelection(customer.email)}
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
                          {customer.name || customer.email}
                        </div>
                        <div className="text-sm text-gray-600">{customer.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {customer.source}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Send button */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSendClick}
                disabled={selectedCustomers.length === 0 || loading}
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
                      : `Enviar a ${selectedCustomers.length} cliente(s)`}
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Empty state */}
        {customers.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-green-900 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sube tu lista de emails</h3>
            <p className="text-gray-600">
              Importa emails desde un archivo CSV para enviar el mailing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Confirmation Dialog for Production Mode */}
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogContent className="z-[10000]">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Confirmar envío de emails?</AlertDialogTitle>
          <AlertDialogDescription>
            Estás a punto de enviar emails de marketing a {selectedCustomers.length} cliente(s).
            <br /><br />
            <strong>Asunto:</strong> {emailSubject}
            <br /><br />
            <strong>Destinatarios seleccionados:</strong>
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {customers.filter(c => selectedCustomers.includes(c.email)).map(c => (
                <div key={c.email} className="text-sm">• {c.name || c.email} ({c.email})</div>
              ))}
            </div>
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
