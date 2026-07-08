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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useClientServices, type ClientService } from '@/hooks/useClientServices';
import { ratingService } from '@/services/ratingService';
import {
  Search,
  FileText,
  Clock,
  DollarSign,
  Loader2,
  Eye,
  ExternalLink,
  Star,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Hourglass,
  Ban,
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending_payment: { label: 'Pendiente de pago', color: 'bg-yellow-100 text-yellow-800', icon: Hourglass },
  quote_pending: { label: 'Solicitud enviada', color: 'bg-yellow-100 text-yellow-800', icon: Send },
  quote_received: { label: 'Presupuesto recibido', color: 'bg-blue-100 text-blue-800', icon: FileText },
  in_progress: { label: 'En progreso', color: 'bg-blue-100 text-blue-800', icon: Clock },
  completed: { label: 'Pagado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
  expired: { label: 'Expirado', color: 'bg-gray-100 text-gray-800', icon: Ban },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function ServiceStatusBadge({ status }: { status: string }) {
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

interface ServiceDetailProps {
  service: ClientService;
  onClose: () => void;
  onReview: (lawyerId: string) => void;
}

function ServiceDetailDialog({ service, onClose, onReview }: ServiceDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const handlePay = () => {
    if (service.type === 'quote' && service.paymentLink) {
      window.open(service.paymentLink, '_blank');
    }
    if (service.type === 'direct' && service.mercadopagoPreferenceId) {
      window.open(
        `https://www.mercadopago.cl/checkout/v1/redirect?preference-id=${service.mercadopagoPreferenceId}`,
        '_blank'
      );
    }
  };

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    if (!user?.id) return;

    setSubmittingRating(true);
    try {
      await ratingService.createRating(
        { lawyerId: service.lawyerId, rating, comment: comment.trim() || undefined },
        user.id
      );
      toast({ title: 'Reseña enviada', description: 'Gracias por tu opinión.' });
      setAlreadyReviewed(true);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la reseña',
        variant: 'destructive',
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{service.serviceTitle}</DialogTitle>
          <DialogDescription>
            Creado el {format(parseISO(service.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={service.lawyerAvatar || undefined} />
              <AvatarFallback className="bg-gray-200 text-sm">
                {getInitials(service.lawyerName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{service.lawyerName}</p>
              <p className="text-xs text-gray-500">Abogado</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ServiceStatusBadge status={service.status} />
            <ServiceTypeBadge type={service.type} />
          </div>

          {service.serviceDescription && (
            <div>
              <Label className="text-xs text-gray-500">Descripción</Label>
              <p className="text-sm mt-1">{service.serviceDescription}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            {service.deliveryTime && (
              <div>
                <Label className="text-xs text-gray-500">Tiempo de entrega</Label>
                <p className="font-medium">{service.deliveryTime}</p>
              </div>
            )}
            {service.price && (
              <div>
                <Label className="text-xs text-gray-500">Precio</Label>
                <p className="font-medium">${service.price.toLocaleString('es-CL')}</p>
              </div>
            )}
            {service.quoteNotes && (
              <div className="col-span-2">
                <Label className="text-xs text-gray-500">Notas del abogado</Label>
                <p className="text-sm mt-1 bg-blue-50 p-3 rounded-lg">{service.quoteNotes}</p>
              </div>
            )}
          </div>

          {(service.status === 'completed' || service.status === 'in_progress') && !alreadyReviewed && (
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Dejar una reseña</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-0.5 transition-colors ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Cuenta tu experiencia (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button
                size="sm"
                onClick={handleSubmitReview}
                disabled={rating === 0 || submittingRating}
                className="bg-gray-900 hover:bg-green-900"
              >
                {submittingRating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Star className="h-4 w-4 mr-1" />
                )}
                Enviar reseña
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          {(service.status === 'pending_payment' || service.status === 'quote_received') && (
            <Button onClick={handlePay} className="bg-gray-900 hover:bg-green-900">
              <ExternalLink className="h-4 w-4 mr-1" />
              {service.status === 'quote_received' ? 'Pagar presupuesto' : 'Continuar pago'}
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

export default function DashboardServices() {
  const navigate = useNavigate();
  const { services, loading, error } = useClientServices();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<ClientService | null>(null);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.serviceTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.lawyerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchesType = typeFilter === 'all' || s.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [services, searchTerm, statusFilter, typeFilter]);

  if (loading) {
    return (
      <div className="container mx-auto px-8 py-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-8 py-6">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar servicios</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis Servicios</h1>
          <p className="text-muted-foreground">
            Todos tus servicios contratados y solicitudes de presupuesto
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por servicio o abogado..."
            className="w-full pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending_payment">Pendiente de pago</SelectItem>
            <SelectItem value="quote_pending">Solicitud enviada</SelectItem>
            <SelectItem value="quote_received">Presupuesto recibido</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="completed">Pagado / Completado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="direct">Pago inmediato</SelectItem>
            <SelectItem value="quote">Requiere presupuesto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filtered.length > 0 ? (
          filtered.map((service) => {
            const StatusIcon = statusConfig[service.status]?.icon || Hourglass;
            return (
              <Card key={`${service.type}-${service.id}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg truncate">{service.serviceTitle}</h3>
                        <ServiceTypeBadge type={service.type} />
                      </div>

                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={service.lawyerAvatar || undefined} />
                          <AvatarFallback className="bg-gray-200 text-[10px]">
                            {getInitials(service.lawyerName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-gray-700">{service.lawyerName}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(parseISO(service.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                        {service.price && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${service.price.toLocaleString('es-CL')}
                          </div>
                        )}
                        {service.deliveryTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {service.deliveryTime}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <ServiceStatusBadge status={service.status} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedService(service)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver detalle
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay servicios</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Intenta con otros filtros'
                : 'Los servicios que contrates aparecerán aquí'}
            </p>
          </div>
        )}
      </div>

      {selectedService && (
        <ServiceDetailDialog
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onReview={(lawyerId) => {
            setSelectedService(null);
          }}
        />
      )}
    </div>
  );
}
