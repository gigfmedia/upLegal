
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  CreditCard,
  AlertCircle
} from "lucide-react";

interface EarningsStatsProps {
  stats: any;
}

export function EarningsStats({ stats }: EarningsStatsProps) {
  const mockTransactions = [
    {
      id: 1,
      client: "TechStart Inc.",
      amount: 2500,
      date: "Dec 15, 2024",
      status: "completed",
      service: "Corporate formation consultation"
    },
    {
      id: 2,
      client: "GlobalTech Solutions",
      amount: 5000,
      date: "Dec 12, 2024",
      status: "completed",
      service: "Employment law advisory"
    },
    {
      id: 3,
      client: "Sarah Wilson",
      amount: 1200,
      date: "Dec 10, 2024",
      status: "pending",
      service: "Family law mediation"
    },
    {
      id: 4,
      client: "Metro Real Estate",
      amount: 3200,
      date: "Dec 8, 2024",
      status: "completed",
      service: "Real estate transaction review"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.monthlyEarnings.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagos Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,200</div>
            <p className="text-xs text-yellow-600 mt-1">
              1 pago pendiente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Disponible</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$7,200</div>
            <Button size="sm" className="mt-2">
              Retirar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Meta Mensual</CardTitle>
          <CardDescription>Seguí tu progreso hacia la meta de ganancias mensual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Meta: $10,000</span>
              <span className="text-sm text-gray-600">${stats.monthlyEarnings.toLocaleString()} / $10,000</span>
            </div>
            <Progress value={(stats.monthlyEarnings / 10000) * 100} className="h-3" />
            <p className="text-sm text-gray-600">
              ${(10000 - stats.monthlyEarnings).toLocaleString()} restantes para alcanzar tu meta
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recordatorio sobre la configuración de MercadoPago */}
      {/*<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-medium">¡Importante!</span> Para recibir tus pagos, asegúrate de tener una cuenta en MercadoPago y haberla vinculado en la sección de pagos.
            </p>
          </div>
        </div>
      </div>*/}

      {/* Recent Transactions */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Ganancias</CardTitle>
              <CardDescription>Resumen de tus ingresos y transacciones</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.client}</p>
                      <p className="text-sm text-gray-600">{transaction.service}</p>
                      <p className="text-xs text-gray-500">{transaction.date}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ${transaction.amount.toLocaleString()}
                  </p>
                  <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                    {transaction.status === 'completed' ? 'completado' : transaction.status === 'pending' ? 'pendiente' : transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
