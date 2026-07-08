import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLawyerJobs, type LawyerJob, type JobStatus } from '@/hooks/useLawyerJobs';
import {
  Search,
  FileText,
  Clock,
  DollarSign,
  Loader2,
  Eye,
  Send,
  CheckCircle2,
  XCircle,
  Ban,
  Hourglass,
  User,
  Mail,
  Phone,
  Play,
  ClipboardCheck,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  quote_pending: { label: 'Solicitud recibida', color: 'bg-yellow-100 text-yellow-800', icon: Hourglass },
  pending_payment: { label: 'Pendiente de pago', color: 'bg-yellow-100 text-yellow-800', icon: Hourglass },
  quote_sent: { label: 'Presupuesto enviado', color: 'bg-blue-100 text-blue-800', icon: Send },
  paid: { label: 'Pagado', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
  in_progress: { label: 'En progreso', color: 'bg-indigo-100 text-indigo-800', icon: Play },
  completed: { label: 'Entregado', color: 'bg-green-100 text-green-800', icon: ClipboardCheck },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expirado', color: 'bg-gray-100 text-gray-800', icon: Ban },
};

function JobStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.pending_payment;
  const Icon = config.icon;
  return (
    <Badge className={`${config.color} border-0`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function ServiceTypeBadge({ type }: { type: 'direct' | 'quote' }) {
  return (
    <Badge variant="outline" className="text-xs border-gray-300 text-gray-600">
      {type === 'direct' ? 'Pago inmediato' : 'Requiere presupuesto'}
    </Badge>
  );
}

interface JobDetailProps {
  job: LawyerJob;
  onClose: () => void;
  onStartWork: () => void;
  onMarkDelivered: () => void;
}

function JobDetailDialog({ job, onClose, onStartWork, onMarkDelivered }: JobDetailProps) {
  const navigate = useNavigate();
  const [startingWork, setStartingWork] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const { toast } = useToast();

  const handleStartWork = async () => {
    setStartingWork(true);
    try {
      onStartWork();
      toast({ title: 'Trabajo iniciado', description: 'El estado cambió a En progreso.' });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el trabajo',
        variant: 'destructive',
      });
    } finally {
      setStartingWork(false);
    }
  };

  const handleMarkDelivered = async () => {
    setDelivering(true);
    try {
      onMarkDelivered();
      toast({ title: 'Trabajo entregado', description: 'El estado cambió a Entregado.' });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo marcar como entregado',
        variant: 'destructive',
      });
    } finally {
      setDelivering(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{job.serviceTitle}</DialogTitle>
          <DialogDescription>
            Creado{' '}
            {formatDistanceToNow(parseISO(job.createdAt), {
              addSuffix: true,
              locale: es,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <JobStatusBadge status={job.status} />
            <ServiceTypeBadge type={job.serviceType} />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Cliente
            </h4>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{job.clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{job.clientEmail}</span>
            </div>
            {job.clientPhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{job.clientPhone}</span>
              </div>
            )}
          </div>

          {job.description && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Descripción del caso
              </h4>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">{job.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {job.price && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Precio
                </h4>
                <p className="font-medium mt-1">
                  ${job.price.toLocaleString('es-CL')}
                </p>
              </div>
            )}
            {job.deliveryTime && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Tiempo de entrega
                </h4>
                <p className="font-medium mt-1">{job.deliveryTime}</p>
              </div>
            )}
          </div>

          {job.quoteNotes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Notas del presupuesto
              </h4>
              <p className="text-sm bg-blue-50 p-3 rounded-lg">{job.quoteNotes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 flex-wrap">
          {job.status === 'quote_pending' && (
            <Button
              onClick={() => {
                navigate(`/lawyer/quotes/${job.quoteRequestId}`);
                onClose();
              }}
              className="bg-gray-900 hover:bg-green-900"
            >
              <Send className="h-4 w-4 mr-1" />
              Crear presupuesto
            </Button>
          )}
          {job.status === 'quote_sent' && (
            <Button
              variant="outline"
              onClick={() => {
                navigate(`/lawyer/quotes/${job.quoteRequestId}`);
                onClose();
              }}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver presupuesto
            </Button>
          )}
          {job.status === 'paid' && (
            <Button
              onClick={handleStartWork}
              disabled={startingWork}
              className="bg-gray-900 hover:bg-green-900"
            >
              {startingWork ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Comenzar trabajo
            </Button>
          )}
          {job.status === 'in_progress' && (
            <Button
              onClick={handleMarkDelivered}
              disabled={delivering}
              className="bg-green-700 hover:bg-green-800"
            >
              {delivering ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-1" />
              )}
              Marcar como entregado
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function JobsPage() {
  const navigate = useNavigate();
  const { jobs, loading, error, refetch, startWork, markDelivered } = useLawyerJobs();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedJob, setSelectedJob] = useState<LawyerJob | null>(null);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      const matchesSearch =
        j.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || j.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchTerm, statusFilter]);

  const handleStartWork = async () => {
    if (!selectedJob) return;
    try {
      await startWork(selectedJob);
      await refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo iniciar el trabajo',
        variant: 'destructive',
      });
    }
  };

  const handleMarkDelivered = async () => {
    if (!selectedJob) return;
    try {
      await markDelivered(selectedJob);
      await refetch();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo marcar como entregado',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trabajos</h1>
          <p className="text-muted-foreground">
            Servicios contratados y solicitudes de presupuesto
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por servicio o cliente..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="quote_pending">Solicitud recibida</SelectItem>
            <SelectItem value="pending_payment">Pendiente de pago</SelectItem>
            <SelectItem value="quote_sent">Presupuesto enviado</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.length > 0 ? (
          filtered.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg truncate">
                        {job.serviceTitle}
                      </h3>
                      <ServiceTypeBadge type={job.serviceType} />
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-700">{job.clientName}</span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(parseISO(job.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                      {job.price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          ${job.price.toLocaleString('es-CL')}
                        </div>
                      )}
                      {job.deliveryTime && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {job.deliveryTime}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <JobStatusBadge status={job.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJob(job)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalle
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay trabajos
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Intenta con otros filtros'
                : 'Los servicios contratados y solicitudes aparecerán aquí'}
            </p>
          </div>
        )}
      </div>

      {selectedJob && (
        <JobDetailDialog
          job={selectedJob}
          onClose={() => {
            setSelectedJob(null);
            refetch();
          }}
          onStartWork={handleStartWork}
          onMarkDelivered={handleMarkDelivered}
        />
      )}
    </div>
  );
}
