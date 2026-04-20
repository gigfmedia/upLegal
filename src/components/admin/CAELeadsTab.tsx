import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Loader2, Mail, RefreshCw, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CAELead {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export function CAELeadsTab() {
  const [leads, setLeads] = useState<CAELead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<CAELead | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [replyEmail, setReplyEmail] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // Create admin client using service role key to bypass RLS
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      if (!serviceRoleKey || !supabaseUrl) {
        throw new Error('Missing admin credentials');
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      });

      const { data, error } = await adminClient
        .from('contact_messages')
        .select('*')
        .ilike('subject', '%CAE%')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching CAE leads:', error);
      toast.error('Error al cargar los leads de CAE');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleOpenReplyModal = (lead: CAELead) => {
    setSelectedLead(lead);
    setReplyEmail(lead.email);
    setReplySubject('Tu consulta sobre CAE en LegalUp');
    
    // Determine stage visually from subject
    let stageStr = 'TGR';
    if (lead.subject.includes('Banco')) stageStr = 'el Banco';
    else if (lead.subject.includes('Demanda')) stageStr = 'Demanda/Embargo';
    else if (lead.subject.includes('TGR')) stageStr = 'TGR';

    setReplyMessage(
`Hola! Te escribo porque hace unos días solicitaste revisar tu caso por deuda CAE en etapa ${stageStr}.

Quería saber si aún necesitas orientación, porque en esa etapa es importante revisar antes de tomar decisiones (como convenios o pagos).

Si quieres, puedo ayudarte a verlo 👍`
    );
    setIsModalOpen(true);
  };

  const handleSendReply = async () => {
    if (!replyEmail || !replySubject || !replyMessage) {
      toast.error('Por favor completa todos los campos.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/send-cae-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: replyEmail,
          subject: replySubject,
          message: replyMessage,
        }),
      });

      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Server returned non-JSON: ${text || response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(result.error || result.details || 'Error desconocido al enviar el correo');
      }

      toast.success('Correo enviado exitosamente.');
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error enviando mail CAE:', error);
      toast.error('Error al enviar correo: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Leads CAE</CardTitle>
            <CardDescription>
              Prospectos que llegaron por la campaña de Crédito con Aval del Estado.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Etapa (Asunto)</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No hay prospectos de CAE por el momento.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {lead.subject.replace('Consulta CAE: ', '')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenReplyModal(lead)}
                        className="bg-gray-100 hover:bg-gray-200"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Responder
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mailing: Lead CAE</DialogTitle>
            <DialogDescription>
              Responde automáticamente al usuario {selectedLead?.name}. El mensaje está precargado con el formato estándar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="toEmail">Para:</Label>
              <Input 
                id="toEmail" 
                value={replyEmail} 
                onChange={(e) => setReplyEmail(e.target.value)} 
                type="email"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subject">Asunto:</Label>
              <Input 
                id="subject" 
                value={replySubject} 
                onChange={(e) => setReplySubject(e.target.value)} 
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="message">Mensaje:</Label>
              <Textarea 
                id="message" 
                rows={8}
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSending}>
              Cancelar
            </Button>
            <Button onClick={handleSendReply} disabled={isSending} className="bg-gray-900 hover:bg-green-900">
              {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {isSending ? 'Enviando...' : 'Enviar correo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
