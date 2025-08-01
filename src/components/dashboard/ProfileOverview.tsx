
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  DollarSign,
  MessageSquare,
  Calendar,
  FileText
} from "lucide-react";

interface ProfileOverviewProps {
  user: any;
  stats: any;
  recentActivity: any[];
}

export function ProfileOverview({ user, stats, recentActivity }: ProfileOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento de Este Mes</CardTitle>
          <CardDescription>Tus métricas clave e indicadores de rendimiento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tiempo de Respuesta</span>
                <Badge variant="secondary">{stats.responseTime}</Badge>
              </div>
              <Progress value={85} className="h-2" />
              <p className="text-xs text-gray-500">Más rápido que el 85% de los abogados</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Satisfacción del Cliente</span>
                <Badge variant="default">98%</Badge>
              </div>
              <Progress value={98} className="h-2" />
              <p className="text-xs text-gray-500">Excelente feedback de clientes</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Éxito de Proyectos</span>
                <Badge variant="default">{stats.successRate}%</Badge>
              </div>
              <Progress value={stats.successRate} className="h-2" />
              <p className="text-xs text-gray-500">Por encima del promedio de la plataforma</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Tus últimas interacciones con clientes y transacciones</CardDescription>
            </div>
            <Button variant="outline" size="sm">Ver Todo</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {activity.type === 'project_completed' && (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                  {activity.type === 'proposal_sent' && (
                    <FileText className="h-8 w-8 text-blue-500" />
                  )}
                  {activity.type === 'contract_signed' && (
                    <DollarSign className="h-8 w-8 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">Cliente: {activity.client}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {activity.amount && (
                    <p className="text-sm font-medium text-green-600">
                      +${activity.amount.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">{activity.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Tareas comunes y accesos directos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start h-12">
              <MessageSquare className="mr-3 h-4 w-4" />
              Revisar Mensajes
            </Button>
            <Button variant="outline" className="justify-start h-12">
              <Calendar className="mr-3 h-4 w-4" />
              Agendar Reunión
            </Button>
            <Button variant="outline" className="justify-start h-12">
              <FileText className="mr-3 h-4 w-4" />
              Crear Propuesta
            </Button>
            <Button variant="outline" className="justify-start h-12">
              <TrendingUp className="mr-3 h-4 w-4" />
              Ver Analíticas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
