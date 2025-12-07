import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { DashboardContainer } from '@/components/dashboard/DashboardContainer';
import { 
  CreditCard, 
  Search, 
  Calendar,
  Download,
  Eye,
  Filter,
  Receipt,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Payment {
  id: string;
  type: 'consultation' | 'appointment' | 'subscription' | 'refund';
  description: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: string;
  method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'webpay';
  relatedService: string;
  invoiceNumber: string;
  lawyerName?: string;
  transactionId: string;
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
  spanFull?: boolean;
}

const StatCard = ({ title, value, icon, className = '', spanFull = false }: StatCardProps) => (
  <Card className={`p-4 sm:p-6 bg-white ${spanFull ? 'col-span-full' : ''} ${className}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs sm:text-sm font-medium text-gray-500">{title}</p>
        <p className="text-lg sm:text-2xl font-semibold mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-opacity-20">
        {icon}
      </div>
    </div>
  </Card>
);

const formatPrice = (amount: number) => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('es-CL', options);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'failed': return 'bg-red-100 text-red-800';
    case 'refunded': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return 'Completado';
    case 'pending': return 'Pendiente';
    case 'failed': return 'Fallido';
    case 'refunded': return 'Reembolsado';
    default: return status;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'consultation': return 'bg-purple-100 text-purple-800';
    case 'appointment': return 'bg-indigo-100 text-indigo-800';
    case 'subscription': return 'bg-pink-100 text-pink-800';
    case 'refund': return 'bg-amber-100 text-amber-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'consultation': return 'Consulta';
    case 'appointment': return 'Cita';
    case 'subscription': return 'Suscripción';
    case 'refund': return 'Reembolso';
    default: return type;
  }
};

const getMethodText = (method: string) => {
  switch (method) {
    case 'credit_card': return 'Tarjeta de Crédito';
    case 'debit_card': return 'Tarjeta de Débito';
    case 'bank_transfer': return 'Transferencia Bancaria';
    case 'webpay': return 'Webpay';
    default: return method;
  }
};

const mockPayments: Payment[] = [
  {
    id: '1',
    type: 'consultation',
    description: 'Consulta sobre Contrato Laboral',
    amount: 45000,
    status: 'completed',
    date: '2024-01-15',
    method: 'credit_card',
    relatedService: 'Consulta Legal',
    invoiceNumber: 'INV-2024-001',
    lawyerName: 'María González',
    transactionId: 'TXN-20240115-001'
  },
  {
    id: '2',
    type: 'appointment',
    description: 'Cita presencial - Revisión de Contrato',
    amount: 80000,
    status: 'completed',
    date: '2024-01-12',
    method: 'webpay',
    relatedService: 'Cita Legal',
    invoiceNumber: 'INV-2024-002',
    lawyerName: 'Carlos Rodríguez',
    transactionId: 'TXN-20240112-002'
  },
  {
    id: '3',
    type: 'subscription',
    description: 'Plan Premium - Enero 2024',
    amount: 25000,
    status: 'completed',
    date: '2024-01-01',
    method: 'credit_card',
    relatedService: 'Suscripción Premium',
    invoiceNumber: 'INV-2024-003',
    transactionId: 'TXN-20240101-003'
  },
  {
    id: '4',
    type: 'consultation',
    description: 'Consulta sobre Derecho Familiar',
    amount: 50000,
    status: 'pending',
    date: '2024-01-20',
    method: 'bank_transfer',
    relatedService: 'Consulta Legal',
    invoiceNumber: 'INV-2024-004',
    lawyerName: 'Ana Martínez',
    transactionId: 'TXN-20240120-004'
  },
  {
    id: '5',
    type: 'appointment',
    description: 'Videollamada - Asesoría Comercial',
    amount: 60000,
    status: 'failed',
    date: '2024-01-18',
    method: 'debit_card',
    relatedService: 'Cita Legal',
    invoiceNumber: 'INV-2024-005',
    lawyerName: 'Luis Fernández',
    transactionId: 'TXN-20240118-005'
  },
  {
    id: '6',
    type: 'refund',
    description: 'Reembolso - Cita cancelada',
    amount: -35000,
    status: 'completed',
    date: '2024-01-10',
    method: 'credit_card',
    relatedService: 'Reembolso',
    invoiceNumber: 'REF-2024-001',
    lawyerName: 'Patricia Silva',
    transactionId: 'TXN-20240110-006'
  },
  {
    id: '7',
    type: 'consultation',
    description: 'Consulta sobre Derecho Penal',
    amount: 55000,
    status: 'completed',
    date: '2024-01-08',
    method: 'webpay',
    relatedService: 'Consulta Legal',
    invoiceNumber: 'INV-2024-007',
    lawyerName: 'Ana Martínez',
    transactionId: 'TXN-20240108-007'
  },
  {
    id: '8',
    type: 'appointment',
    description: 'Cita telefónica - Consulta rápida',
    amount: 30000,
    status: 'completed',
    date: '2024-01-05',
    method: 'credit_card',
    relatedService: 'Cita Legal',
    invoiceNumber: 'INV-2024-008',
    lawyerName: 'María González',
    transactionId: 'TXN-20240105-008'
  }
];

export default function DashboardPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  
  // Calcular totales
  const totalPaid = mockPayments
    .filter(payment => payment.status === 'completed' && payment.amount > 0)
    .reduce((sum, payment) => sum + payment.amount, 0);
    
  const pendingAmount = mockPayments
    .filter(payment => payment.status === 'pending')
    .reduce((sum, payment) => sum + payment.amount, 0);
    
  const totalRefunded = mockPayments
    .filter(payment => payment.status === 'refunded')
    .reduce((sum, payment) => sum + Math.abs(payment.amount), 0);
  
  // Filtrar pagos
  const filteredPayments = mockPayments.filter(payment => {
    const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || payment.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });
  
  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsViewModalOpen(true);
  };
  
  const handleDownloadInvoice = (payment: Payment) => {
    // Simular descarga de factura
    toast({
      title: 'Descarga de factura',
      description: `Iniciando descarga de la factura ${payment.invoiceNumber}`,
      variant: 'default',
    });
  };
  
  return (
    <DashboardContainer
      title="Pagos"
      description="Revisa el historial de tus pagos y facturas"
      className="bg-white"
      headerAction={
        <Button className="hidden sm:flex">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      }
    >
      <div className="space-y-4 sm:space-y-6 bg-white">
        {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar pagos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm sm:text-base w-full h-10"
                />
              </div>
              
              <div className="flex gap-3 w-full">
                <div className="w-full">
                  <Select 
                    value={statusFilter} 
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="failed">Fallido</SelectItem>
                      <SelectItem value="refunded">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-full">
                  <Select 
                    value={typeFilter} 
                    onValueChange={setTypeFilter}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="consultation">Consultas</SelectItem>
                      <SelectItem value="appointment">Citas</SelectItem>
                      <SelectItem value="subscription">Suscripciones</SelectItem>
                      <SelectItem value="refund">Reembolsos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

        
        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard 
            title="Total Pagado"
            value={formatPrice(totalPaid)}
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            className="bg-white border border-gray-200 shadow-sm"
          />
          
          <StatCard 
            title="Pagos Pendientes"
            value={formatPrice(pendingAmount)}
            icon={<Wallet className="h-5 w-5 text-yellow-600" />}
            className="bg-white border border-gray-200 shadow-sm"
          />
          
          <StatCard 
            title="Reembolsos"
            value={formatPrice(totalRefunded)}
            icon={<Receipt className="h-5 w-5 text-blue-600" />}
            className="bg-white border border-gray-200 shadow-sm"
          />
        </div>
        
        {/* Lista de pagos */}
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {filteredPayments.length > 0 ? (
              <div className="space-y-4">
                {filteredPayments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${getTypeColor(payment.type)}`}>
                            <CreditCard className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{payment.description}</h4>
                            <p className="text-sm text-gray-500">
                              {formatDate(payment.date)} • {payment.lawyerName || 'Sistema'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getStatusColor(payment.status)}>
                          {getStatusText(payment.status)}
                        </Badge>
                        <p className={`text-right font-medium ${
                          payment.amount >= 0 ? 'text-gray-900' : 'text-red-600'
                        }`}>
                          {formatPrice(payment.amount)}
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewPayment(payment)}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalles</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No se encontraron pagos
                </h3>
                <p className="text-gray-500">
                  {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'Intenta con otros filtros de búsqueda.'
                    : 'Aún no hay pagos registrados.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Modal de detalles de pago */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle>Detalles del pago</DialogTitle>
                <DialogDescription>
                  Información detallada del pago realizado el {formatDate(selectedPayment.date)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <h4 className="font-medium">{selectedPayment.description}</h4>
                  <p className="text-sm text-gray-500">{selectedPayment.lawyerName || 'Sistema'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Tipo</Label>
                    <Badge className={`${getTypeColor(selectedPayment.type)}`}>
                      {getTypeText(selectedPayment.type)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Estado</Label>
                    <Badge className={getStatusColor(selectedPayment.status)}>
                      {getStatusText(selectedPayment.status)}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">Monto</Label>
                    <p className={`font-medium ${
                      selectedPayment.amount >= 0 ? 'text-gray-900' : 'text-red-600'
                    }`}>
                      {formatPrice(selectedPayment.amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Método de pago</Label>
                    <p className="font-medium">{getMethodText(selectedPayment.method)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-gray-500">N° de factura</Label>
                    <p className="font-mono text-sm">{selectedPayment.invoiceNumber}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">ID de transacción</Label>
                    <p className="font-mono text-xs text-gray-500 break-all">{selectedPayment.transactionId}</p>
                  </div>
                </div>
                
                {selectedPayment.relatedService && (
                  <div>
                    <Label className="text-xs text-gray-500">Servicio relacionado</Label>
                    <p className="text-sm">{selectedPayment.relatedService}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="sm:justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Cerrar
                </Button>
                {selectedPayment.status === 'completed' && (
                  <Button 
                    onClick={() => handleDownloadInvoice(selectedPayment)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar factura
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardContainer>
  );
};
