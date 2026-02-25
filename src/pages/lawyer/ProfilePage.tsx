import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { invokeFunction } from '@/lib/supabaseFunctions';
import type { Profile } from '@/contexts/AuthContext/clean/AuthContext';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { verifyLawyer } from '@/api/verifyLawyer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ManageAvailability  from '@/components/availability/ManageAvailability';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Edit, X, Mail, Phone, MapPin, Globe, Briefcase, Clock, Award, Languages, Eye, CheckCircle, XCircle, Search, AlertCircle, Heart, ShieldCheck } from 'lucide-react';
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

export interface ProfileFormData {
  first_name: string;
  last_name: string;
  bio: string;
  phone: string;
  location: string;
  website: string;
  specialties: string[];
  experience_years: number;
  hourly_rate_clp: number;
  contact_fee_clp: number;
  languages: string[];
  education: string;
  university: string;
  study_start_year?: string | number | null;
  study_end_year?: string | number | null;
  certifications?: string;
  bar_association_number: string;
  rut: string;
  pjud_verified: boolean;
  avatar_url?: string;
  specialization?: string;
  zoom_link?: string;
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
      // For hourly_rate_clp, ensure it's always a number
      if (name === 'hourly_rate_clp') {
        // Remove any non-digit characters
        const cleanValue = value.replace(/\D/g, '');
        // Parse as number, default to 0 if empty or invalid
        const numValue = cleanValue === '' ? 0 : parseInt(cleanValue, 10);
        
        setFormData(prev => ({
          ...prev,
          [name]: isNaN(numValue) ? 0 : numValue
        }));
      } else {
        // For other number inputs, convert to number
        const numValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
        setFormData(prev => ({
          ...prev,
          [name]: numValue
        }));
      }
    }
    
    // Mark as dirty when value changes
    setHasChanges(true);
    
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
  
  // Format RUT with dots and hyphen (e.g., 12.345.678-9)
  const formatRUT = (rut: string): string => {
    // Remove all non-digit and non-k/K characters
    let cleanRut = rut.replace(/[^\dkK]/g, '');
    
    // If empty, return empty string
    if (!cleanRut) return '';
    
    // If it's just one character, return it as is
    if (cleanRut.length === 1) return cleanRut;
    
    // Extract the verification digit (last character)
    const dv = cleanRut.slice(-1).toUpperCase();
    
    // Get the number part (everything except the last character)
    let number = cleanRut.slice(0, -1);
    
    // If number is empty (case when input is just 'k' or 'K')
    if (!number) return `-${dv}`;
    
    // Add dots as thousand separators from right to left
    let formatted = '';
    let counter = 0;
    
    for (let i = number.length - 1; i >= 0; i--) {
      formatted = number[i] + formatted;
      counter++;
      if (counter === 3 && i > 0) {
        formatted = '.' + formatted;
        counter = 0;
      }
    }
    
    // Add the hyphen and verification digit
    return `${formatted}-${dv}`;
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
      
      // Call the verifyLawyer function
      const result = await verifyLawyer(rut, fullName);
      
      if (!result.verified) {
        const errorMsg = result.message || 'El RUT no está registrado como abogado en el sistema.';
        setVerificationStatus('error');
        setRutError(errorMsg);
        return { 
          verified: false, 
          message: errorMsg,
          error: errorMsg
        };
      }
      
      // Update the profile with verification status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          rut: rut,
          pjud_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
      
      if (updateError) {
        console.error('Error updating verification status:', updateError);
        throw new Error('No se pudo guardar la verificación. Por favor, intenta guardar manualmente.');
      }
      
      // Update local state
      setFormData(prev => ({
        ...prev,
        rut: rut,
        pjud_verified: true
      }));
      
      // Mark the form as having changes that need to be saved
      setHasChanges(true);
      setVerificationStatus('success');
      
      toast({
        title: 'RUT verificado',
        description: 'El RUT ha sido verificado exitosamente como abogado.',
        variant: 'default'
      });
      
      return {
        verified: true,
        message: 'Verificación exitosa'
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
      return {
        verified: false,
        message: errorMessage,
        error: errorMessage
      };
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

  // Use a ref to track if we've already initialized the form data
  const initializedRef = React.useRef(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    bio: '',
    phone: '',
    location: '',
    website: '',
    specialties: [],
    experience_years: 0,
    hourly_rate_clp: 0,
    contact_fee_clp: 0,
    languages: [],
    education: '',
    university: '',
    certifications: '',
    study_start_year: '',
    study_end_year: '',
    bar_association_number: '',
    rut: '',
    pjud_verified: false,
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
      //console.log('Profile completion updated from hook:', completionPercentage, '%');
    }
  }, [completionPercentage]);

  // Initialize form data when userProfile is loaded
  useEffect(() => {
    if (userProfile && !initializedRef.current) {
      const metadata = user?.user_metadata || {};
      setFormData({
        first_name: userProfile.first_name || metadata.first_name || '',
        last_name: userProfile.last_name || metadata.last_name || '',
        bio: userProfile.bio || '',
        phone: userProfile.phone || '',
        location: userProfile.location || '',
        website: userProfile.website || '',
        specialties: userProfile.specialties || [],
        experience_years: userProfile.experience_years || 0,
        hourly_rate_clp: userProfile.hourly_rate_clp || 0,
        contact_fee_clp: userProfile.contact_fee_clp || 0,
        languages: userProfile.languages || [],
        education: typeof userProfile.education === 'string' ? userProfile.education : '',
        university: typeof userProfile.university === 'string' ? userProfile.university : '',
        study_start_year: userProfile.study_start_year || '',
        study_end_year: userProfile.study_end_year || '',
        certifications: typeof userProfile.certifications === 'string' ? userProfile.certifications : '',
        bar_association_number: userProfile.bar_association_number || '',
        rut: userProfile.rut || '',
        pjud_verified: userProfile.pjud_verified || false,
        avatar_url: userProfile.avatar_url || ''
      });
      
      setSelectedSpecializations(userProfile.specialties || []);
      initializedRef.current = true;
      setIsEditing(false);
      setError(null);
    }
  }, [userProfile]);

  // Handle cancel button click
  const handleCancel = () => {
    if (user?.user_metadata) {
      const initialData = initializeFormData(user.user_metadata);
      setFormData(prev => ({
        ...prev,
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        bio: initialData.bio || '',
        phone: initialData.phone || '',
        location: initialData.location || '',
        website: initialData.website || '',
        specialties: initialData.specialties || [],
        experience_years: initialData.experience_years || 0,
        hourly_rate_clp: initialData.hourly_rate_clp || 0,
        contact_fee_clp: initialData.contact_fee_clp || 0,
        languages: initialData.languages || [],
        education: typeof initialData.education === 'string' ? initialData.education : '',
        university: typeof initialData.university === 'string' ? initialData.university : '',
        study_start_year: initialData.study_start_year || '',
        study_end_year: initialData.study_end_year || '',
        certifications: typeof initialData.certifications === 'string' ? initialData.certifications : '',
        bar_association_number: initialData.bar_association_number || '',
        rut: initialData.rut || '',
        pjud_verified: initialData.pjud_verified || false,
        avatar_url: initialData.avatar_url || ''
      }));
      setSelectedSpecializations(initialData.specialties || []);
    }
    setIsEditing(false);
    setError(null);
  };

  // Toggle specialization selection
  const toggleSpecialization = (specialty: string) => {
    setSelectedSpecializations(prev => {
      if (prev.includes(specialty)) {
        // If already selected, remove it
        return prev.filter(s => s !== specialty);
      } else {
        // If not selected, add it
        return [...prev, specialty];
      }
    });
    setHasChanges(true);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // If canceling edit, reset form to original values from the profile
      if (userProfile) {
        setFormData(prev => ({
          ...prev,
          first_name: userProfile.first_name || '',
          last_name: userProfile.last_name || '',
          bio: userProfile.bio || '',
          phone: userProfile.phone || '',
          location: userProfile.location || '',
          website: userProfile.website || '',
          specialties: userProfile.specialties || [],
          experience_years: userProfile.experience_years || 0,
          hourly_rate_clp: userProfile.hourly_rate_clp || 0,
          contact_fee_clp: userProfile.contact_fee_clp || 0,
          languages: userProfile.languages || [],
          education: typeof userProfile.education === 'string' ? userProfile.education : '',
          university: typeof userProfile.university === 'string' ? userProfile.university : '',
          study_start_year: userProfile.study_start_year || '',
          study_end_year: userProfile.study_end_year || '',
          certifications: typeof userProfile.certifications === 'string' ? userProfile.certifications : '',
          bar_association_number: userProfile.bar_association_number || '',
          rut: userProfile.rut || '',
          pjud_verified: userProfile.pjud_verified || false,
          avatar_url: userProfile.avatar_url || ''
        }));
      }
    }
    setIsEditing(!isEditing);
  };

  // Handle availability changes from the ManageAvailability component
  const handleAvailabilityChange = () => {
    setHasChanges(true);
  };

  // Handle save button click
  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      
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
      // Helper function to safely trim strings that might be null or undefined
      const safeTrim = (str: string | null | undefined): string | null => {
        return str ? str.trim() : null;
      };

      const updateData = {
        first_name: safeTrim(formData.first_name) || '',
        last_name: safeTrim(formData.last_name) || '',
        bio: safeTrim(formData.bio) || '',
        phone: safeTrim(formData.phone) || null,
        location: safeTrim(formData.location) || null,
        website: safeTrim(formData.website) || null,
        specialties: selectedSpecializations,
        experience_years: formData.experience_years ? Number(formData.experience_years) : null,
        hourly_rate_clp: formData.hourly_rate_clp ? Number(formData.hourly_rate_clp) : null,
        contact_fee_clp: formData.contact_fee_clp ? Number(formData.contact_fee_clp) : null,
        languages: formData.languages || [],
        education: safeTrim(formData.education) || null,
        university: safeTrim(formData.university) || null,
        study_start_year: formData.study_start_year ? Number(formData.study_start_year) : null,
        study_end_year: formData.study_end_year ? Number(formData.study_end_year) : null,
        certifications: safeTrim(formData.certifications) || null,
        bar_association_number: safeTrim(formData.bar_association_number) || null,
        rut: safeTrim(formData.rut) || null,
        pjud_verified: formData.pjud_verified || false,
        avatar_url: formData.avatar_url || null
      };
      
      const updatedUser = await updateProfile(updateData);
      
      // Force a refresh of the user data
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      
      if (refreshedUser) {
        
        // Update local state with the saved data
        setFormData(prev => ({
          ...prev,
          ...updateData,  // Use the data we just saved
          rut: updateData.rut || prev.rut,  // Ensure RUT is updated
          pjud_verified: updateData.pjud_verified || false
        }));
        
        // Reset verification status
        setVerificationStatus(updateData.pjud_verified ? 'success' : 'idle');
        
        // Reset hasChanges after successful save
        setHasChanges(false);
        
        // Show success message
        toast({
          title: 'Perfil actualizado',
          description: 'Tus cambios se han guardado correctamente.',
          variant: 'default'
        });
      }
      
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
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">
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
                <a 
                  href={`/abogado/${(user?.first_name && user?.last_name 
                    ? `${user.first_name.toLowerCase()}-${user.last_name.toLowerCase()}` 
                    : 'abogado')}-${user?.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nameSlug = (user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : 'abogado')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    navigate(`/abogado/${nameSlug}-${user?.id}`);
                    e.preventDefault();
                  }}
                >
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
                  onUpload={async (url) => {
                    if (user) {
                      // Update the local state immediately
                      setFormData(prev => ({ ...prev, avatar_url: url }));
                      
                      try {
                        // Update the auth user metadata via context to sync Header
                        await updateProfile({ avatar_url: url });
                        
                        toast({
                          title: "Avatar actualizado",
                          description: "Tu foto de perfil ha sido actualizada exitosamente.",
                        });
                      } catch (error) {
                        console.error('Error updating profile metadata:', error);
                        toast({
                          title: "Error",
                          description: "Se subió la imagen pero hubo un error al actualizar el perfil.",
                          variant: "destructive"
                        });
                      }
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
                      autoComplete="given-name"
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
                      autoComplete="family-name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <small className='inline-flex'>Cuéntanos sobre tu experiencia, especialidades y forma de trabajo. Esta información ayuda a los usuarios a conocerte mejor y tomar una decisión informada al agendar.</small>
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
                                const inputValue = e.target?.value || '';
                                
                                // Get the clean value (only numbers and k/K)
                                const cleanValue = inputValue.replace(/[^\dkK]/g, '');
                                
                                // Limit to 9 digits + 1 verification digit
                                if (cleanValue.length > 10) {
                                  return;
                                }
                                
                                // Format the RUT
                                let formattedRut = '';
                                
                                if (cleanValue.length > 1) {
                                  // If we have at least 2 characters, format as RUT
                                  formattedRut = formatRUT(cleanValue);
                                } else {
                                  // If it's just one character, just return it
                                  formattedRut = cleanValue;
                                }
                                
                                // Check if RUT has actually changed
                                const rutChanged = formattedRut !== formData.rut;
                                
                                if (rutChanged) {
                                  // Update the form data
                                  setFormData(prev => ({
                                    ...prev,
                                    rut: formattedRut,
                                    pjud_verified: false
                                  }));
                                  
                                  // Reset verification status
                                  setVerificationStatus('idle');
                                  setHasChanges(true);
                                }
                                
                                // Reset any existing RUT errors
                                if (rutError) setRutError(null);
                                
                                // Adjust cursor position if we added formatting characters
                                const input = e.target as HTMLInputElement;
                                const cursorPosition = input.selectionStart || 0;
                                let newPosition = cursorPosition;

                                if (formattedRut.length > inputValue.length) {
                                  // Count how many formatting characters we've added before the cursor
                                  const addedFormatting = formattedRut.slice(0, cursorPosition).match(/[.-]/g)?.length || 0;
                                  newPosition = cursorPosition + addedFormatting;
                                }
                                
                                // Ensure cursor stays within bounds
                                newPosition = Math.min(Math.max(newPosition, 0), formattedRut.length);
                                
                                // Set the cursor position in the next tick
                                setTimeout(() => {
                                  input.setSelectionRange(newPosition, newPosition);
                                }, 0);
                              }}
                              onKeyDown={(e) => {
                                // Allow only numbers, k, K, backspace, delete, and navigation keys
                                if (!/^[0-9kK\b\-.]$/.test(e.key) && 
                                    !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Delete', 'Backspace'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              disabled={!isEditing}
                              placeholder="12.345.678-9"
                              className={`w-full ${rutError ? 'border-red-500 pr-10' : ''} ${formData.pjud_verified ? 'opacity-80 bg-transparent' : ''}`}
                            />
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
                            disabled={isVerifying || !formData.rut || !isEditing}
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
                      
                      {/* Verification status */}
                      <div className="mt-1">
                        {verificationStatus === 'verifying' && (
                          <p className="text-xs text-amber-600 flex items-center gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
                            <span>Verificando con el Poder Judicial...</span>
                          </p>
                        )}
                        
                        {rutError && (
                          <p className="text-xs text-red-500 flex items-start gap-1">
                            <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <span>{rutError}</span>
                          </p>
                        )}
                        
                        {verificationStatus === 'success' && formData.pjud_verified && (
                          <p className="text-xs text-green-600 flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Verificado con el Poder Judicial de Chile</span>
                          </p>
                        )}
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
                        isEditing ? 'cursor-pointer' : 'cursor-default opacity-80'
                      } ${
                        isSelected 
                          ? `bg-primary text-primary-foreground ${isEditing ? 'hover:bg-primary/90' : ''}`
                          : `bg-background ${isEditing ? 'hover:bg-accent hover:text-accent-foreground' : ''}`
                      }`}
                      onClick={() => isEditing && toggleSpecialization(spec)}
                      disabled={!isEditing}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">Años de Experiencia</Label>
                <Input
                  id="experience"
                  name="experience_years"
                  type="number"
                  min="0"
                  value={formData.experience_years || 0}
                  onChange={handleNumberInput}
                  disabled={!isEditing}
                  placeholder="Ej: 5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate_clp">Tarifa por Hora (CLP)</Label>
                <Input
                  id="hourly_rate_clp"
                  name="hourly_rate_clp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.hourly_rate_clp === 0 ? '' : (formData.hourly_rate_clp || 0).toString()}
                  onChange={handleNumberInput}
                  disabled={!isEditing}
                  placeholder="Ej: 50000"
                  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_fee_clp">Tarifa por Contactar (CLP)</Label>
                <Input
                  id="contact_fee_clp"
                  name="contact_fee_clp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.contact_fee_clp === 0 ? '' : (formData.contact_fee_clp || 0).toString()}
                  onChange={handleNumberInput}
                  disabled={!isEditing}
                  placeholder="Ej: 10000"
                />
                <p className="text-xs text-muted-foreground">
                  Esta tarifa se cobrará a los clientes al realizar el segundo "Contactar" contigo.
                </p>
              </div>
            </div>
            
            
            
              <div className="space-y-2">
                <Label htmlFor="documento_profesional">Documento Profesional</Label>
                <fieldset disabled={!isEditing} className={!isEditing ? 'opacity-70' : ''}>
                <DocumentUpload
                  bucket="documents"
                  userId={user?.id}
                  onUpload={async (url, fileName) => {
                    try {
                      // Update user metadata with the new document URL
                      const { data, error } = await supabase.auth.updateUser({
                        data: {
                          ...user?.user_metadata,
                          professional_document: url,
                          document_file_name: fileName
                        }
                      });

                      if (error) throw error;

                      // Update local state
                      setFormData(prev => ({
                        ...prev,
                        professional_document: url
                      }));

                      toast({
                        title: "Documento actualizado",
                        description: "El documento profesional se ha guardado correctamente.",
                        variant: "default",
                      });
                    } catch (error) {
                      console.error('Error updating document:', error);
                      toast({
                        title: "Error",
                        description: "No se pudo guardar el documento. Por favor, inténtalo de nuevo.",
                        variant: "destructive",
                      });
                    }
                  }}
                  currentDocumentUrl={user?.user_metadata?.professional_document}
                  disabled={!isEditing}
                  
                  description="Sube tu título profesional o certificado"
                  fileName={user?.user_metadata?.document_file_name || ''}
                />
                </fieldset>
              </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="education">Título Profesional</Label>
                {!isEditing ? (
                  <div className="p-4 border rounded-md bg-gray-50 space-y-2">
                    <div className="text-sm">
                      {formData.education || 'No especificado'}
                    </div>
                    {formData.university && (
                      <div className="text-muted-foreground text-sm">
                        {formData.university}
                      </div>
                    )}
                    {(formData.study_start_year || formData.study_end_year) && (
                      <div className="text-muted-foreground text-sm">
                        {formData.study_start_year} - {formData.study_end_year || 'Presente'}
                      </div>
                    )}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="study_start_year">Año de ingreso</Label>
                  <Input
                    id="study_start_year"
                    name="study_start_year"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={formData.study_start_year?.toString() || ''}
                    onChange={(e) => {
                      const value = e.target.value ? parseInt(e.target.value, 10) : null;
                      setFormData(prev => ({
                        ...prev,
                        study_start_year: value
                      }));
                      setHasChanges(true);
                    }}
                    onBlur={(e) => {
                      // Asegurar que el valor esté dentro del rango válido
                      let value = e.target.value ? parseInt(e.target.value, 10) : null;
                      if (value && (value < 1950 || value > new Date().getFullYear())) {
                        value = null;
                      }
                      setFormData(prev => ({
                        ...prev,
                        study_start_year: value
                      }));
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
                      const value = e.target.value || '';
                      setFormData(prev => ({
                        ...prev,
                        study_end_year: value
                      }));
                      setHasChanges(true);
                    }}
                    onBlur={(e) => {
                      // Ensure the value is within valid range
                      let value = e.target.value || '';
                      if (value) {
                        const numValue = parseInt(value, 10);
                        if (isNaN(numValue) || numValue < 1950 || numValue > new Date().getFullYear() + 10) {
                          value = '';
                        }
                      }
                      setFormData(prev => ({
                        ...prev,
                        study_end_year: value
                      }));
                    }}
                    disabled={!isEditing}
                    placeholder="Año de egreso"
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications">Certificaciones</Label>
                  {isEditing ? (
                    <Textarea
                      id="certifications"
                      name="certifications"
                      value={formData.certifications || ''}
                      onChange={(e) => {
                        setFormData(prev => ({
                          ...prev,
                          certifications: e.target.value
                        }));
                        setHasChanges(true);
                      }}
                      onBlur={(e) => {
                        // Trim and clean up the certifications text
                        const cleanedValue = e.target.value.trim();
                        setFormData(prev => ({
                          ...prev,
                          certifications: cleanedValue
                        }));
                      }}
                      placeholder="Ingresa tus certificaciones, una por línea"
                      className="min-h-[100px]"
                      disabled={!isEditing}
                    />
                  ) : (
                    <div className="space-y-2">
                      <div 
                        className={`flex h-20 w-full rounded-md border ${!isEditing ? 'border-input/50' : 'border-input bg-background'} px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${!isEditing ? 'cursor-not-allowed opacity-70' : ''} overflow-auto`}
                      >
                        {formData.certifications ? (
                          <div className={`whitespace-pre-wrap text-sm ${!isEditing ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {formData.certifications}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No hay certificaciones ingresadas</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              <div className="space-y-2">
                <Label>Idiomas</Label>
                <div className="flex">
                  <Input
                    value={formData.languages.join(', ')}
                    onChange={(e) => {
                      // Allow commas in the input by not splitting on them
                      // The user can type commas, but we'll split on them when needed
                      const value = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        languages: value ? [value] : []
                      }));
                      setHasChanges(true);
                    }}
                    disabled={!isEditing}
                    placeholder="Ej: Español, Inglés, Francés..."
                    className="rounded"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Separa los idiomas con comas
                </p>
              </div>
            </div>
            
            {/* Availability Management Section */}
            <div className="pt-6 border-t mt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium">Disponibilidad</h4>
                  <p className="text-sm text-muted-foreground">
                    Configura tus horarios disponibles para citas
                  </p>
                </div>
              </div>
              
              {user?.id && (
                <div className="rounded-lg">
                  <ManageAvailability 
                    lawyerId={user.id} 
                    isEditing={isEditing} 
                    onAvailabilityChange={handleAvailabilityChange}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="zoom_link">Enlace de Google Meet para tus Citas</Label>
              <div className="relative">
                <Input
                  id="zoom_link"
                  name="zoom_link"
                  type="text"
                  value={formData.zoom_link || ''}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  placeholder="https://meet.google.com/tu-codigo"
                  className="pr-8"
                />
                {formData.zoom_link && (
                  <a 
                    href={formData.zoom_link.startsWith('http') ? formData.zoom_link : `https://${formData.zoom_link}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-700"
                    title="Abrir enlace de Google Meet"
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
                <a 
                  href={`/abogado/${(user?.first_name && user?.last_name 
                    ? `${user.first_name.toLowerCase()}-${user.last_name.toLowerCase()}` 
                    : 'abogado')}-${user?.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const nameSlug = (user?.first_name && user?.last_name 
                      ? `${user.first_name} ${user.last_name}` 
                      : 'abogado')
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');
                    navigate(`/abogado/${nameSlug}-${user?.id}`);
                    e.preventDefault();
                  }}
                >
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
