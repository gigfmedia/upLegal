import { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import { invokeFunction } from '@/lib/supabaseFunctions';
import type { User } from '@supabase/supabase-js';
import ProfessionalInfoStep from './steps/ProfessionalInfoStep';
import EducationStep from './steps/EducationStep';
import ReviewStep from './steps/ReviewStep';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

// Import step components directly instead of lazy loading to avoid type issues

// Skeleton loader for form steps
const StepSkeleton = () => (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    ))}
  </div>
);

interface FormData {
  bio: string;
  specialties: string;
  hourlyRate: string;
  experienceYears: string;
  education: string;
  barNumber: string;
  languages: string;
  rut: string;
  pjud_verified: boolean;
}

export default function ProfileSetupWizard() {
  // State and navigation
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingRut, setIsVerifyingRut] = useState(false);
  const [rutError, setRutError] = useState<string | null>(null);

  // Steps configuration
  const steps = [
    { id: 1, name: 'Información profesional' },
    { id: 2, name: 'Educación y credenciales' },
    { id: 3, name: 'Revisión' },
  ];

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    bio: '',
    specialties: '',
    hourlyRate: '',
    experienceYears: '',
    education: '',
    barNumber: '',
    languages: '',
    rut: '',
    pjud_verified: false,
  });

  // Navigation handlers
  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  // RUT verification handler
  const handleVerifyRUT = useCallback(async () => {
    if (!formData.rut) {
      setRutError('Por favor ingresa un RUT válido');
      return false;
    }

    setIsVerifyingRut(true);
    setRutError(null);

    try {
      const response = await invokeFunction('verify-lawyer', { rut: formData.rut });
      
      if (!response) throw new Error('No se recibió respuesta del servidor de verificación');
      
      if (response.error) {
        throw new Error(response.error.message || 'Error al verificar el RUT');
      }
      
      if (!response.data?.verified) {
        throw new Error(response.data?.message || 'La verificación del RUT falló');
      }

      setFormData(prev => ({
        ...prev,
        pjud_verified: true
      }));

      toast({
        title: '¡Verificación exitosa!',
        description: 'Tu RUT ha sido verificado correctamente.',
        variant: 'default',
      });

      return true;
    } catch (error) {
      console.error('Error verifying RUT:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al verificar el RUT';
      setRutError(errorMessage);
      toast({
        title: 'Error de verificación',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsVerifyingRut(false);
    }
  }, [formData.rut, toast]);

  // Form submission handler
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      // Prepare profile data
      const profileData = {
        bio: formData.bio || '',
        specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
        hourly_rate_clp: Number(formData.hourlyRate) || 0,
        rut: formData.rut || null,
        pjud_verified: formData.pjud_verified || false,
        experience_years: Number(formData.experienceYears) || 0,
        education: formData.education || '',
        bar_number: formData.barNumber || '',
        languages: formData.languages ? formData.languages.split(',').map(s => s.trim()).filter(Boolean) : [],
        profile_setup_completed: true,
      };

      // Update the profile
      const { error: updateError } = await updateProfile(profileData);
      if (updateError) throw updateError;

      // Show success message
      toast({
        title: '¡Perfil completado!',
        description: 'Tu perfil de abogado ha sido configurado correctamente.',
      });

      // Navigate to dashboard after a short delay
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 1000);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el perfil. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the current step
  const renderStep = useCallback(() => {
    const stepProps = {
      formData,
      onFormDataChange: (updates: Partial<FormData>) => 
        setFormData(prev => ({ ...prev, ...updates })),
      isVerifyingRut,
      rutError,
      onVerifyRut: handleVerifyRUT,
    };

    return (
      <Suspense fallback={<StepSkeleton />}>
        {currentStep === 1 && <ProfessionalInfoStep {...stepProps} />}
        {currentStep === 2 && <EducationStep {...stepProps} />}
        {currentStep === 3 && <ReviewStep {...stepProps} />}
      </Suspense>
    );
  }, [currentStep, formData, isVerifyingRut, rutError, handleVerifyRUT]);

  // Calculate progress
  const progress = (currentStep / steps.length) * 100;

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex flex-col space-y-2">
          <CardTitle>Completa tu perfil de abogado</CardTitle>
          <p className="text-sm text-muted-foreground">
            Paso {currentStep} de {steps.length}: {steps[currentStep - 1]?.name}
          </p>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {renderStep()}
          
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Anterior
            </Button>
            
            {currentStep < steps.length ? (
              <Button onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Completar registro
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
