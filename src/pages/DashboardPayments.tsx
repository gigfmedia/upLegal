import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  CreditCard, 
  Search, 
  Calendar,
  DollarSign,
  Download,
  Eye,
  Filter,
  Receipt,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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

// Mock data para pagos
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Modal states
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewPayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setSelectedPayment(payment);
      setIsViewModalOpen(true);
    }
  };

  const handleDownloadInvoice = (payment: Payment) => {
    toast({
      title: "Descargando factura",
      description: `Generando PDF de la factura ${payment.invoiceNumber}...`,
    });
    // Simular descarga
    setTimeout(() => {
      toast({
        title: "Factura descargada",
        description: "El archivo PDF ha sido guardado en tu dispositivo.",
      });
    }, 2000);
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
      case 'consultation': return 'bg-blue-100 text-blue-800';
      case 'appointment': return 'bg-purple-100 text-purple-800';
      case 'subscription': return 'bg-green-100 text-green-800';
      case 'refund': return 'bg-red-100 text-red-800';
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
      case 'webpay': return 'WebPay';
      default: return method;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.lawyerName && payment.lawyerName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || payment.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calcular estadísticas
  const totalPaid = payments
    .filter(p => p.status === 'completed' && p.amount > 0)
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalRefunded = Math.abs(payments
    .filter(p => p.status === 'completed' && p.amount < 0)
    .reduce((sum, p) => sum + p.amount, 0));
  
  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pagos y Facturación</h1>
            <p className="text-muted-foreground">Gestiona tus pagos, facturas y suscripciones</p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pagado</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(totalPaid)}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pagos Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatPrice(pendingAmount)}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Wallet className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reembolsos</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPrice(totalRefunded)}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por descripción, factura o abogado..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los estados</option>
                  <option value="completed">Completado</option>
                  <option value="pending">Pendiente</option>
                  <option value="failed">Fallido</option>
                  <option value="refunded">Reembolsado</option>
                </select>
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="consultation">Consultas</option>
                  <option value="appointment">Citas</option>
                  <option value="subscription">Suscripciones</option>
                  <option value="refund">Reembolsos</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de pagos */}
      <div className="space-y-6">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="border-t border-gray-200">
            <CardContent className="p-6">
              <div className="flex flex-col space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {payment.description}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {payment.lawyerName || 'Pago de servicio'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className={getTypeColor(payment.type)}>
                      <span className="flex items-center">
                        {payment.type === 'consultation' && <CreditCard className="h-4 w-4 mr-1" />}
                        {payment.type === 'appointment' && <Calendar className="h-4 w-4 mr-1" />}
                        {payment.type === 'subscription' && <DollarSign className="h-4 w-4 mr-1" />}
                        {payment.type === 'refund' && <Receipt className="h-4 w-4 mr-1" />}
                        {getTypeText(payment.type)}
                      </span>
                    </Badge>
                    <Badge className={getStatusColor(payment.status)}>
                      {getStatusText(payment.status)}
                    </Badge>
                  </div>
                </div>

                  {/* Detalles principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Fecha</p>
                        <p className="text-sm">{formatDate(payment.date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CreditCard className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">Método</p>
                        <p className="text-sm">{getMethodText(payment.method)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-5 w-5 flex items-center justify-center text-gray-500">#</span>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Factura</p>
                        <p className="text-sm">{payment.invoiceNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-5 w-5 flex items-center justify-center text-gray-500">$</span>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Monto</p>
                        <p className={`text-sm font-medium ${
                          payment.amount >= 0 ? 'text-gray-900' : 'text-red-600'
                        }`}>
                          {formatPrice(payment.amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                {/* Acciones */}
                <div className="border-t mt-4 pt-4">
                  <div className="flex flex-col items-end space-y-2 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 w-full">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full sm:w-auto"
                      onClick={() => handleViewPayment(payment.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver detalles
                    </Button>
                    {payment.status === 'completed' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full sm:w-auto"
                        onClick={() => handleDownloadInvoice(payment)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Descargar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron pagos
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Aún no tienes pagos registrados.'
            }
          </p>
        </div>
      )}

      {/* Modal para ver detalles del pago */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl w-full h-full sm:h-auto sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-700">Detalles del Pago</DialogTitle>
            <DialogDescription className="text-gray-500">
              Información completa de la transacción
            </DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Descripción</Label>
                <p className="text-gray-900">{selectedPayment.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500 block">Tipo</Label>
                  <Badge className={getTypeColor(selectedPayment.type)}>
                    {getTypeText(selectedPayment.type)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500 block">Estado</Label>
                  <Badge className={getStatusColor(selectedPayment.status)}>
                    {getStatusText(selectedPayment.status)}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Número de Factura</Label>
                  <p className="text-gray-900 font-mono">{selectedPayment.invoiceNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">ID de Transacción</Label>
                  <p className="text-gray-900 font-mono text-sm">{selectedPayment.transactionId}</p>
                </div>
              </div>
              
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Monto</Label>
                  <p className={`text-lg font-semibold ${
                    selectedPayment.amount >= 0 ? 'text-gray-900' : 'text-red-600'
                  }`}>
                    {formatPrice(selectedPayment.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Método de Pago</Label>
                  <p className="text-gray-900">{getMethodText(selectedPayment.method)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Fecha</Label>
                  <p className="text-gray-900">{formatDate(selectedPayment.date)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Servicio</Label>
                  <p className="text-gray-900">{selectedPayment.relatedService}</p>
                </div>
              </div>
              
              {selectedPayment.lawyerName && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Abogado</Label>
                  <p className="text-gray-900">{selectedPayment.lawyerName}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Cerrar
            </Button>
            {selectedPayment?.status === 'completed' && (
              <Button onClick={() => selectedPayment && handleDownloadInvoice(selectedPayment)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar Factura
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
