import { useState, useEffect } from 'react';
import { format, subMonths, subYears, isWithinInterval, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
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
  BarChart2
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  // Load transactions
  useEffect(() => {
    const loadTransactions = () => {
      setIsLoading(true);
      try {
        // In a real app, you would fetch this from your API
        const savedTransactions = localStorage.getItem('lawyerTransactions');
        
        if (savedTransactions) {
          const parsedTransactions = JSON.parse(savedTransactions) as Array<Omit<Transaction, 'date'> & { date: string }>;
          const transactionsWithDates = parsedTransactions.map(tx => ({
            ...tx,
            date: new Date(tx.date)
          }));
          setTransactions(transactionsWithDates);
        } else {
          // Generate mock data if no saved transactions
          const mockTransactions = generateMockTransactions();
          setTransactions(mockTransactions);
          // Save to localStorage for persistence
          localStorage.setItem('lawyerTransactions', JSON.stringify(mockTransactions));
        }
      } catch (error) {
        // Error loading transactions
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
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
      if (tx.status === 'completed' || tx.status === 'pending') {
        acc.total += tx.amount;
        acc.completed += tx.status === 'completed' ? tx.amount : 0;
        acc.pending += tx.status === 'pending' ? tx.amount : 0;
      }
      return acc;
    }, { total: 0, completed: 0, pending: 0 });
  };

  const filteredTransactions = getFilteredTransactions();
  const { total, completed, pending } = calculateEarnings(filteredTransactions);

  // Calculate monthly earnings for the selected year
  const getMonthlyEarnings = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthStart = new Date(selectedYear, i, 1);
      const monthEnd = endOfMonth(monthStart);
      
      const monthEarnings = transactions
        .filter(tx => 
          isWithinInterval(tx.date, { start: monthStart, end: monthEnd }) &&
          (tx.status === 'completed' || tx.status === 'pending')
        )
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      return {
        month: i,
        earnings: monthEarnings
      };
    });
    
    return months;
  };

  const monthlyEarnings = getMonthlyEarnings();
  const maxEarnings = Math.max(...monthlyEarnings.map(m => m.earnings), 0);

  // Get top services
  const getTopServices = () => {
    const serviceMap = new Map<string, { count: number; amount: number }>();
    
    filteredTransactions.forEach(tx => {
      if (tx.status === 'completed') {
        const service = serviceMap.get(tx.service) || { count: 0, amount: 0 };
        serviceMap.set(tx.service, {
          count: service.count + 1,
          amount: service.amount + tx.amount
        });
      }
    });
    
    return Array.from(serviceMap.entries())
      .map(([service, data]) => ({
        service,
        ...data,
        percentage: (data.amount / completed) * 100 || 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
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

  // Generate year options (last 5 years)
  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  
  // Month names in Spanish
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ingresos</h1>
            <p className="text-muted-foreground">
              Revisa tus ganancias y transacciones
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
          <CardContent className="pl-2">
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
    </div>
  );
}
