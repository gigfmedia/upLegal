
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  AlertCircle, 
  User, 
  FileText, 
  Camera,
  Star,
  Award,
  CreditCard
} from "lucide-react";

interface ProfileCompletionProps {
  user: any;
}

export function ProfileCompletion({ user }: ProfileCompletionProps) {
  const completionItems = [
    {
      id: 'basic_info',
      title: 'Información Básica',
      description: 'Nombre, email y datos de contacto',
      completed: !!(user.name && user.email),
      icon: User
    },
    {
      id: 'profile_photo',
      title: 'Foto de Perfil',
      description: 'Foto profesional',
      completed: false,
      icon: Camera
    },
    {
      id: 'specialties',
      title: 'Especialidades Legales',
      description: 'Áreas de experiencia',
      completed: !!(user.profile?.specialties?.length > 0),
      icon: Award
    },
    {
      id: 'bio',
      title: 'Biografía Profesional',
      description: 'Experiencia profesional detallada',
      completed: !!(user.profile?.bio && user.profile.bio.length > 50),
      icon: FileText
    },
    {
      id: 'hourly_rate',
      title: 'Tarifa por Hora',
      description: 'Establece tus tarifas de consulta',
      completed: !!(user.profile?.hourlyRate && user.profile.hourlyRate > 0),
      icon: CreditCard
    },
    {
      id: 'portfolio',
      title: 'Portafolio de Proyectos',
      description: 'Muestra tu mejor trabajo',
      completed: false,
      icon: Star
    }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const completionPercentage = (completedCount / completionItems.length) * 100;

  const nextSteps = [
    {
      id: 'add_photo',
      title: "Agregar Foto Profesional",
      description: "Sube una foto profesional para generar confianza con los clientes",
      priority: "high",
      action: () => {
        // Navigate to profile settings photo section
        const photoSection = document.getElementById('profile-photo-section');
        if (photoSection) {
          photoSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    },
    {
      id: 'create_portfolio',
      title: "Crear Portafolio",
      description: "Agrega 2-3 casos de estudio para mostrar tu experiencia",
      priority: "high",
      action: () => {
        // Navigate to portfolio tab
        const portfolioTab = document.querySelector('[data-tab="portfolio"]') as HTMLElement;
        if (portfolioTab) {
          portfolioTab.click();
        }
      }
    },
    {
      id: 'get_verified',
      title: "Obtener Verificación",
      description: "Envía documentos para verificación profesional",
      priority: "medium",
      action: () => {
        // Navigate to verification section
        const verificationSection = document.getElementById('verification-section');
        if (verificationSection) {
          verificationSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Profile Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Completar Perfil</CardTitle>
          <CardDescription>
            Completa tu perfil para atraer más clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progreso</span>
              <span className="text-sm text-gray-600">
                {completedCount}/{completionItems.length} completado
              </span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <p className="text-sm text-gray-600">
              {completionPercentage.toFixed(0)}% completo
            </p>
          </div>
          
          <div className="space-y-3 mt-6">
            {completionItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {item.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <item.icon className="h-4 w-4 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.completed ? 'text-gray-900' : 'text-gray-600'}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Próximos Pasos</CardTitle>
          <CardDescription>
            Acciones recomendadas para mejorar tu perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium">{step.title}</h4>
                    <Badge variant={step.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                      {step.priority === 'high' ? 'alta' : step.priority === 'medium' ? 'media' : 'baja'}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{step.description}</p>
                </div>
                <Button size="sm" variant="outline" onClick={step.action}>
                  Comenzar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento del Perfil</CardTitle>
          <CardDescription>
            Cómo está funcionando tu perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Vistas del Perfil</span>
              <span className="text-sm font-medium">1,247 este mes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Solicitudes de Contacto</span>
              <span className="text-sm font-medium">23 este mes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tasa de Respuesta</span>
              <span className="text-sm font-medium">95%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Calificación de Clientes</span>
              <div className="flex items-center space-x-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">4.8/5</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
