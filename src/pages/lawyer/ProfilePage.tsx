import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import type { Profile } from '@/contexts/AuthContext/clean/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Edit, X, Mail, Phone, MapPin, Globe, Briefcase, Clock, Award, Languages, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { DocumentUpload } from '@/components/ui/document-upload';
import { ProfileAvatarUpload } from '@/components/ProfileAvatarUpload';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  bio: string;
  phone: string;
  location: string;
  website: string;
  specialties: string[];
  experience: number;
  hourly_rate: number;
  languages: string[];
  education: string;
  bar_association_number: string;
  zoom_link: string;
  avatar_url?: string;
};

export default function LawyerProfilePage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  
  // Define available specializations
  const availableSpecializations = [
    'Derecho Laboral',
    'Derecho Civil',
    'Derecho de Familia',
    'Derecho Penal',
    'Derecho Comercial',
    'Derecho Tributario',
    'Derecho Inmobiliario',
    'Derecho de Propiedad Intelectual',
    'Derecho Ambiental',
    'Derecho de Seguros',
    'Derecho Bancario',
    'Derecho de Consumidor',
    'Derecho Migratorio',
    'Derecho Internacional',
    'Derecho Constitucional',
    'Derecho Administrativo',
    'Derecho de Salud',
    'Derecho de Tecnología',
    'Derecho Deportivo',
  ];

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    bio: '',
    phone: '',
    location: '',
    website: '',
    specialties: [],
    experience: 0,
    hourly_rate: 0,
    languages: [],
    education: '',
    bar_association_number: '',
    zoom_link: ''
  });

  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Load user data
  useEffect(() => {
    if (user?.user_metadata) {
      // First, handle specializations to ensure they're properly formatted
      let specialties: string[] = [];
      
      // Check both 'specialties' and 'specialization' for backward compatibility
      const specialtiesSource = user.user_metadata.specialties || user.user_metadata.specialization;
      
      if (specialtiesSource) {
        if (Array.isArray(specialtiesSource)) {
          specialties = specialtiesSource;
        } else if (typeof specialtiesSource === 'string') {
          specialties = specialtiesSource
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
        }
      }
      
      setSelectedSpecializations(specialties);
      
      // Then set the form data
      const userData = {
        first_name: user.user_metadata.first_name || '',
        last_name: user.user_metadata.last_name || '',
        bio: user.user_metadata.bio || '',
        phone: user.user_metadata.phone || '',
        location: user.user_metadata.location || '',
        website: user.user_metadata.website || '',
        specialties: specialties, // Use the processed specialties
        experience: user.user_metadata.experience || 0,
        hourly_rate: user.user_metadata.hourly_rate || 0,
        languages: user.user_metadata.languages || [],
        education: user.user_metadata.education || '',
        bar_association_number: user.user_metadata.bar_association_number || '',
        zoom_link: user.user_metadata.zoom_link || '',
        avatar_url: user.user_metadata.avatar_url || ''
      };
      
      setFormData(userData);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => {
      // Handle empty strings
      const newValue = value === '' ? '' : value;
      
      // For URL fields, add https:// if missing and not empty
      if ((name === 'website' || name === 'zoom_link') && newValue && !newValue.match(/^https?:\/\//)) {
        return {
          ...prev,
          [name]: `https://${newValue}`
        };
      }
      
      return {
        ...prev,
        [name]: newValue
      };
    });
    
    setHasChanges(true);
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : Number(value) || 0
    }));
    setHasChanges(true);
  };

  const toggleSpecialization = (spec: string) => {
    const newSpecializations = selectedSpecializations.includes(spec)
      ? selectedSpecializations.filter(s => s !== spec)
      : [...selectedSpecializations, spec];
    
    // Update both states to keep them in sync
    setSelectedSpecializations(newSpecializations);
    setFormData(prev => ({
      ...prev,
      specialties: newSpecializations
    }));
    setHasChanges(true);
    
    // Force a re-render to update the UI
    setForceUpdate(prev => !prev);
  };
  
  // Add a force update state to ensure UI updates
  const [, setForceUpdate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Prepare the data to update with default values
      const updateData: any = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        bio: formData.bio || null,
        phone: formData.phone || null,
        location: formData.location || null,
        website: formData.website || null,
        // Send both formats for backward compatibility
        specialties: selectedSpecializations.length > 0 ? selectedSpecializations : [],
        specialization: selectedSpecializations.length > 0 ? selectedSpecializations.join(', ') : null,
        experience: typeof formData.experience === 'number' ? formData.experience : 0,
        hourly_rate: typeof formData.hourly_rate === 'number' ? formData.hourly_rate : 0,
        languages: Array.isArray(formData.languages) ? formData.languages : [],
        education: formData.education || null,
        bar_association_number: formData.bar_association_number || null,
        zoom_link: formData.zoom_link || null,
        avatar_url: formData.avatar_url || null,
        updated_at: new Date().toISOString()
      };
      
      // Clean up data - remove any undefined or null values that might cause issues
      Object.keys(updateData).forEach(key => {
        if (updateData[key as keyof typeof updateData] === undefined) {
          updateData[key as keyof typeof updateData] = null as any;
        }
      });
      
      await updateProfile(updateData);
      
      // Update local state
      if (user.user_metadata) {
        user.user_metadata = {
          ...user.user_metadata,
          ...updateData,
          specialties: selectedSpecializations
        };
      }
      
      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios se han guardado correctamente.',
      });
      
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      setError('Ocurrió un error al actualizar el perfil. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user?.user_metadata) {
      setFormData({
        first_name: user.user_metadata.first_name || '',
        last_name: user.user_metadata.last_name || '',
        bio: user.user_metadata.bio || '',
        phone: user.user_metadata.phone || '',
        location: user.user_metadata.location || '',
        website: user.user_metadata.website || '',
        specialization: user.user_metadata.specialization || '',
        experience: user.user_metadata.experience || 0,
        hourly_rate: user.user_metadata.hourly_rate || 0,
        languages: user.user_metadata.languages || [],
        education: user.user_metadata.education || '',
        bar_association_number: user.user_metadata.bar_association_number || '',
        zoom_link: user.user_metadata.zoom_link || ''
      });
      
      if (user.user_metadata.specialization) {
        setSelectedSpecializations(
          user.user_metadata.specialization
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        );
      } else {
        setSelectedSpecializations([]);
      }
    }
    
    setHasChanges(false);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mi Perfil</h2>
            <p className="text-muted-foreground">
              Gestiona tu información personal y profesional
            </p>
          </div>
          
          {!isEditing ? (
            <div className="flex space-x-2">
              <Button 
                asChild 
                variant="outline"
                type="button"
              >
                <a href={`/lawyer/${user?.id}`} target="_blank" rel="noopener noreferrer">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver perfil
                </a>
              </Button>
              <Button 
                onClick={() => setIsEditing(true)}
                variant="default"
                type="button"
                className="bg-black text-white hover:bg-gray-800"
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar perfil
              </Button>
            </div>
          ) : (
            <div className="space-x-2">
              <Button 
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                type="button"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving || !hasChanges}
                className="min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Tu información personal y de contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center md:items-start md:flex-row md:space-x-8 space-y-6 md:space-y-0">
              <div className="flex-shrink-0 w-56 flex flex-col items-center">
                <div className="w-24 h-24">
                  <ProfileAvatarUpload 
                    avatarUrl={formData.avatar_url || user?.user_metadata?.avatar_url || null}
                    onUpload={(url) => {
                      if (user) {
                        // Update the user metadata
                        const updatedMetadata = {
                          ...user.user_metadata,
                          avatar_url: url
                        };
                        
                        // @ts-ignore - Supabase types don't include this property
                        user.user_metadata = updatedMetadata;
                        
                        // Update the form data to trigger the save button
                        setFormData(prev => {
                          const updated = {
                            ...prev,
                            avatar_url: url
                          };
                          return updated;
                        });
                        
                        // Enable the save button
                        setHasChanges(true);
                        
                        // Show success message
                        toast({
                          title: '¡Éxito!',
                          description: 'La foto de perfil se ha subido correctamente. No olvides guardar los cambios.',
                        });
                      } else {
                        console.error('No user object available when updating avatar');
                      }
                    }}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              
              <div className="flex-grow space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Nombres</Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Tus nombres"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Apellidos</Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Tus apellidos"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Cuéntanos sobre ti..."
                    className="min-h-[150px]"
                    rows={6}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="Ciudad, País"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio Web</Label>
                  <div className="relative">
                    <Input
                      id="website"
                      name="website"
                      type="text"
                      value={formData.website || ''}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      placeholder="tusitio.com"
                      className="pr-8"
                    />
                    {formData.website && (
                      <a 
                        href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                        title="Abrir enlace"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Profesional</CardTitle>
            <CardDescription>
              Detalles sobre tu práctica legal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2 w-full">
              <Label>Especializaciones</Label>
              <div className="flex flex-wrap gap-2">
                {availableSpecializations.map((spec) => {
                  const isSelected = selectedSpecializations?.includes(spec);
                  
                  return (
                    <Button
                      key={spec}
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs whitespace-nowrap transition-colors ${
                        isEditing ? 'cursor-pointer' : 'cursor-default'
                      } ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                          : 'bg-background hover:bg-accent hover:text-accent-foreground'
                      }`}
                      onClick={() => isEditing && toggleSpecialization(spec)}
                    >
                      {spec}
                      {isSelected && (
                        <span className="ml-1">✓</span>
                      )}
                    </Button>
                  );
                })}
              </div>
              <input
                type="hidden"
                name="specialization"
                value={formData.specialization}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bar_association_number">N° de Colegio de Abogados</Label>
                <Input
                  id="bar_association_number"
                  name="bar_association_number"
                  value={formData.bar_association_number || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="Ej: 12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Años de Experiencia</Label>
                <Input
                  id="experience"
                  name="experience"
                  type="number"
                  min="0"
                  value={formData.experience || 0}
                  onChange={handleNumberInput}
                  disabled={!isEditing}
                  placeholder="Ej: 5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Tarifa por Hora (CLP)</Label>
                <Input
                  id="hourly_rate"
                  name="hourly_rate"
                  type="number"
                  min="0"
                  value={formData.hourly_rate || 0}
                  onChange={handleNumberInput}
                  disabled={!isEditing}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <DocumentUpload
                bucket="documents"
                userId={user?.id}
                onUpload={() => {}}
                currentDocumentUrl={user?.user_metadata?.professional_document}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="education">Formación Académica</Label>
              <Textarea
                id="education"
                name="education"
                value={formData.education || ''}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="Títulos y certificaciones"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="languages">Idiomas</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground">
                  <Languages className="h-4 w-4" />
                </span>
                <Input
                  id="languages"
                  name="languages"
                  value={formData.languages.join(', ') || ''}
                  onChange={(e) => {
                    const languages = e.target.value.split(',').map(lang => lang.trim());
                    setFormData(prev => ({
                      ...prev,
                      languages: languages.filter(lang => lang !== '')
                    }));
                    setHasChanges(true);
                  }}
                  disabled={!isEditing}
                  placeholder="Español, Inglés, Francés..."
                  className="rounded-l-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Separa los idiomas con comas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zoom_link">Enlace de Zoom para Consultas</Label>
              <div className="relative">
                <Input
                  id="zoom_link"
                  name="zoom_link"
                  type="text"
                  value={formData.zoom_link || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://zoom.us/j/tu-enlace"
                  className="pr-8"
                />
                {formData.zoom_link && (
                  <a 
                    href={formData.zoom_link.startsWith('http') ? formData.zoom_link : `https://${formData.zoom_link}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                    title="Abrir enlace de Zoom"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                  </a>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Este enlace se usará para las consultas virtuales con tus clientes
              </p>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Payments Setup (Stripe Connect) */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos</CardTitle>
          <CardDescription>
            Conecta tu cuenta con Stripe para recibir pagos automáticamente. Necesitas completar este paso para habilitar el botón "Solicitar servicio" en tu perfil público.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={async () => {
              try {
                setIsStripeLoading(true);
                
                // Prepare the request
                const requestBody = {
                  returnUrl: `${window.location.origin}/lawyer/profile`,
                  refreshUrl: `${window.location.origin}/lawyer/profile`,
                };

                // Get the current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError || !session?.access_token) {
                  throw new Error('No se pudo obtener la sesión. Por favor inicia sesión nuevamente.');
                }
                
                // Call the create-connect-account function
                const response = await fetch(
                  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-connect-account`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                      return_url: requestBody.returnUrl,
                      refresh_url: requestBody.refreshUrl
                    }),
                  }
                );

                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to connect with Stripe');
                }

                const data = await response.json();

                if (!response.ok) {
                  throw new Error(data.error || 'Error al conectar con Stripe');
                }
                
                if (data.url) {
                  window.location.href = data.url;
                } else {
                  throw new Error('No se pudo obtener la URL de onboarding de Stripe');
                }
              } catch (e: any) {
                toast({
                  title: 'Error',
                  description: e?.message || e?.error?.message || 'No se pudo iniciar el onboarding de Stripe.',
                  variant: 'destructive',
                });
              } finally {
                setIsStripeLoading(false);
              }
            }}
            disabled={isStripeLoading}
          >
            {isStripeLoading ? 'Abriendo Stripe…' : 'Configurar pagos con Stripe'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
