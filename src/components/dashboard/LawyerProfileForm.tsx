import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, X, CheckCircle2, AlertCircle, Loader2, Verified } from 'lucide-react';
import { verifyRutWithPJUD, formatRut, cleanRut, validateRut } from '@/services/pjudService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseClient';
import type { Profile } from '@/contexts/AuthContext/clean/AuthContext';

const specializations = [
  'Derecho Civil',
  'Derecho Laboral',
  'Derecho de Familia',
  'Derecho Penal',
  'Derecho Comercial',
  'Propiedad Intelectual',
  'Derecho Tributario',
  'Derecho Inmobiliario'
];

const formSchema = z.object({
  firstName: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  lastName: z.string().min(2, { message: 'El apellido debe tener al menos 2 caracteres' }),
  email: z.string().email({ message: 'Ingresa un correo electrónico válido' }),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.string()
    .refine(val => !val || /^\d+$/.test(val), {
      message: 'Debe ser un número válido',
    })
    .optional(),
  education: z.string().optional(),
  university: z.string().optional(),
  studyStartYear: z.string().optional(),
  studyEndYear: z.string().optional(),
  barAssociationNumber: z.string().optional(),
  meetLink: z.string().url('Debe ser una URL válida').optional().or(z.literal('')),
  hourlyRate: z.string()
    .refine(val => !val || /^\d+$/.test(val), {
      message: 'Debe ser un número válido',
    })
    .optional(),
  certifications: z.string().optional(),
  languages: z.array(z.string()),
  availability: z.string().optional(),
  rut: z.string().min(8, { message: 'Ingresa un RUT válido' }),
  pjudVerified: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function LawyerProfileForm() {
  const { user, updateProfile, profile } = useAuth();
  
  // Set initial verification status and RUT value based on profile data
  useEffect(() => {
    if (profile) {
      if (profile.pjud_verified) {
        setVerificationStatus('verified');
      } else {
        setVerificationStatus('idle');
      }
      if (profile.rut) {
        setRutValue(profile.rut);
        form.setValue('rut', profile.rut, { shouldValidate: true });
      }
    }
  }, [profile]);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState('');
  const [isEditing, setIsEditing] = useState(true); // Set to true by default to enable editing
  const [rutValue, setRutValue] = useState(''); // Local state for RUT input

  // Mock function to simulate PJUD API verification
  const verifyWithPJUD = async (rut: string) => {
    setIsVerifying(true);
    setVerificationStatus('verifying');
    setVerificationError('');
    
    try {
      // In a real implementation, you would call your backend API here
      // which would then call the PJUD API with proper authentication
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Mock response - in a real app, this would come from your backend
      const isVerified = Math.random() > 0.5; // 50% chance of success for demo
      
      if (isVerified) {
        setVerificationStatus('verified');
        form.setValue('pjudVerified', true, { shouldValidate: true });
        toast({
          title: 'Verificación exitosa',
          description: 'El RUT ha sido verificado exitosamente con el Poder Judicial.',
          variant: 'default',
        });
      } else {
        throw new Error('No se pudo verificar el RUT con el Poder Judicial');
      }
    } catch (error) {
      console.error('Error verifying RUT with PJUD:', error);
      setVerificationStatus('error');
      setVerificationError(error instanceof Error ? error.message : 'Error al verificar el RUT');
      form.setValue('pjudVerified', false, { shouldValidate: true });
      toast({
        title: 'Error de verificación',
        description: 'No se pudo verificar el RUT con el Poder Judicial. Por favor, inténtalo de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle RUT input change with formatting
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Formatear el RUT mientras se escribe
    const formattedRut = formatRutInput(value);
    form.setValue('rut', formattedRut, { shouldValidate: true });
    
    // Si el RUT cambia después de estar verificado, reiniciar el estado de verificación
    if (verificationStatus === 'verified') {
      setVerificationStatus('idle');
      form.setValue('pjudVerified', false, { shouldValidate: true });
    }
  };

  // Verify RUT with PJUD API
  const handleVerifyRut = async () => {
    const rut = form.getValues('rut');
    if (!rut || !validateRut(rut)) {
      toast({
        title: 'RUT inválido',
        description: 'Por favor ingresa un RUT válido antes de verificar.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    setVerificationStatus('verifying');
    setVerificationError('');

    try {
      const result = await verifyRutWithPJUD(rut);
      
      if (result.verified) {
        setVerificationStatus('verified');
        form.setValue('pjudVerified', true, { shouldValidate: true });
        
        toast({
          title: 'Verificación exitosa',
          description: 'El RUT ha sido verificado exitosamente con el Poder Judicial.',
          variant: 'default',
        });
        
        // Update user's name if available from PJUD data
        if (result.data?.nombre) {
          const [firstName, ...lastNameParts] = result.data.nombre.split(' ');
          const lastName = lastNameParts.join(' ');
          
          if (firstName) form.setValue('firstName', firstName, { shouldValidate: true });
          if (lastName) form.setValue('lastName', lastName, { shouldValidate: true });
        }
      } else {
        throw new Error('El RUT no pudo ser verificado con el Poder Judicial');
      }
    } catch (error) {
      console.error('Error verifying RUT with PJUD:', error);
      setVerificationStatus('error');
      setVerificationError(
        error instanceof Error ? error.message : 'Error al verificar el RUT con el Poder Judicial'
      );
      form.setValue('pjudVerified', false, { shouldValidate: true });
      
      toast({
        title: 'Error de verificación',
        description: 'No se pudo verificar el RUT con el Poder Judicial. Por favor, inténtalo de nuevo más tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };


  // Get default form values from user metadata
  const getDefaultValues = (): FormValues => {
    if (!user) return {} as FormValues;

    const metadata = user.user_metadata || {};
    
    // Función para asegurar que los valores numéricos sean cadenas válidas
    const safeNumberToString = (value: any) => {
      if (value === null || value === undefined) return '';
      const num = Number(value);
      return isNaN(num) ? '' : String(Math.round(num));
    };
    
    return {
      firstName: metadata.first_name || '',
      lastName: metadata.last_name || '',
      phone: metadata.phone || '',
      bio: metadata.bio || '',
      specialization: metadata.specialization || '',
      experience: safeNumberToString(metadata.experience_years),
      education: metadata.education || '',
      university: metadata.university || '',
      studyStartYear: safeNumberToString(metadata.study_start_year),
      studyEndYear: safeNumberToString(metadata.study_end_year),
      barAssociationNumber: metadata.bar_association_number || '',
      meetLink: metadata.meet_link || '',
      hourlyRate: safeNumberToString(metadata.hourly_rate_clp),
      certifications: metadata.certifications || '',
      languages: Array.isArray(metadata.languages) ? metadata.languages : [],
      availability: metadata.availability || 'disponible',
      rut: metadata.rut || '',
      pjudVerified: metadata.pjud_verified || false,
      email: user?.email || ''
    };
        
        if (Array.isArray(certs)) {
          return certs.join('\n');
        }
        
        if (typeof certs === 'string') {
          if (certs.includes('\n')) return certs;
          if (certs.includes(',')) return certs.split(',').map(c => c.trim()).join('\n');
          return certs;
        }
        
        if (typeof certs === 'object' && certs !== null) {
          return Object.values(certs).filter(Boolean).join('\n');
        }
        
        return '';
      })(),
      barAssociationNumber: userMetadata.bar_association_number || '',
      rut: userMetadata.rut || '',
      pjudVerified: userMetadata.pjud_verified || false,
      availability: userMetadata.availability || 'disponible',
      meetLink: userMetadata.meet_link || '',
    };
  };
  
  // Get the current values directly from user metadata
  const getCurrentValue = (field: string) => {
    if (!user?.user_metadata) return '';
    
    if (field === 'experience') {
      return user.user_metadata.experience_years !== undefined && user.user_metadata.experience_years !== null
        ? String(user.user_metadata.experience_years)
        : '';
    }
    
    if (field === 'hourlyRate') {
      return user.user_metadata.hourly_rate_clp !== undefined && user.user_metadata.hourly_rate_clp !== null
        ? String(user.user_metadata.hourly_rate_clp)
        : '';
    }
    
    return form.getValues(field as keyof FormValues);
  };

  // Inicializar el formulario con los valores por defecto
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(() => getDefaultValues(), [user]),
    mode: 'onChange'
  });
  
  // Resetear el formulario cuando cambia el usuario
  useEffect(() => {
    if (user) {
      const defaults = getDefaultValues();
      form.reset(defaults);
    }
  }, [user]);
  
  // Actualizar los valores del formulario cuando cambian los datos del usuario
  useEffect(() => {
    if (user) {
      const newValues = getDefaultValues();
      // Usar reset con shouldValidate: false para evitar validaciones innecesarias
      form.reset(newValues, { keepValues: false });
    }
  }, [user?.user_metadata]);
  
  // Efecto para actualizar el formulario cuando cambian los datos del usuario
  useEffect(() => {
    if (user) {
      const values = getDefaultValues();
      
      // Actualizar el formulario sin marcar como dirty
      form.reset(values, {
        keepDirty: false,
        keepErrors: false,
        keepIsSubmitted: false,
        keepIsSubmitSuccessful: false,
        keepIsValid: false,
        keepTouched: false
      });
    }
  }, [user?.user_metadata]);

  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Procesar la tarifa horaria
      const processHourlyRate = (rate: any): number | null => {
        if (rate === null || rate === undefined || rate === '') {
          return null;
        }
        
        const cleanRate = String(rate)
          .replace(/\./g, '')  // Eliminar separadores de miles
          .replace(',', '.')    // Convertir coma decimal a punto
          .replace(/[^0-9.]/g, ''); // Eliminar caracteres no numéricos
        
        const num = Number(cleanRate);
        return isNaN(num) ? null : Math.round(num);
      };
      
      // Procesar años de estudio
      const processYear = (year: string | undefined): number | null => {
        if (!year || year.trim() === '') return null;
        const num = Number(year);
        return isNaN(num) ? null : num;
      };

      const studyStartYear = processYear(data.studyStartYear);
      const studyEndYear = processYear(data.studyEndYear);
      const hourlyRate = processHourlyRate(data.hourlyRate);
      
      // Preparar los datos del perfil
      const profileData = {
        ...user.user_metadata, // Mantener datos existentes
        first_name: data.firstName?.trim() || null,
        last_name: data.lastName?.trim() || null,
        phone: data.phone?.trim() || null,
        bio: data.bio?.trim() || null,
        specialties: data.specialization ? [data.specialization] : [],
        experience_years: data.experience ? parseInt(data.experience, 10) : null,
        hourly_rate_clp: hourlyRate,
        education: data.education?.trim() || null,
        university: data.university?.trim() || null,
        study_start_year: studyStartYear,
        study_end_year: studyEndYear,
        certifications: data.certifications || null,
        bar_association_number: data.barAssociationNumber?.trim() || null,
        meet_link: data.meetLink?.trim() || null,
        languages: Array.isArray(data.languages) 
          ? data.languages.filter(lang => lang && lang.trim() !== '')
          : [],
        availability: data.availability || 'disponible'
      };
      
      // Actualizar el perfil
      const result = await updateProfile(profileData);
      
      if (!result) {
        throw new Error('No se pudo actualizar el perfil');
      }
      
      // Actualizar el estado del usuario con la respuesta del servidor
      const updatedUser = {
        ...user,
        user_metadata: {
          ...user.user_metadata,
          ...result,
          // Asegurarse de que los valores numéricos se guarden correctamente
          hourly_rate_clp: result.hourly_rate_clp !== undefined 
            ? result.hourly_rate_clp 
            : user.user_metadata?.hourly_rate_clp || null,
          experience_years: result.experience_years !== undefined
            ? result.experience_years
            : user.user_metadata?.experience_years || null
        }
      };
      
      // Actualizar el estado del usuario
      setUser(updatedUser);
      
      // Mostrar notificación de éxito
      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios se han guardado correctamente.',
        variant: 'default',
      });
      
      return result;
      
    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil. Por favor, intente nuevamente.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Perfil Profesional</h2>
        <p className="text-muted-foreground">
          Completa tu perfil para que los clientes puedan conocerte mejor.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellido</FormLabel>
                  <FormControl>
                    <Input placeholder="Tu apellido" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="tu@email.com" {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="+56 9 1234 5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidad principal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una especialidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="experience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Años de experiencia</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ej: 5"
                      value={form.watch('experience')}
                      onChange={(e) => {
                        // Solo permitir números
                        const value = e.target.value.replace(/\D/g, '');
                        form.setValue('experience', value, { 
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true
                        });
                      }}
                      disabled={isLoading}
                      className="bg-gray-50"
                      inputMode="numeric"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

// ...

            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio por hora (CLP)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ej: 50000"
                      value={form.watch('hourlyRate')}
                      onChange={(e) => {
                        // Solo permitir números
                        const value = e.target.value.replace(/\D/g, '');
                        form.setValue('hourlyRate', value, { 
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true
                        });
                      }}
                      disabled={isLoading}
                      className="bg-gray-50"
                      inputMode="numeric"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

// ...
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
