import { useState, useEffect } from 'react';
import { format, subMonths, subYears, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import { es } from 'date-fns/locale';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Download, 
  Clock,
  MessageSquare,
  Scale,
  RefreshCw,
  FileText,
  CheckCircle2,
  Clock4,
  Undo2,
  XCircle,
  BarChart2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface Transaction {
  id: string;
  date: Date;
  clientName: string;
  service: string;
  amount: number;
  status: 'completed' | 'pending' | 'refunded' | 'failed';
  type: 'consultation' | 'service' | 'subscription' | 'other';
}

type TimeRange = 'week' | 'month' | 'year' | 'all';

const generateMockTransactions = (): Transaction[] => {
  const services = ['Consulta Legal', 'Asesoría', 'Revisión de Contrato', 'Defensa Legal', 'Otros Servicios'];
  const clients = ['Juan Pérez', 'María González', 'Carlos López', 'Ana Martínez', 'Pedro Rodríguez'];
  const transactions: Transaction[] = [];
  
  // Generate transactions for the last 6 months
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    const amount = Math.floor(Math.random() * 1000) + 50; // $50 - $1050
    const statuses: Array<Transaction['status']> = ['completed', 'pending', 'refunded', 'failed'];
    const types: Array<Transaction['type']> = ['consultation', 'service', 'subscription', 'other'];
    
    transactions.push({
      id: `tx_${i + 1000}`,
      date,
      clientName: clients[Math.floor(Math.random() * clients.length)],
      service: services[Math.floor(Math.random() * services.length)],
      amount,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      type: types[Math.floor(Math.random() * types.length)]
    });
  }
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

export default function EarningsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [isMercadoPagoConnected, setIsMercadoPagoConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [mercadoPagoUser, setMercadoPagoUser] = useState<{
    email?: string;
    nickname?: string;
    connected_at?: string;
  } | null>(null);

  // Check MercadoPago connection status on component mount
  useEffect(() => {
    const checkMercadoPagoConnection = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('mercado_pago_connected, mercado_pago_email, mercado_pago_nickname, mercado_pago_connected_at')
          .eq('id', session.user.id)
          .single();

        if (profile?.mercado_pago_connected) {
          setIsMercadoPagoConnected(true);
          setMercadoPagoUser({
            email: profile.mercado_pago_email || undefined,
            nickname: profile.mercado_pago_nickname || undefined,
            connected_at: profile.mercado_pago_connected_at
          });
        }
      } catch (error) {
        console.error('Error checking MercadoPago connection:', error);
      }
    };

    checkMercadoPagoConnection();
  }, []);

  const handleConnectMercadoPago = async () => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // For MercadoPago Chile, we need to use the web platform integration
      const clientId = '5728750272037413';
      const state = Math.random().toString(36).substring(2);
      
      // Save state for validation after redirect
      localStorage.setItem('mp_auth_state', state);
      
      // Build the authorization URL for MercadoPago Chile (production)
      const authUrl = new URL('https://www.mercadopago.cl/developers/panel/app/5728750272037413/webhooks');
      
      // Alternative direct integration URL
      // const authUrl = new URL('https://www.mercadopago.cl/developers/panel/app/5728750272037413/webhooks');
      
      // If still not working, try the marketplace URL
      // const authUrl = new URL('https://www.mercadopago.cl/developers/panel/app/5728750272037413/marketplace_places/new');
      
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('platform_id', 'mp');
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('production', 'true');
      
      console.log('Redirecting to MercadoPago:', authUrl.toString());
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Error connecting to MercadoPago:', error);
      setConnectionError('Error al conectar con MercadoPago. Por favor, inténtalo de nuevo.');
    } finally {
      setIsConnecting(false);
    }
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Fetch transactions from the database
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch payments from the database
      const { data: payments, error } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          status,
          created_at,
          is_test,
          appointment_id (
            id,
            client_id,
            client:profiles!appointments_client_id_fkey (
              first_name,
              last_name
            ),
            service_type
          )
        `)
        .eq('lawyer_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Raw payments data from database:', payments);

      // Filter out test payments and transform the data
      const formattedTransactions: Transaction[] = (payments || [])
        .filter(payment => {
          // Skip test payments and payments with 0 amount
          const isTestPayment = payment.is_test || payment.amount === 0;
          if (isTestPayment) {
            console.log('Filtering out test payment:', payment);
            return false;
          }
          return true;
        })
        .map(payment => ({
          id: payment.id,
          date: new Date(payment.created_at),
          clientName: payment.appointment_id?.client 
            ? `${payment.appointment_id.client.first_name} ${payment.appointment_id.client.last_name}`.trim() || 'Cliente'
            : 'Cliente',
          service: payment.appointment_id?.service_type || 'Consulta',
          amount: payment.amount,
          status: payment.status as Transaction['status'],
          type: 'consultation'
        }));

      console.log('Formatted transactions:', formattedTransactions);
      setTransactions(formattedTransactions);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Don't fall back to mock data in production
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load transactions
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Filter transactions based on selected time range
  const getFilteredTransactions = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'week':
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = new Date(selectedYear, 0, 1);
        break;
      case 'all':
      default:
        return transactions;
    }
    
    return transactions.filter(tx => 
      isWithinInterval(tx.date, { start: startDate, end: now })
    );
  };

  // Calculate earnings summary
  const calculateEarnings = (transactions: Transaction[]) => {
    return transactions.reduce((acc, tx) => {
      acc.total += tx.amount;
      
      if (tx.status === 'completed') {
        acc.completed += tx.amount;
      } else if (tx.status === 'pending') {
        acc.pending += tx.amount;
      }
      
      return acc;
    }, { total: 0, completed: 0, pending: 0 });
  };

  const filteredTransactions = getFilteredTransactions();
  const { total, completed, pending } = calculateEarnings(filteredTransactions);

  // Calculate monthly earnings for the selected year
  const getMonthlyEarnings = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(selectedYear, i, 1);
      const monthEnd = endOfMonth(monthStart);
      
      // Filter transactions for the current month and year
      const monthlyTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return (
          txDate.getFullYear() === selectedYear &&
          txDate.getMonth() === i &&
          (tx.status === 'completed' || tx.status === 'pending')
        );
      });
      
      // Calculate total earnings for the month
      const monthEarnings = monthlyTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      return {
        month: i,
        earnings: monthEarnings,
        // Add count for reference if needed
        transactionCount: monthlyTransactions.length
      };
    });
  };

  const monthlyEarnings = getMonthlyEarnings();
  const maxEarnings = Math.max(...monthlyEarnings.map(m => m.earnings), 0);

  // Get top services with real transaction data
  const getTopServices = () => {
    // Group transactions by service and calculate totals
    const serviceStats = transactions
      .filter(tx => tx.status === 'completed')
      .reduce((acc, tx) => {
        const serviceName = tx.service || 'Sin categoría';
        const service = acc.get(serviceName) || { count: 0, amount: 0 };
        
        return acc.set(serviceName, {
          count: service.count + 1,
          amount: service.amount + tx.amount
        });
      }, new Map<string, { count: number; amount: number }>());
    
    // Convert to array and sort by amount (descending)
    const sortedServices = Array.from(serviceStats.entries())
      .map(([service, data]) => ({
        service,
        count: data.count,
        amount: data.amount,
        percentage: completed > 0 ? (data.amount / completed) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5); // Get top 5 services
    
    // If no services found, return a default message
    if (sortedServices.length === 0) {
      return [{
        service: 'No hay servicios completados',
        count: 0,
        amount: 0,
        percentage: 0
      }];
    }
    
    return sortedServices;
  };

  const topServices = getTopServices();

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    const iconClass = 'h-5 w-5 text-primary';
    switch (type) {
      case 'consultation':
        return <MessageSquare className={iconClass} />;
      case 'service':
        return <Scale className={iconClass} />;
      case 'subscription':
        return <RefreshCw className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  // Generate year options (from current year + 1 to 2025, in descending order)
  const currentYear = new Date().getFullYear();
  const startYear = 2025;
  const endYear = Math.max(currentYear + 1, startYear);
  const yearsCount = endYear - startYear + 1;
  const yearOptions = Array.from(
    { length: yearsCount },
    (_, i) => endYear - i
  );
  
  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ganancias</h1>
          <p className="text-muted-foreground">
            Revisa tus ingresos y transacciones
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs 
          value={timeRange} 
          onValueChange={(value) => setTimeRange(value as TimeRange)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="week">Esta semana</TabsTrigger>
            <TabsTrigger value="month">Este mes</TabsTrigger>
            <TabsTrigger value="year">Este año</TabsTrigger>
            <TabsTrigger value="all">Todo</TabsTrigger>
          </TabsList>
        </Tabs>

        {timeRange === 'year' && (
          <div className="flex items-center space-x-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* MercadoPago Connection Status */}
      {/*{!isMercadoPagoConnected ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">¡Importante!</span> Para recibir tus pagos, debes vincular tu cuenta de MercadoPago.
                </p>
                {connectionError && (
                  <p className="text-sm text-red-600 mt-1">{connectionError}</p>
                )}
              </div>
            </div>
            <Button 
              onClick={handleConnectMercadoPago}
              variant="outline" 
              size="sm"
              disabled={isConnecting}
              className="whitespace-nowrap bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300"
            >
              <span className="flex items-center">
                <img 
                  src="https://http2.mlstatic.com/frontend-assets/mp-web-navigation/ui-navigation/7.0.17/mercadopago/logo__large@2x.png" 
                  alt="MercadoPago" 
                  className="h-4 mr-2" 
                />
                {isConnecting ? 'Conectando...' : 'Vincular Cuenta'}
              </span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                <span className="font-medium">¡Excelente!</span> Tu cuenta de MercadoPago está vinculada correctamente.
              </p>
              {mercadoPagoUser?.email && (
                <p className="text-xs text-green-600 mt-1">
                  Conectado como: {mercadoPagoUser.email}
                  {mercadoPagoUser.connected_at && (
                    <span className="block text-xs text-green-500">
                      Vinculada el: {new Date(mercadoPagoUser.connected_at).toLocaleDateString()}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}*/}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Ingresos Totales</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(total)}</div>
            <p className="text-sm text-muted-foreground">
              {timeRange === 'week' 
                ? 'Últimos 7 días' 
                : timeRange === 'month' 
                  ? 'Este mes' 
                  : timeRange === 'year'
                    ? `Año ${selectedYear}`
                    : 'Todo el historial'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Ingresos Cobrados</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(completed)}</div>
            <p className="text-sm text-muted-foreground">
              Transacciones completadas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Pendientes de Pago</span>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pending)}</div>
            <p className="text-sm text-muted-foreground">
              En proceso de verificación
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Transacciones</span>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredTransactions.filter(tx => tx.status === 'completed').length}
            </div>
            <p className="text-sm text-muted-foreground">
              {timeRange === 'week' 
                ? 'Esta semana' 
                : timeRange === 'month' 
                  ? 'Este mes' 
                  : timeRange === 'year'
                    ? `Año ${selectedYear}`
                    : 'Total'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Monthly Earnings Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Resumen de Ingresos</CardTitle>
            <CardDescription>
              {timeRange === 'year' 
                ? `Ingresos mensuales para ${selectedYear}` 
                : 'Tus ingresos a lo largo del tiempo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timeRange === 'year' ? (
              <div className="mt-4 space-y-4">
                {monthlyEarnings.map(({ month, earnings }) => (
                  <div key={month} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{monthNames[month]}</span>
                      <span className="text-sm font-medium">{formatCurrency(earnings)}</span>
                    </div>
                    <Progress 
                      value={(earnings / Math.max(maxEarnings, 1)) * 100} 
                      className="h-2" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Selecciona "Este año" para ver el gráfico de ingresos mensuales
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Servicios Populares</CardTitle>
            <CardDescription>
              Tus servicios más rentables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topServices.length > 0 ? (
                topServices.map(({ service, amount, count, percentage }) => (
                  <div key={service} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{service}</span>
                      <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{count} {count === 1 ? 'transacción' : 'transacciones'}</span>
                      <span>{percentage.toFixed(1)}% del total</span>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No hay datos de servicios para mostrar
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transacciones Recientes</CardTitle>
              <CardDescription>
                Últimas {filteredTransactions.length} transacciones
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getTypeIcon(transaction.type)}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{transaction.service}</h3>
                      <span className="font-medium">
                        {transaction.status === 'refunded' ? '-' : ''}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{transaction.clientName}</span>
                      <span>{format(transaction.date, 'd MMM yyyy', { locale: es })}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status === 'completed' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Completado</span>
                        </>
                      ) : transaction.status === 'pending' ? (
                        <>
                          <Clock4 className="h-3.5 w-3.5" />
                          <span>Pendiente</span>
                        </>
                      ) : transaction.status === 'refunded' ? (
                        <>
                          <Undo2 className="h-3.5 w-3.5" />
                          <span>Reembolsado</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          <span>Fallido</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay transacciones para mostrar en el período seleccionado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
