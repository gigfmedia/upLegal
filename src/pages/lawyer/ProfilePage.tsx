import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { invokeFunction } from '@/lib/supabaseFunctions';
import type { Profile } from '@/contexts/AuthContext/clean/AuthContext';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Edit, X, Mail, Phone, MapPin, Globe, Briefcase, Clock, Award, Languages, Eye, CheckCircle, XCircle, Search, AlertCircle, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { initializeFormData } from '@/utils/initializeFormData';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { DocumentUpload } from '@/components/ui/document-upload';
import { ProfileAvatarUpload } from '@/components/ProfileAvatarUpload';
import { useProfile } from '@/hooks/useProfile';
import { ProfileCompletion } from '@/components/ProfileCompletion';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface Service {
  id?: string;
  lawyer_user_id: string;
  title: string;
  description: string;
  price_clp: number;
  delivery_time: string;
  features: string[];
  available: boolean;
  created_at?: string;
  updated_at?: string;
}

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
  university: string;
  study_start_year?: string | number | null;
  study_end_year?: string | number | null;
  certifications?: string;
  bar_association_number: string;
  rut: string;
  pjud_verified: boolean;
  zoom_link: string;
  avatar_url?: string;
};

export default function LawyerProfilePage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rutError, setRutError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  
  // Use the useProfile hook to get services and profile data
  const { profile: userProfile, services, loading: profileLoading } = useProfile(user?.id);
  
  // Handle number input changes specifically
  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Special handling for study years - keep as strings
    if (name === 'study_start_year' || name === 'study_end_year') {
      setFormData(prev => ({
        ...prev,
        [name]: value // Keep as string
      }));
    } else {
      // For other number inputs, convert to number
      const numValue = value === '' ? '' : Math.max(0, parseInt(value) || 0);
      setFormData(prev => ({
        ...prev,
        [name]: numValue
      }));
    }
    
    setHasChanges(true);
  };

  // Handle input changes for form fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    // Handle different input types
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }));
    } else if (type === 'number') {
      // Use handleNumberInput for number inputs
      handleNumberInput(e as React.ChangeEvent<HTMLInputElement>);
      return;
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    setHasChanges(true);
  };
  
  // RUT validation function (Chilean ID) with improved error messages
  const validateRUT = (rut: string): { isValid: boolean; error?: string } => {
    if (!rut || typeof rut !== 'string') {
      return { isValid: false, error: 'RUT no válido' };
    }

    // Clean RUT (remove dots and hyphen)
    const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    
    // Validate RUT format (8-9 digits + 1 check digit or 'K')
    if (!/^\d{7,8}[0-9Kk]$/.test(cleanRut)) {
      return { isValid: false, error: 'Formato de RUT inválido' };
    }

    // Extract number and check digit
    const rutNumber = cleanRut.slice(0, -1);
    const checkDigit = cleanRut.slice(-1).toUpperCase();

    // Calculate expected check digit
    let sum = 0;
    let multiplier = 2;

    for (let i = rutNumber.length - 1; i >= 0; i--) {
      sum += parseInt(rutNumber.charAt(i)) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedCheckDigit = (11 - (sum % 11)) === 11 ? '0' : 
                             (11 - (sum % 11)) === 10 ? 'K' : 
                             String(11 - (sum % 11));

    // Compare calculated check digit with provided one
    if (expectedCheckDigit !== checkDigit) {
      return { isValid: false, error: 'RUT no válido' };
    }

    return { isValid: true };
  };

  // Handle verification button click
  const handleVerifyRUT = async () => {
    if (!formData.rut) {
      setRutError('Por favor ingresa un RUT para verificar');
      return;
    }
    
    try {
      const currentRut = formData.rut; // Store the current RUT value
      const result = await verifyWithPJUD(
        currentRut, 
        `${formData.first_name} ${formData.last_name}`.trim()
      );
      
      if (result?.verified) {
        // Update local state with verification result
        setFormData(prev => ({
          ...prev,
          rut: currentRut, // Use the stored RUT value
          pjud_verified: true,
          verification_message: result.message || 'Verificación exitosa'
        }));
        
        // Update verification status
        setVerificationStatus('success');
        setRutError(null);
        
        // Show success message
        toast({
          title: '¡Verificación exitosa!',
          description: result.message || 'Tu RUT ha sido verificado exitosamente.',
          variant: 'default'
        });
      }
    } catch (error) {
      // Set error state
      setVerificationStatus('error');
      
      // Show error message if not already shown
      if (error instanceof Error) {
        setRutError(error.message);
      }
      
      // Log the error
      console.error('Verification failed:', error);
    }
  };

  // Define the verification response type
  interface VerificationResponse {
    verified: boolean;
    message: string;
    error?: string;
    details?: Record<string, unknown>;
  }

  // Verify lawyer against PJUD database
  const verifyWithPJUD = async (rut: string, fullName: string): Promise<VerificationResponse> => {
    // Clear previous state
    setRutError(null);
    setIsVerifying(true);
    setVerificationStatus('verifying');
    
    // Clear any previous verification status
    setFormData(prev => ({
      ...prev,
      pjud_verified: false
    }));
    
    try {
      // Get the auth token for the request
      console.log('Getting user session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !sessionData.session) {
        const errorMsg = 'No se pudo obtener la sesión del usuario. Por favor, inicia sesión nuevamente.';
        console.error('Session error:', sessionError?.message || 'No active session');
        throw new Error(errorMsg);
      }
      
      const { session } = sessionData;
      console.log('Session obtained, calling verification function...');
      
      // Call the verification API using our helper
      const { data, error } = await invokeFunction<VerificationResponse>(
        'verify-lawyer',
        { 
          rut, 
          fullName: fullName.trim(),
          timestamp: new Date().toISOString()
        },
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'x-client-info': 'web-app/1.0'
          }
        }
      );
      
      console.log('Verification response:', { data, error });
      
      if (error) {
        console.error('Error from verification function:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No se recibió respuesta del servidor de verificación');
      }
      
      if (!data.verified) {
        throw new Error(data.message || 'La verificación del RUT falló');
      }
      
      console.log('Verification successful, updating profile...');
      
      // Update local form data immediately to show the verification
      setFormData(prev => ({
        ...prev,
        rut: rut,
        pjud_verified: true
      }));
      
      // Mark that we have changes to save
      setHasChanges(true);
      
      // Try to update the profile with the verified RUT
      try {
        console.log('Updating profile with RUT:', rut);
        
        // First, try to update using the RPC function
        const { error: rpcError } = await supabase.rpc('update_profile_rut', {
          p_user_id: user?.id,
          p_rut: rut
        });
        
        if (rpcError) {
          console.error('RPC update failed, trying direct update...', rpcError);
          
          // If RPC fails, try a direct update with just the RUT field
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              rut: rut,
              pjud_verified: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', user?.id);
            
          if (updateError) {
            console.error('Direct update also failed:', updateError);
          }
        }
      } catch (error) {
        console.error('Error updating profile:', error);
      }
      
      // Show success message
      toast({ 
        title: "¡Verificación exitosa!", 
        description: data.message || "Tu RUT ha sido verificado correctamente. No olvides guardar los cambios para conservar la verificación.", 
        variant: "default"
      });
      
      return {
        verified: true,
        message: data.message || 'Verificación exitosa',
        ...(data.details && { details: data.details })
      };
  } catch (error) {
    console.error('Error in verifyWithPJUD:', error);
    setVerificationStatus('error');

    // Set appropriate error message
    let errorMessage = 'Error al verificar el RUT';
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        errorMessage = 'La verificación está tomando más tiempo de lo esperado. Por favor, inténtalo de nuevo.';
      } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      } else if (error.message.includes('401') || error.message.includes('No active session')) {
        errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        // Redirect to login after showing the error
        setTimeout(() => navigate('/login'), 3000);
      } else {
        errorMessage = error.message || 'Error al verificar el RUT';
      }
    }
    
    setRutError(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setIsVerifying(false);
  }
  };
  
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

  // Helper function to get education data from user metadata
  const initializeFormData = (userData: any): ProfileFormData => {
    // Check if userData.education is an object (new format) or string (old format)
    if (userData.education && typeof userData.education === 'object') {
      return {
        ...userData,
        education: userData.education.degree || '',
        university: userData.education.university || '',
        study_start_year: userData.education.start_year || '',
        study_end_year: userData.education.end_year || '',
        certifications: userData.certifications || ''
      };
    }
    
    // Fallback to old format
    return {
      ...userData,
      education: userData.education || '',
      university: userData.university || '',
      study_start_year: userData.study_start_year || '',
      study_end_year: userData.study_end_year || '',
      certifications: userData.certifications || ''
    };
  };

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
    university: '',
    bar_association_number: '',
    rut: '',
    pjud_verified: false,
    zoom_link: '',
    avatar_url: ''
  });

  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showCompletionAlert, setShowCompletionAlert] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(false);
  const { completionPercentage } = useProfile(user?.id);
  
  // Sincronizar el porcentaje de completitud del perfil
  useEffect(() => {
    if (completionPercentage !== undefined) {
      console.log('Profile completion updated from hook:', completionPercentage, '%');
    }
  }, [completionPercentage]);

  useEffect(() => {
    if (user) {
      console.log('User metadata:', user.user_metadata);
      const initialData = initializeFormData(user.user_metadata);
      console.log('Initializing form data:', initialData);
      setFormData({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        bio: initialData.bio || '',
        phone: initialData.phone || '',
        location: initialData.location || '',
        website: initialData.website || '',
        specialties: initialData.specialties || [],
        experience: initialData.experience || 0,
        hourly_rate: initialData.hourly_rate || 0,
        languages: initialData.languages || [],
        education: initialData.education || '',
        university: initialData.university || '',
        bar_association_number: initialData.bar_association_number || '',
        rut: initialData.rut || '',
        pjud_verified: initialData.pjud_verified || false,
        zoom_link: initialData.zoom_link || '',
        avatar_url: initialData.avatar_url || ''
      });
      setSelectedSpecializations(initialData.specialties || []);
    }
  }, [user]);

  // Handle cancel button click
  const handleCancel = () => {
    if (user?.user_metadata) {
      const initialData = initializeFormData(user.user_metadata);
      setFormData({
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        bio: initialData.bio || '',
        phone: initialData.phone || '',
        location: initialData.location || '',
        website: initialData.website || '',
        specialties: initialData.specialties || [],
        experience: initialData.experience || 0,
        hourly_rate: initialData.hourly_rate || 0,
        languages: initialData.languages || [],
        education: initialData.education || '',
        university: initialData.university || '',
        bar_association_number: initialData.bar_association_number || '',
        rut: initialData.rut || '',
        pjud_verified: initialData.pjud_verified || false,
        zoom_link: initialData.zoom_link || '',
        avatar_url: initialData.avatar_url || ''
      });
      setSelectedSpecializations(initialData.specialties || []);
    }
    setIsEditing(false);
    setError(null);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // If canceling edit, reset form to original values
      if (user?.user_metadata) {
        const initialData = initializeFormData(user.user_metadata);
        setFormData({
          first_name: initialData.first_name || '',
          last_name: initialData.last_name || '',
          bio: initialData.bio || '',
          phone: initialData.phone || '',
          location: initialData.location || '',
          website: initialData.website || '',
          specialties: initialData.specialties || [],
          experience: initialData.experience || 0,
          hourly_rate: initialData.hourly_rate || 0,
          languages: initialData.languages || [],
          education: initialData.education || '',
          bar_association_number: initialData.bar_association_number || '',
          rut: initialData.rut || '',
          pjud_verified: initialData.pjud_verified || false,
          zoom_link: initialData.zoom_link || '',
          avatar_url: initialData.avatar_url || ''
        });
      }
    }
    setIsEditing(!isEditing);
  };

  // Handle save button click
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      console.log('Saving form data:', formData);
      
      // Validar RUT si se está editando
      if (isEditing && formData.rut) {
        const { isValid, error: rutError } = validateRUT(formData.rut);
        if (!isValid) {
          setError(rutError || 'RUT inválido');
          setIsSaving(false);
          return;
        }
      }
      
      // Prepare the update data with only fields that exist in the database
      const updateData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        bio: formData.bio.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        website: formData.website.trim(),
        specialties: selectedSpecializations,
        experience_years: formData.experience ? Number(formData.experience) : null,
        hourly_rate_clp: formData.hourly_rate ? Number(formData.hourly_rate) : null,
        languages: formData.languages || [],
        education: formData.education || '',
        university: formData.university || null,
        study_start_year: formData.study_start_year ? Number(formData.study_start_year) : null,
        study_end_year: formData.study_end_year ? Number(formData.study_end_year) : null,
        certifications: formData.certifications?.trim() || null,
        bar_association_number: formData.bar_association_number.trim() || null,
        rut: formData.rut.trim() || null,
        pjud_verified: formData.pjud_verified || false,
        zoom_link: formData.zoom_link.trim() || null,
        avatar_url: formData.avatar_url || null
      };
      
      console.log('Update data being sent to API:', updateData);
      
      await updateProfile(updateData);
      
      // Update local state
      setFormData(prev => ({
        ...prev,
        ...updateData,
        experience: updateData.experience_years || 0,
        hourly_rate: updateData.hourly_rate_clp || 0
      }));
      
      setHasChanges(false);
      setIsEditing(false);
      
      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios se han guardado correctamente.',
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  }, [formData, selectedSpecializations, updateProfile, toast, isEditing]);

  // Auto-save when profile is 100% complete
  useEffect(() => {
    const autoSave = async () => {
      if (completionPercentage === 100 && hasChanges) {
        try {
          await handleSave();
          console.log('Perfil guardado automáticamente al alcanzar 100% de completitud');
        } catch (error) {
          console.error('Error al guardar automáticamente el perfil:', error);
        }
      }
    };

    autoSave();
  }, [completionPercentage, hasChanges, handleSave]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await handleSave();
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error instanceof Error ? error.message : 'Error al guardar el perfil');
    } finally {
      setIsSaving(false);
    }
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
                onClick={toggleEditMode}
                variant="default"
                type="button"
                className="bg-black text-white hover:bg-gray-800"
              >
                <Edit className="mr-2 h-4 w-4" />
                {isEditing ? 'Cancelar' : 'Editar perfil'}
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

      {/* Profile Status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Estado de tu Perfil</CardTitle>
              <CardDescription className="text-sm">
                Un perfil completo te ayuda a ser más visible para los clientes.
              </CardDescription>
            </div>
            <div className="w-full md:w-2/3">
              <ProfileCompletion completion={completionPercentage} />
              
              {showCompletionAlert && completionPercentage < 100 && (
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <AlertCircle className="h-4 w-4 text-blue-700" />
                  <AlertDescription className="text-sm text-blue-800">
                    Completa tu perfil para mejorar tu visibilidad y atraer más clientes potenciales.
                  </AlertDescription>
                  <button 
                    onClick={() => setShowCompletionAlert(false)}
                    className="absolute right-2 top-2 text-blue-500 hover:text-blue-700"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Alert>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Personal Information */}
      <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
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
                      
                      // @ts-expect-error - Supabase types don't include this property
                      user.user_metadata = updatedMetadata;
                      
                      // Update the form data to trigger the save button
                      setFormData(prev => ({
                        ...prev,
                        avatar_url: url
                      }));
                      
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rut">RUT</Label>
                    <div className="space-y-2 w-full">
                      <div className="relative">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="rut"
                              name="rut"
                              type="text"
                              value={formData.rut || ''}
                              onChange={(e) => {
                                if (rutError) setRutError(null);
                                handleInputChange(e);
                              }}
                              disabled={!isEditing || formData.pjud_verified}
                              placeholder="12.345.678-9"
                              className={`w-full ${rutError ? 'border-red-500 pr-10' : ''}`}
                            />
                            {verificationStatus === 'success' && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              </div>
                            )}
                            {verificationStatus === 'error' && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <XCircle className="h-4 w-4 text-red-500" />
                              </div>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleVerifyRUT}
                            disabled={isVerifying || !formData.rut || formData.pjud_verified || !isEditing}
                            className="whitespace-nowrap h-10 px-3"
                          >
                            {isVerifying ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Verificando
                              </>
                            ) : formData.pjud_verified ? 'Verificado' : 'Verificar'}
                          </Button>
                        </div>
                      </div>
                    </div>
                      
                      {/* Error message */}
                      {rutError && (
                        <p className="text-xs text-red-500 flex items-start gap-1 mt-1">
                          <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          <span>{rutError}</span>
                        </p>
                      )}
                      
                      {/* Success message */}
                      {formData.pjud_verified && (
                        <p className="text-xs text-green-600 flex items-center gap-1.5 mt-1">
                          <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex items-center gap-1">
                            <span>Verificado con el Poder Judicial de Chile</span>
                          </span>
                        </p>
                      )}
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

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="education">Título Profesional</Label>
                {!isEditing ? (
                  <div className="p-2 border rounded-md bg-gray-50">
                    <p className="text-sm">
                      {formData.education || 'No especificado'}
                      {formData.university && (
                        <span className="block text-muted-foreground">
                          {formData.university}
                        </span>
                      )}
                      {(formData.study_start_year || formData.study_end_year) && (
                        <span className="block text-muted-foreground text-sm">
                          {formData.study_start_year} - {formData.study_end_year || 'Presente'}
                        </span>
                      )}
                      {formData.certifications && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-muted-foreground mb-1">Certificaciones:</p>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                            {formData.certifications.split('\n').map((cert, index) => (
                              <li key={index}>{cert.trim()}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="education"
                      name="education"
                      value={formData.education || ''}
                      onChange={handleInputChange}
                      placeholder="Ej: Abogado, Licenciado en Derecho"
                    />
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="university">Universidad</Label>
                  <select
                    id="university"
                    name="university"
                    value={formData.university || ''}
                    onChange={handleInputChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Selecciona tu universidad</option>
                    <option value="Universidad de Chile">Universidad de Chile</option>
                    <option value="Pontificia Universidad Católica de Chile">Pontificia Universidad Católica de Chile</option>
                    <option value="Universidad de Concepción">Universidad de Concepción</option>
                    <option value="Universidad de Valparaíso">Universidad de Valparaíso</option>
                    <option value="Universidad Católica de Valparaíso">Universidad Católica de Valparaíso</option>
                    <option value="Universidad de Santiago de Chile">Universidad de Santiago de Chile</option>
                    <option value="Universidad Diego Portales">Universidad Diego Portales</option>
                    <option value="Universidad Adolfo Ibáñez">Universidad Adolfo Ibáñez</option>
                    <option value="Universidad de Talca">Universidad de Talca</option>
                    <option value="Universidad Austral de Chile">Universidad Austral de Chile</option>
                    <option value="Universidad Católica del Norte">Universidad Católica del Norte</option>
                    <option value="Universidad de La Frontera">Universidad de La Frontera</option>
                    <option value="Universidad Católica de la Santísima Concepción">Universidad Católica de la Santísima Concepción</option>
                    <option value="Universidad de Los Andes">Universidad de Los Andes</option>
                    <option value="Universidad del Desarrollo">Universidad del Desarrollo</option>
                    <option value="Universidad Finis Terrae">Universidad Finis Terrae</option>
                    <option value="Universidad Andrés Bello">Universidad Andrés Bello</option>
                    <option value="Universidad Alberto Hurtado">Universidad Alberto Hurtado</option>
                    <option value="Universidad de Los Lagos">Universidad de Los Lagos</option>
                    <option value="Universidad de Antofagasta">Universidad de Antofagasta</option>
                    <option value="Otra universidad">Otra universidad (especificar en la biografía)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="study_start_year">Año de ingreso</Label>
                  <Input
                    id="study_start_year"
                    name="study_start_year"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={formData.study_start_year || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        study_start_year: value
                      }));
                      setHasChanges(true);
                    }}
                    disabled={!isEditing}
                    placeholder="Año de inicio"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="study_end_year">Año de egreso</Label>
                  <Input
                    id="study_end_year"
                    name="study_end_year"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 10}
                    value={formData.study_end_year || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        study_end_year: value
                      }));
                      setHasChanges(true);
                    }}
                    disabled={!isEditing}
                    placeholder="Año de egreso"
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certifications">Certificaciones</Label>
                  <Textarea
                    id="certifications"
                    name="certifications"
                    value={formData.certifications || ''}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Ingresa tus certificaciones, una por línea"
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Idiomas</Label>
                <div className="flex">
                  <Input
                    value={formData.languages.join(', ')}
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
                    className="rounded-r-none"
                  />
                </div>
              <p className="text-xs text-muted-foreground">
                Separa los idiomas con comas
              </p>
            </div>
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
        
        <div className="flex justify-end space-x-2 pt-4">
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
      </form>
    </div>
  );
}
