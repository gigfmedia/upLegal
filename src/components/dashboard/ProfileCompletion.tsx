import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useServices } from "@/hooks/useServices";
import { useAuth } from "@/contexts/AuthContext/clean/useAuth";
import { CheckCircle2, AlertCircle, ChevronRight } from "lucide-react";

interface ProgressItem {
  label: string;
  completed: boolean;
  tab: 'profile' | 'services' | 'billing';
  description: string;
}

interface ProfileCompletionProps {
  onNavigateToTab?: (tabValue: string) => void;
  completionPercentage: number;
}

export function ProfileCompletion({ onNavigateToTab, completionPercentage }: ProfileCompletionProps) {
  const { user } = useAuth();
  const { services } = useServices();
  
  // Use the provided completion percentage
  const profileProgress = completionPercentage;
  const overallProgress = completionPercentage; // Single progress value now includes services

  // Calculate missing items for the profile completion
  const missingItems = useMemo(() => {
    if (!user?.user_metadata) return [];

    const items: { label: string; tab: 'profile' | 'services' | 'billing'; description: string }[] = [];
    
    if (!user.user_metadata.first_name || !user.user_metadata.last_name) {
      items.push({
        label: 'Información personal',
        tab: 'profile',
        description: 'Agrega tu nombre y apellido'
      });
    }

    if (!user.user_metadata.bio) {
      items.push({
        label: 'Biografía',
        tab: 'profile',
        description: 'Cuéntales a los clientes sobre ti y tu experiencia'
      });
    }

    if (!user.user_metadata.phone) {
      items.push({
        label: 'Teléfono de contacto',
        tab: 'profile',
        description: 'Agrega un número donde los clientes puedan contactarte'
      });
    }

    if (!user.user_metadata.location) {
      items.push({
        label: 'Ubicación',
        tab: 'profile',
        description: 'Indica tu ubicación para clientes cercanos'
      });
    }

    if (!user.user_metadata.specialties?.length) {
      items.push({
        label: 'Especialidades',
        tab: 'profile',
        description: 'Selecciona tus áreas de especialización legal'
      });
    }

    if (!user.user_metadata.experience) {
      items.push({
        label: 'Años de experiencia',
        tab: 'profile',
        description: 'Indica cuántos años de experiencia tienes'
      });
    }

    if (!user.user_metadata.hourly_rate && !user.user_metadata.hourly_rate_clp) {
      items.push({
        label: 'Tarifa por hora',
        tab: 'profile',
        description: 'Establece tu tarifa por hora en CLP'
      });
    }

    if (!user.user_metadata.languages?.length) {
      items.push({
        label: 'Idiomas',
        tab: 'profile',
        description: 'Agrega los idiomas que hablas'
      });
    }

    if (!user.user_metadata.education) {
      items.push({
        label: 'Educación',
        tab: 'profile',
        description: 'Agrega tu título profesional'
      });
    }

    if (!user.user_metadata.university) {
      items.push({
        label: 'Universidad',
        tab: 'profile',
        description: 'Indica dónde estudiaste'
      });
    }

    if (!user.user_metadata.bar_association_number) {
      items.push({
        label: 'N° de colegiado',
        tab: 'profile',
        description: 'Agrega tu número de colegiado para verificación'
      });
    }

    if (!user.user_metadata.rut) {
      items.push({
        label: 'RUT',
        tab: 'profile',
        description: 'Agrega tu RUT para facturación'
      });
    }

    if (!user.user_metadata.avatar_url) {
      items.push({
        label: 'Foto de perfil',
        tab: 'profile',
        description: 'Agrega una foto profesional'
      });
    }

    if (!services?.length) {
      items.push({
        label: 'Servicios',
        tab: 'services',
        description: 'Agrega al menos un servicio que ofreces'
      });
    }

    return items;
  }, [user, services]);

  // Progress items with detailed field tracking
  const progressItems: ProgressItem[] = [
    {
      label: 'Información Básica',
      completed: !!(user?.user_metadata?.first_name && user?.user_metadata?.last_name && user?.email && user?.user_metadata?.phone),
      tab: 'profile',
      description: 'Nombre, teléfono y correo electrónico'
    },
    {
      label: 'Perfil Profesional',
      completed: !!(user?.user_metadata?.bio && user?.user_metadata?.specialization && user?.user_metadata?.experience && user?.user_metadata?.education),
      tab: 'profile',
      description: 'Biografía, especialización y educación'
    },
    {
      label: 'Datos de Contacto',
      completed: !!(user?.user_metadata?.location && user?.user_metadata?.zoom_link && user?.user_metadata?.bar_association_number),
      tab: 'profile',
      description: 'Ubicación, Zoom y colegiatura'
    },
    {
      label: 'Servicios',
      completed: services && services.length > 0,
      tab: 'services',
      description: services && services.length > 0 ? `${services.length} servicio(s) configurado(s)` : 'Agrega al menos un servicio'
    },
    {
      label: 'Disponibilidad',
      completed: !!user?.user_metadata?.availability,
      tab: 'profile',
      description: 'Horarios de atención configurados'
    }
  ];

  const completedItems = progressItems.filter(item => item.completed).length;
  const totalItems = progressItems.length;

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="p-0 pb-4">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Progreso del perfil</CardTitle>
          <Badge variant={overallProgress === 100 ? 'default' : 'outline'} className="text-sm">
            {overallProgress}% completado
          </Badge>
        </div>
        <CardDescription>
          {overallProgress === 100 
            ? '¡Excelente! Tu perfil está completo.' 
            : `Completa los pasos para mejorar tu visibilidad. ${completedItems} de ${totalItems} completados.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progreso general</span>
              <span className="font-medium">{overallProgress}%</span>
            </div>
            <Progress value={overallProgress} className="h-2" />
          </div>

          {/* Progress Items */}
          <div className="space-y-3">
            {progressItems.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => onNavigateToTab?.(item.tab)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded-full ${item.completed ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {item.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <AlertCircle className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          
          {overallProgress < 100 && (
            <Button 
              variant="default" 
              className="w-full mt-4"
              onClick={() => onNavigateToTab?.(progressItems.find(item => !item.completed)?.tab || 'profile')}
            >
              {completedItems === 0 ? 'Comenzar' : 'Continuar'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
