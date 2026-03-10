import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { verifyLawyer } from '@/api/verifyLawyer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Check } from 'lucide-react';

import PersonalInfoStep, { type PersonalInfoFormData } from './steps/PersonalInfoStep';
import ProfessionalInfoStep, { type ProfessionalInfoFormData } from './steps/ProfessionalInfoStep';
import AvailabilityStep from './steps/AvailabilityStep';
import { WizardStepIndicators, type WizardStep } from './WizardStepIndicators';

const STEPS: WizardStep[] = [
  { id: 1, name: 'Información personal', description: 'Nombre, foto y datos de contacto' },
  { id: 2, name: 'Información profesional', description: 'Especialidades, tarifas y credenciales' },
  { id: 3, name: 'Disponibilidad', description: 'Horarios de atención semanales' },
];

export default function LawyerOnboardingWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(() => {
    const saved = sessionStorage.getItem('onboardingStep');
    return saved ? parseInt(saved, 10) : 1;
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingRut, setIsVerifyingRut] = useState(false);
  const [rutError, setRutError] = useState<string | null>(null);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  /** Step 1 data */
  const [personalData, setPersonalData] = useState<PersonalInfoFormData>({
    first_name: user?.user_metadata?.first_name || '',
    last_name: user?.user_metadata?.last_name || '',
    phone: '',
    location: '',
    avatar_url: '',
  });

  /** Step 2 data */
  const [professionalData, setProfessionalData] = useState<ProfessionalInfoFormData>({
    bio: '',
    specialties: [],
    experience_years: '',
    hourly_rate_clp: '',
    contact_fee_clp: '',
    languages: [],
    education: '',
    university: '',
    study_start_year: '',
    study_end_year: '',
    certifications: '',
    bar_association_number: '',
    rut: '',
    pjud_verified: false,
  });

  useEffect(() => {
    sessionStorage.setItem('onboardingStep', String(currentStep));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          const safeParseString = (val: any) => {
            if (typeof val === 'string') {
              try {
                const parsed = JSON.parse(val);
                if (typeof parsed === 'string') return parsed;
              } catch {
                // Not JSON, return as is
              }
              return val;
            }
            return '';
          };
          
          setPersonalData((prev) => ({
            ...prev,
            first_name: data.first_name || prev.first_name,
            last_name: data.last_name || prev.last_name,
            phone: data.phone || '',
            location: data.location || '',
            avatar_url: data.avatar_url || '',
          }));
          setProfessionalData((prev) => ({
            ...prev,
            bio: data.bio || '',
            specialties: data.specialties || [],
            experience_years: data.experience_years?.toString() || '',
            hourly_rate_clp: data.hourly_rate_clp?.toString() || '',
            contact_fee_clp: data.contact_fee_clp?.toString() || '',
            languages: data.languages || [],
            education: safeParseString(data.education),
            university: data.university || '',
            study_start_year: data.study_start_year?.toString() || '',
            study_end_year: data.study_end_year?.toString() || '',
            certifications: Array.isArray(data.certifications) 
              ? data.certifications.join(', ') 
              : safeParseString(data.certifications),
            bar_association_number: data.bar_association_number || '',
            rut: data.rut || '',
            pjud_verified: !!data.pjud_verified,
          }));
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    }
    loadProfile();
  }, [user?.id]);

  // ───── Save helpers ─────

  const saveStep1 = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: personalData.first_name.trim() || null,
          last_name: personalData.last_name.trim() || null,
          phone: personalData.phone.trim() || null,
          location: personalData.location.trim() || null,
          avatar_url: personalData.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      // Also update auth metadata so name and avatar show everywhere
      await supabase.auth.updateUser({
        data: {
          first_name: personalData.first_name.trim(),
          last_name: personalData.last_name.trim(),
          avatar_url: personalData.avatar_url || null,
        },
      });

      toast({ title: '¡Guardado!', description: 'Información personal guardada correctamente.' });
      setCurrentStep(2);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'No se pudo guardar. Inténtalo de nuevo.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const saveStep2 = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: professionalData.bio.trim() || null,
          specialties: professionalData.specialties,
          experience_years: professionalData.experience_years ? Number(professionalData.experience_years) : null,
          hourly_rate_clp: professionalData.hourly_rate_clp ? Number(professionalData.hourly_rate_clp) : null,
          contact_fee_clp: professionalData.contact_fee_clp ? Number(professionalData.contact_fee_clp) : null,
          languages: professionalData.languages,
          education: professionalData.education.trim() 
            ? JSON.stringify(professionalData.education.trim()) 
            : null,
          university: professionalData.university.trim() || null,
          study_start_year: professionalData.study_start_year ? Number(professionalData.study_start_year) : null,
          study_end_year: professionalData.study_end_year ? Number(professionalData.study_end_year) : null,
          certifications: typeof professionalData.certifications === 'string' && professionalData.certifications.trim()
            ? JSON.stringify(professionalData.certifications.trim())
            : null,
          bar_association_number: typeof professionalData.bar_association_number === 'string' 
            ? professionalData.bar_association_number.trim() || null 
            : null,
          rut: typeof professionalData.rut === 'string' 
            ? professionalData.rut.trim() || null 
            : null,
          pjud_verified: professionalData.pjud_verified,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({ title: '¡Guardado!', description: 'Información profesional guardada correctamente.' });
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Error saving step 2 detail:', err);
      const msg = err?.message || err?.details || err?.hint || 'No se pudo guardar. Inténtalo de nuevo.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinish = () => {
    sessionStorage.removeItem('onboardingStep');
    navigate('/lawyer/dashboard', { replace: true });
  };

  // ───── RUT verification ─────

  const handleVerifyRut = useCallback(async (): Promise<boolean> => {
    if (!professionalData.rut) {
      setRutError('Por favor ingresa un RUT válido');
      return false;
    }
    setIsVerifyingRut(true);
    setRutError(null);
    try {
      const fullName = `${personalData.first_name} ${personalData.last_name}`.trim();
      const result = await verifyLawyer(professionalData.rut, fullName);
      if (!result.verified) {
        const msg = result.message || 'El RUT no está registrado como abogado.';
        setRutError(msg);
        return false;
      }
      setProfessionalData((prev) => ({ ...prev, pjud_verified: true }));
      toast({ title: '¡Verificación exitosa!', description: 'Tu RUT ha sido verificado correctamente.' });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al verificar el RUT';
      setRutError(msg);
      toast({ title: 'Error de verificación', description: msg, variant: 'destructive' });
      return false;
    } finally {
      setIsVerifyingRut(false);
    }
  }, [professionalData.rut, personalData.first_name, personalData.last_name, toast]);

  // ───── Render ─────

  const progress = (currentStep / STEPS.length) * 100;
  const step = STEPS[currentStep - 1] || STEPS[0];

  if (isLoadingProfile) {
    return (
      <Card className="w-full max-w-3xl mx-auto shadow-md">
        <CardContent className="h-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="mb-8 pl-4 pr-4">
        <WizardStepIndicators currentStep={currentStep} steps={STEPS} />
      </div>

      <Card className="shadow-md">
        <CardContent className="space-y-6 pt-6">
        {/* Step content */}
        {currentStep === 1 && (
          <PersonalInfoStep
            formData={personalData}
            onFormDataChange={(updates) => setPersonalData((prev) => ({ ...prev, ...updates }))}
          />
        )}

        {currentStep === 2 && (
          <ProfessionalInfoStep
            formData={professionalData}
            onFormDataChange={(updates) => setProfessionalData((prev) => ({ ...prev, ...updates }))}
            isVerifyingRut={isVerifyingRut}
            rutError={rutError}
            onVerifyRut={handleVerifyRut}
          />
        )}

        {currentStep === 3 && user?.id && (
          <AvailabilityStep
            lawyerId={user.id}
            onSaved={() => setAvailabilitySaved(true)}
          />
        )}

      </CardContent>
    </Card>

    {/* Action buttons */}
    <div className="flex justify-between pt-6 pb-10">
      {currentStep > 1 ? (
        <Button
          variant="ghost"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
        >
          Atrás
        </Button>
      ) : (
        <div />
      )}

      <div className="flex gap-3 items-center">
        {currentStep === 1 && (
          <Button onClick={saveStep1} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar y continuar
          </Button>
        )}

        {currentStep === 2 && (
          <Button onClick={saveStep2} disabled={isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar y continuar
          </Button>
        )}

        {currentStep === 3 && (
          <Button onClick={handleFinish} className="gap-2">
            {availabilitySaved ? 'Ir al dashboard' : 'Ir al dashboard'}
          </Button>
        )}
      </div>
    </div>
    </div>
  );
}
