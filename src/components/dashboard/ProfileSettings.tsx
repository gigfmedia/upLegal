
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  MapPin, 
  Briefcase, 
  Users, 
  CheckCircle,
  Edit,
  Linkedin
} from "lucide-react";
import { useLinkedInProfile } from "@/hooks/useLinkedInProfile";
import { useAuth } from "@/contexts/AuthContext";
import { EditProfileModal } from "./EditProfileModal";
import { useToast } from "@/hooks/use-toast";

export function ProfileSettings() {
  const { user } = useAuth();
  const { profile: linkedInProfile } = useLinkedInProfile(user?.id || '');
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!user) return null;

  const handleSaveProfile = (profileData: any) => {
    // Here you would normally update the user profile via API
    console.log('Saving profile data:', profileData);
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Basic Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información Básica
          </CardTitle>
          <CardDescription>
            Tu información básica de perfil
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage 
                src={linkedInProfile?.profile_picture_url || "/placeholder.svg"} 
                alt={user.name} 
              />
              <AvatarFallback className="bg-blue-600 text-white text-lg">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-gray-600">{user.email}</p>
              <Badge variant="secondary" className="mt-2">
                {user.role === 'lawyer' ? 'Abogado' : 'Cliente'}
              </Badge>
            </div>

            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* LinkedIn Profile Data */}
      {linkedInProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Linkedin className="h-5 w-5 text-blue-600" />
              Datos de Perfil de LinkedIn
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardTitle>
            <CardDescription>
              Información sincronizada desde tu perfil de LinkedIn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Professional Information */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Detalles Profesionales</h4>
                <div className="space-y-3">
                  {linkedInProfile.headline && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Título</label>
                      <p className="text-gray-900">{linkedInProfile.headline}</p>
                    </div>
                  )}
                  
                  {linkedInProfile.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{linkedInProfile.location}</span>
                    </div>
                  )}
                  
                  {linkedInProfile.industry && (
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-gray-500" />
                      <span>{linkedInProfile.industry}</span>
                    </div>
                  )}
                  
                  {linkedInProfile.connections_count && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-gray-500" />
                      <span>{linkedInProfile.connections_count.toLocaleString()} conexiones</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Información de Contacto</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Nombre</label>
                    <p className="text-gray-900">
                      {linkedInProfile.first_name} {linkedInProfile.last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Perfil Actual</label>
                    <p className="text-gray-900">{user.profile?.location || 'No establecido'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Summary */}
            {linkedInProfile.summary && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Resumen Profesional</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {linkedInProfile.summary}
                  </p>
                </div>
              </>
            )}

            {/* Sync Status */}
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">
                Última sincronización: {new Date(linkedInProfile.updated_at).toLocaleDateString()}
              </span>
              <Badge variant="secondary">
                LinkedIn Conectado
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attorney Profile Settings */}
      {user.role === 'lawyer' && (
        <Card>
          <CardHeader>
            <CardTitle>Configuración del Perfil de Abogado</CardTitle>
            <CardDescription>
              Gestiona tu perfil profesional de abogado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Especialidades</label>
                <p className="text-gray-900">
                  {user.profile?.specialties?.join(", ") || "No especificado"}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Tarifa por Hora</label>
                <p className="text-gray-900">
                  ${user.profile?.hourlyRate || 0}/hora
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Ubicación</label>
                <p className="text-gray-900">
                  {user.profile?.location || linkedInProfile?.location || "No especificado"}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Estado de Verificación</label>
                <div className="flex items-center gap-2">
                  {user.profile?.verified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-green-600">Verificado</span>
                    </>
                  ) : (
                    <Badge variant="outline">Verificación Pendiente</Badge>
                  )}
                </div>
              </div>
            </div>

            {user.profile?.bio && (
              <div>
                <label className="text-sm font-medium text-gray-500">Bio</label>
                <p className="text-gray-700 mt-1">
                  {user.profile.bio}
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button onClick={() => setIsEditModalOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Configuración del Perfil
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={user}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
