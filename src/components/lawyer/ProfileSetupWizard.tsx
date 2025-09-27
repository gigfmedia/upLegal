import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

interface FormData {
  bio: string;
  specialties: string;
  hourlyRate: string;
  experienceYears: string;
  education: string;
  barNumber: string;
  languages: string;
}

export default function ProfileSetupWizard() {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Helper function to update user data in the auth state
  const updateUser = async (user: User) => {
    try {
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      // Get the latest profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (error) throw error;
      
      // Update the user's metadata with the latest profile data
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          ...session.user.user_metadata,
          ...profile,
          profile_setup_completed: true
        }
      });
      
      if (updateError) throw updateError;
      
      // Refresh the session to ensure the latest data is available
      await supabase.auth.refreshSession();
      
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };
  
  const [formData, setFormData] = useState<FormData>({
    bio: '',
    specialties: '',
    hourlyRate: '',
    experienceYears: '',
    education: '',
    barNumber: '',
    languages: '',
  });

  const steps = [
    { id: 1, name: 'Información profesional' },
    { id: 2, name: 'Educación y credenciales' },
    { id: 3, name: 'Revisión' },
  ];

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 1));

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
        experience_years: Number(formData.experienceYears) || 0,
        education: formData.education || '',
        bar_number: formData.barNumber || '',
        languages: formData.languages ? formData.languages.split(',').map(s => s.trim()).filter(Boolean) : [],
        profile_setup_completed: true,
      };

      // Update the profile with all fields including profile_setup_completed
      const { error: updateError } = await updateProfile(profileData);
      if (updateError) throw updateError;
      
      // Update user metadata
      await updateUser(session.user);
      
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bio">Biografía profesional</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Cuéntanos sobre tu experiencia y especialización"
                rows={5}
              />
            </div>
            <div>
              <Label>Especialidades</Label>
              <Input
                value={formData.specialties}
                onChange={(e) => setFormData({...formData, specialties: e.target.value})}
                placeholder="Ej: Derecho Laboral, Derecho Civil"
              />
              <p className="text-sm text-muted-foreground mt-1">Separa las especialidades con comas</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourlyRate">Tarifa por hora (CLP)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="experienceYears">Años de experiencia</Label>
                <Input
                  id="experienceYears"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => setFormData({...formData, experienceYears: e.target.value})}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label>Formación académica</Label>
              <Textarea
                value={formData.education}
                onChange={(e) => setFormData({...formData, education: e.target.value})}
                placeholder="Ej: Licenciado en Derecho, Universidad de Chile, 2015"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="barNumber">Número de abogado</Label>
              <Input
                id="barNumber"
                value={formData.barNumber}
                onChange={(e) => setFormData({...formData, barNumber: e.target.value})}
                placeholder="Ej: AB12345"
              />
            </div>
            <div>
              <Label>Idiomas que habla</Label>
              <Input
                value={formData.languages}
                onChange={(e) => setFormData({...formData, languages: e.target.value})}
                placeholder="Ej: Español, Inglés, Francés"
              />
              <p className="text-sm text-muted-foreground mt-1">Separa los idiomas con comas</p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Resumen de tu perfil</h3>
              <p className="text-sm text-muted-foreground">Revisa que toda la información sea correcta.</p>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Biografía</h4>
                <p className="text-sm">{formData.bio || 'No proporcionada'}</p>
              </div>
              <div>
                <h4 className="font-medium">Especialidades</h4>
                <p className="text-sm">{formData.specialties || 'No especificadas'}</p>
              </div>
              <div>
                <h4 className="font-medium">Tarifa por hora</h4>
                <p className="text-sm">${parseInt(formData.hourlyRate || '0').toLocaleString('es-CL')}</p>
              </div>
              <div>
                <h4 className="font-medium">Años de experiencia</h4>
                <p className="text-sm">{formData.experienceYears || '0'}</p>
              </div>
              <div>
                <h4 className="font-medium">Formación académica</h4>
                <p className="text-sm whitespace-pre-line">{formData.education || 'No proporcionada'}</p>
              </div>
              <div>
                <h4 className="font-medium">Número de abogado</h4>
                <p className="text-sm">{formData.barNumber || 'No proporcionado'}</p>
              </div>
              <div>
                <h4 className="font-medium">Idiomas</h4>
                <p className="text-sm">{formData.languages || 'No especificados'}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Perfil de abogado</CardTitle>
          <div className="pt-4">
            <div className="flex justify-between mb-2 text-sm text-muted-foreground">
              <span>Paso {currentStep} de {steps.length}</span>
              <span>{steps[currentStep - 1]?.name}</span>
            </div>
            <Progress value={(currentStep / steps.length) * 100} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="py-6">
          {renderStep()}
        </CardContent>
        <div className="px-6 pb-6 flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            Anterior
          </Button>
          {currentStep < steps.length ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              Siguiente
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Confirmar y guardar'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
