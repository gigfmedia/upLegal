import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AvatarUpload } from '@/components/AvatarUpload';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Edit,
  Save,
  X,
  Star,
  Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ProfileFormData = {
  display_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  location: string;
  website: string;
  specialties: string[];
  hourly_rate_clp: number;
  experience_years: number;
  languages: string[];
  avatar_updated?: number;
};

interface DashboardProfileProps {
  setupMode?: boolean;
}

export default function DashboardProfile({ setupMode = false }: DashboardProfileProps) {
  const { user, updateProfile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(setupMode);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarTimestamp, setAvatarTimestamp] = useState<number>(Date.now());
  const navigate = useNavigate();

  // Redirect to setup if in setup mode and already completed
  useEffect(() => {
    if (setupMode && user?.profile_setup_completed) {
      navigate('/dashboard');
    }
  }, [setupMode, user, navigate]);
  
  const [formData, setFormData] = useState<ProfileFormData>(() => ({
    display_name: user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
    phone: user?.user_metadata?.phone || '',
    location: user?.user_metadata?.location || '',
    website: user?.user_metadata?.website || '',
    specialties: user?.user_metadata?.specialties || [],
    hourly_rate_clx: user?.user_metadata?.hourly_rate_clp || 0,
    experience_years: user?.user_metadata?.experience_years || 0,
    languages: user?.user_metadata?.languages || []
  }));

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Check required fields for setup completion
      const isSetupComplete = Boolean(
        formData.first_name && 
        formData.last_name && 
        formData.specialties?.length > 0 && 
        formData.hourly_rate_clp > 0
      );
      
      const profileData = {
        display_name: formData.display_name || `${formData.first_name} ${formData.last_name}`.trim(),
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || null,
        location: formData.location || null,
        website: formData.website || null,
        specialties: formData.specialties || [],
        hourly_rate_clp: formData.hourly_rate_clp || 0,
        experience_years: formData.experience_years || 0,
        languages: formData.languages || [],
        // Mark profile setup as completed if all required fields are filled
        profile_setup_completed: isSetupComplete,
        ...(formData.avatar_updated && { avatar_updated: formData.avatar_updated })
      };

      const { error } = await updateProfile(profileData);
      
      if (error) throw error;
      
      toast({
        title: setupMode ? '¡Bienvenido!' : 'Perfil actualizado',
        description: setupMode 
          ? 'Tu perfil ha sido configurado correctamente. Ahora puedes comenzar a usar la plataforma.'
          : 'Tus cambios se han guardado correctamente.',
      });
      
      if (setupMode) {
        // Redirect to dashboard after successful setup
        navigate('/dashboard');
      } else {
        setIsEditing(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      display_name: user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
      phone: user?.user_metadata?.phone || '',
      location: user?.user_metadata?.location || '',
      website: user?.user_metadata?.website || '',
      specialties: user?.user_metadata?.specialties || [],
      hourly_rate_clp: user?.user_metadata?.hourly_rate_clp || 0,
      experience_years: user?.user_metadata?.experience_years || 0,
      languages: user?.user_metadata?.languages || [],
    });
    setIsEditing(false);
  };

  const renderProfileHeader = () => (
    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Gestiona la información de tu perfil y preferencias
        </p>
      </div>
      {!isEditing ? (
        <Button onClick={() => setIsEditing(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Perfil
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </div>
      )}
    </div>
  );

  const renderProfilePicture = () => (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Foto de Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg bg-gray-100">
              {user?.user_metadata?.avatar_url ? (
                <AvatarImage 
                  key={`avatar-${avatarTimestamp}`}
                  src={`${user.user_metadata.avatar_url}${user.user_metadata.avatar_url.includes('?') ? '&' : '?'}t=${avatarTimestamp}`} 
                  alt="User Avatar"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <AvatarFallback className="text-2xl bg-gray-100 flex items-center justify-center w-full h-full">
                  {user?.user_metadata?.first_name?.charAt(0).toUpperCase() || 
                   user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            {isEditing && (
              <div className="absolute -bottom-2 -right-2">
                <AvatarUpload 
                  userId={user?.id || ''} 
                  currentAvatarUrl={user?.user_metadata?.avatar_url} 
                  onUpload={() => setAvatarTimestamp(Date.now())} 
                />
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h3 className="font-semibold">Hola! {user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="mt-2">
              {user?.user_metadata?.role === 'lawyer' ? 'Abogado' : 'Cliente'}
            </Badge>
          </div>

          {user?.role === 'lawyer' && user?.profile && (
            <div className="text-center space-y-2">
              {user.profile.verified && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Verificado
                </Badge>
              )}
              {user.profile.rating && (
                <div className="flex items-center justify-center space-x-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{user.profile.rating}</span>
                  <span className="text-sm text-muted-foreground">
                    ({user.profile.review_count} reseñas)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderPersonalInfo = () => (
    <Card className="md:col-span-2">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">Información Personal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name" className="text-sm font-medium">Nombre</Label>
            {isEditing ? (
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
              />
            ) : (
              <div className="p-2 border rounded-md bg-gray-50">
                <span className="text-sm">{formData.first_name || 'No configurado'}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="last_name" className="text-sm font-medium">Apellido</Label>
            {isEditing ? (
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
              />
            ) : (
              <div className="p-2 border rounded-md bg-gray-50">
                <span className="text-sm">{formData.last_name || 'No configurado'}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{user?.email}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium">Teléfono</Label>
            {isEditing ? (
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            ) : (
              <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{formData.phone || 'No configurado'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Ubicación</Label>
          {isEditing ? (
            <Input
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
            />
          ) : (
            <div className="flex items-center space-x-2 p-3 border rounded-md bg-gray-50">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {formData.location || 'No especificada'}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Sitio Web</Label>
          {isEditing ? (
            <Input
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://"
            />
          ) : (
            <div className="flex items-center space-x-2 p-3 border rounded-md bg-gray-50">
              <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {formData.website ? (
                <a 
                  href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate"
                >
                  {formData.website}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No especificado</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderProfessionalInfo = () => {
    if (user?.user_metadata?.role !== 'lawyer') return null;
    
    return (
      <Card className="md:col-span-3">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg sm:text-xl">Información Profesional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="experience_years" className="text-sm font-medium">Años de Experiencia</Label>
              {isEditing ? (
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  value={formData.experience_years}
                  onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                />
              ) : (
                <div className="p-3 border rounded-md bg-gray-50">
                  <span className="text-sm">
                    {formData.experience_years} {formData.experience_years === 1 ? 'año' : 'años'}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hourly_rate_clp" className="text-sm font-medium">Tarifa por Hora (CLP)</Label>
              {isEditing ? (
                <Input
                  id="hourly_rate_clp"
                  type="number"
                  min="0"
                  value={formData.hourly_rate_clp}
                  onChange={(e) => handleInputChange('hourly_rate_clp', parseInt(e.target.value) || 0)}
                />
              ) : (
                <div className="p-3 border rounded-md bg-gray-50">
                  <span className="text-sm">
                    ${formData.hourly_rate_clp?.toLocaleString() || '0'} CLP/hora
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Especialidades</Label>
            {isEditing ? (
              <Input
                value={formData.specialties?.join(', ')}
                onChange={(e) => handleInputChange('specialties', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="Ej: Derecho Laboral, Contratos, Familia"
              />
            ) : (
              <div className="p-3 border rounded-md bg-gray-50 min-h-[60px]">
                {formData.specialties?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.specialties.map((specialty, index) => (
                      <Badge key={index} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin especialidades agregadas</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Idiomas</Label>
            {isEditing ? (
              <Input
                value={formData.languages?.join(', ')}
                onChange={(e) => handleInputChange('languages', e.target.value.split(',').map(l => l.trim()).filter(Boolean))}
                placeholder="Ej: Español, Inglés, Francés"
              />
            ) : (
              <div className="p-3 border rounded-md bg-gray-50 min-h-[60px]">
                {formData.languages?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.languages.map((language, index) => (
                      <Badge key={index} variant="outline">
                        {language}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Sin idiomas agregados</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      {renderProfileHeader()}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {renderProfilePicture()}
        {renderPersonalInfo()}
        {renderProfessionalInfo()}
      </div>
    </div>
  );
}
