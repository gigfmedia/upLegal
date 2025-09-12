import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Edit,
  Save,
  X,
  Camera,
  Star,
  Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DashboardProfile() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    display_name: user?.profile?.display_name || user?.name || '',
    first_name: user?.profile?.first_name || '',
    last_name: user?.profile?.last_name || '',
    bio: user?.profile?.bio || '',
    phone: user?.profile?.phone || '',
    location: user?.profile?.location || '',
    website: user?.profile?.website || '',
    specialties: user?.profile?.specialties || [],
    hourly_rate_clp: user?.profile?.hourly_rate_clp || 0,
    experience_years: user?.profile?.experience_years || 0,
    languages: user?.profile?.languages || [],
  });

  const handleInputChange = (field: string, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      display_name: user?.profile?.display_name || user?.name || '',
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      bio: user?.profile?.bio || '',
      phone: user?.profile?.phone || '',
      location: user?.profile?.location || '',
      website: user?.profile?.website || '',
      specialties: user?.profile?.specialties || [],
      hourly_rate_clp: user?.profile?.hourly_rate_clp || 0,
      experience_years: user?.profile?.experience_years || 0,
      languages: user?.profile?.languages || [],
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
          <div className="space-x-2">
            <Button variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        )}
      </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Picture and Basic Info */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Foto de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.profile?.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="font-semibold">Hola! {user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge variant="secondary" className="mt-2">
                    {user?.role === 'lawyer' ? 'Abogado' : 'Cliente'}
                  </Badge>
                </div>

                {user?.role === 'lawyer' && user?.profile && (
                  <div className="text-center space-y-2">
                    {user.profile.verified && (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <Award className="h-3 w-3 mr-1" />
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

          {/* Profile Details */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.display_name || 'No configurado'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{user?.email}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="first_name">Nombre</Label>
                  {isEditing ? (
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 border rounded-md bg-gray-50">
                      <span>{formData.first_name || 'No configurado'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">Apellido</Label>
                  {isEditing ? (
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                    />
                  ) : (
                    <div className="p-2 border rounded-md bg-gray-50">
                      <span>{formData.last_name || 'No configurado'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.phone || 'No configurado'}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  {isEditing ? (
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                    />
                  ) : (
                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.location || 'No configurado'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                {isEditing ? (
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="https://your-website.com"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{formData.website || 'No configurado'}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografía</Label>
                {isEditing ? (
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Cuéntanos sobre ti..."
                    rows={4}
                  />
                ) : (
                  <div className="p-2 border rounded-md bg-gray-50 min-h-[100px]">
                    <span>{formData.bio || 'Sin biografía'}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Professional Information (for lawyers) */}
          {user?.role === 'lawyer' && (
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>Información Profesional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="experience_years">Años de Experiencia</Label>
                    {isEditing ? (
                      <Input
                        id="experience_years"
                        type="number"
                        value={formData.experience_years}
                        onChange={(e) => handleInputChange('experience_years', parseInt(e.target.value) || 0)}
                      />
                    ) : (
                      <div className="p-2 border rounded-md bg-gray-50">
                        <span>{formData.experience_years || 0} años</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate_clp">Tarifa por Hora (CLP)</Label>
                    {isEditing ? (
                      <Input
                        id="hourly_rate_clp"
                        type="number"
                        value={formData.hourly_rate_clp}
                        onChange={(e) => handleInputChange('hourly_rate_clp', parseInt(e.target.value) || 0)}
                      />
                    ) : (
                      <div className="p-2 border rounded-md bg-gray-50">
                        <span>${formData.hourly_rate_clp?.toLocaleString() || 0} CLP</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Especialidades</Label>
                  <div className="p-2 border rounded-md bg-gray-50 min-h-[60px]">
                    {formData.specialties?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin especialidades agregadas</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Idiomas</Label>
                  <div className="p-2 border rounded-md bg-gray-50 min-h-[60px]">
                    {formData.languages?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {formData.languages.map((language, index) => (
                          <Badge key={index} variant="outline">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sin idiomas agregados</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  );
}
