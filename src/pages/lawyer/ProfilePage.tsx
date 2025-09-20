import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import type { Profile } from '@/contexts/AuthContext/clean/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Edit, X, Mail, Phone, MapPin, Globe, Briefcase, Clock, Award, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { DocumentUpload } from '@/components/ui/document-upload';

type ProfileFormData = {
  first_name: string;
  last_name: string;
  bio: string;
  phone: string;
  location: string;
  website: string;
  specialization: string;
  experience: number;
  hourly_rate: number;
  languages: string[];
  education: string;
  bar_association_number: string;
  zoom_link: string;
};

export default function LawyerProfilePage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    'Derecho Marítimo'
  ];

  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    bio: '',
    phone: '',
    location: '',
    website: '',
    specialization: '',
    experience: 0,
    hourly_rate: 0,
    languages: [],
    education: '',
    bar_association_number: '',
    zoom_link: ''
  });
  
  // Add a state to track if the form has unsaved changes
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<Partial<ProfileFormData>>({});
  
  // Set initial form data when user loads
  useEffect(() => {
    if (user?.user_metadata) {
      const initialData = {
        first_name: user.user_metadata.first_name || '',
        last_name: user.user_metadata.last_name || '',
        bio: user.user_metadata.bio || '',
        phone: user.user_metadata.phone || '',
        location: user.user_metadata.location || '',
        website: user.user_metadata.website || '',
        specialization: user.user_metadata.specialization || '',
        experience: user.user_metadata.experience || user.user_metadata.experience_years || 0,
        hourly_rate: user.user_metadata.hourly_rate || user.user_metadata.hourly_rate_clp || 0,
        languages: Array.isArray(user.user_metadata.languages) ? user.user_metadata.languages : [],
        education: user.user_metadata.education || '',
        bar_association_number: user.user_metadata.bar_association_number || '',
        zoom_link: user.user_metadata.zoom_link || ''
      };
      
      setOriginalData(initialData);
      setFormData(initialData);
    }
  }, [user?.user_metadata]);
  
  // Update hasChanges whenever formData changes
  useEffect(() => {
    if (Object.keys(originalData).length > 0) {
      const hasFormChanged = Object.entries(formData).some(([key, value]) => {
        // Special handling for arrays and numbers
        if (Array.isArray(value)) {
          return JSON.stringify(value) !== JSON.stringify(originalData[key as keyof typeof originalData]);
        }
        // Convert both to string for comparison to handle number/string mismatches
        return String(value) !== String(originalData[key as keyof typeof originalData]);
      });
      
      setHasChanges(hasFormChanged);
    }
  }, [formData, originalData]);

  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);

  // Initialize selected specializations from form data
  useEffect(() => {
    if (formData.specialization) {
      setSelectedSpecializations(formData.specialization.split(',').map(s => s.trim()).filter(Boolean));
    }
  }, [formData.specialization]);

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations(prev => {
      const newSpecs = prev.includes(spec)
        ? prev.filter(s => s !== spec)
        : [...prev, spec];
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        specialization: newSpecs.join(', ')
      }));
      
      return newSpecs;
    });
  };

  // Load user data on mount
  useEffect(() => {
    if (user?.user_metadata) {
      const specialization = user.user_metadata.specialization || user.user_metadata.specialties?.[0] || '';
      setFormData({
        first_name: user.user_metadata.first_name || '',
        last_name: user.user_metadata.last_name || '',
        bio: user.user_metadata.bio || '',
        phone: user.user_metadata.phone || '',
        location: user.user_metadata.location || '',
        website: user.user_metadata.website || '',
        specialization: specialization,
        experience: user.user_metadata.experience || user.user_metadata.experience_years || 0,
        hourly_rate: user.user_metadata.hourly_rate || user.user_metadata.hourly_rate_clp || 0,
        languages: Array.isArray(user.user_metadata.languages) 
          ? user.user_metadata.languages 
          : [],
        education: user.user_metadata.education || '',
        bar_association_number: user.user_metadata.bar_association_number || '',
        zoom_link: user.user_metadata.zoom_link || ''
      });
      
      // Initialize selected specializations
      if (specialization) {
        setSelectedSpecializations(specialization.split(',').map(s => s.trim()).filter(Boolean));
      }
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));  
  };

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseInt(value, 10)
      }));
    }
  };

  const handleLanguagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const languages = e.target.value.split(',').map(lang => lang.trim());
    setFormData(prev => ({
      ...prev,
      languages: languages.filter(lang => lang !== '')
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted - handleSubmit called', { formData });
    
    if (isSaving) {
      console.log('Save already in progress');
      return; // Prevent multiple submissions
    }
    
    console.log('Starting form submission...');
    
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('Starting profile update...');
      // Prepare the profile data with only the fields that should be updated
      const profileUpdate: Partial<Profile> = {
        first_name: formData.first_name || null,
        last_name: formData.last_name || null,
        bio: formData.bio || null,
        phone: formData.phone || null,
        location: formData.location || null,
        website: formData.website || null,
        specialization: formData.specialization || null,
        experience: formData.experience ? Number(formData.experience) : 0,
        experience_years: formData.experience ? Number(formData.experience) : 0,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : 0,
        hourly_rate_clp: formData.hourly_rate ? Number(formData.hourly_rate) : 0,
        languages: Array.isArray(formData.languages) ? formData.languages : [],
        education: formData.education || null,
        zoom_link: formData.zoom_link || null,
        bar_association_number: formData.bar_association_number || null
      };
      
      console.log('Sending profile update:', JSON.stringify(profileUpdate, null, 2));
      
      const updatedUser = await updateProfile(profileUpdate);
      console.log('Update response:', updatedUser);
      
      if (!updatedUser) {
        console.error('No updated user data returned from updateProfile');
        throw new Error('No se recibieron datos actualizados del servidor');
      }
      
      console.log('Profile update successful, updated user:', updatedUser);
      
      // Get the latest data from user_metadata or the profile object
      const userData = updatedUser.user_metadata || updatedUser;
      
      // Prepare the new form data with all fields
      const newFormData = {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        bio: userData.bio || '',
        phone: userData.phone || '',
        location: userData.location || '',
        website: userData.website || '',
        specialization: userData.specialization || '',
        experience: userData.experience || 0,
        hourly_rate: userData.hourly_rate || 0,
        languages: Array.isArray(userData.languages) ? userData.languages : [],
        education: userData.education || '',
        bar_association_number: userData.bar_association_number || '',
        zoom_link: userData.zoom_link || ''
      };
      
      console.log('Updating form data with:', newFormData);
      
      // Update both form data and original data to match
      setFormData(newFormData);
      setOriginalData(newFormData);
      setIsEditing(false);
      
      // Show success message
      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios se han guardado correctamente.',
      });
    } catch (err: any) {
      console.error('Error updating profile:', err);
      
      // Extract more detailed error message if available
      let errorMessage = 'Error al actualizar el perfil. Por favor, inténtalo de nuevo.';
      
      if (err.message) {
        // Check for common error patterns
        if (err.message.includes('duplicate key value violates unique constraint')) {
          errorMessage = 'Ya existe un perfil con estos datos. Por favor, verifica la información.';
        } else if (err.message.includes('network error')) {
          errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet e inténtalo de nuevo.';
        } else if (err.message.includes('JWT expired') || err.message.includes('Invalid JWT')) {
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else {
          errorMessage = err.message;
        }
      }
      
      console.error('Error details:', {
        name: err.name,
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: 'Error al guardar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isSaving) return; // Prevent cancellation while saving
    
    // Reset form to saved data
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
    }
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
            <Button 
              onClick={() => setIsEditing(true)}
              variant="outline"
              type="button"
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar perfil
            </Button>
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

        {/* Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Tu información personal y de contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nombres</Label>
                <Input
                  id="first_name"
                  name="first_name"
                  value={formData.first_name}
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
                  value={formData.last_name}
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
                  value={formData.bio}
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
                    value={formData.phone}
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
                    value={formData.location}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Ciudad, País"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio Web</Label>
                <Input
                  id="website"
                  name="website"
                  type="text"
                  value={formData.website}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://tusitio.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Profesional */}
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
                <div className="flex gap-2 flex-wrap">
                  {availableSpecializations.map((spec) => (
                    <Button
                      key={spec}
                      type="button"
                      variant={selectedSpecializations.includes(spec) ? 'default' : 'outline'}
                      size="sm"
                      className={`text-xs whitespace-nowrap ${isEditing ? 'cursor-pointer' : 'cursor-default'}`}
                      onClick={() => isEditing && toggleSpecialization(spec)}
                    >
                      {spec}
                      {selectedSpecializations.includes(spec) && (
                        <span className="ml-1">✓</span>
                      )}
                    </Button>
                  ))}
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
                    value={formData.bar_association_number}
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
                    value={formData.experience}
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
                    value={formData.hourly_rate}
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
                  onUpload={(url, fileName) => {
                    // Aquí puedes manejar la URL del documento subido
                    console.log('Documento subido:', { url, fileName });
                  }}
                  currentDocumentUrl={user?.user_metadata?.professional_document}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="education">Formación Académica</Label>
                <Textarea
                  id="education"
                  name="education"
                  value={formData.education}
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
                    value={formData.languages.join(', ')}
                    onChange={(e) => {
                      const languages = e.target.value.split(',').map(lang => lang.trim());
                      setFormData(prev => ({
                        ...prev,
                        languages: languages.filter(lang => lang !== '')
                      }));
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
                <Input
                  id="zoom_link"
                  name="zoom_link"
                  type="url"
                  value={formData.zoom_link}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://zoom.us/j/tu-enlace"
                />
                <p className="text-xs text-muted-foreground">
                  Este enlace se usará para las consultas virtuales con tus clientes
                </p>
              </div>
            </CardContent>
          </Card>

        {isEditing && (
          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : 'Guardar cambios'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
