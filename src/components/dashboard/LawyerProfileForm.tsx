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
  phone: z.string().min(8, { message: 'Ingresa un número de teléfono válido' }),
  bio: z.string().min(20, { message: 'La biografía debe tener al menos 20 caracteres' }),
  specialization: z.string().min(1, { message: 'Seleccione una especialidad' }),
  experience: z.string().min(1, { message: 'Ingresa los años de experiencia' }),
  hourlyRate: z.string().min(1, { message: 'Ingresa una tarifa por hora' }),
  rut: z.string().min(8, { message: 'Ingresa un RUT válido' }),
  pjudVerified: z.boolean().default(false),
  languages: z.array(z.string()).min(1, { message: 'Ingresa al menos un idioma' }),
  education: z.string().min(1, { message: 'Ingresa su formación académica' }),
  university: z.string().min(1, { message: 'Ingresa el nombre de la universidad' }),
  studyStartYear: z.union([
    z.string().min(4, { message: 'Ingresa un año válido (4 dígitos)' }),
    z.string().length(0)
  ]).optional().transform(val => val === '' ? undefined : val),
  studyEndYear: z.union([
    z.string().min(4, { message: 'Ingresa un año válido (4 dígitos)' }),
    z.string().length(0)
  ]).optional().transform(val => val === '' ? undefined : val),
  certifications: z.string().optional(),
  barAssociationNumber: z.string().min(1, { message: 'Ingresa su número de colegiado' }),
  availability: z.string().min(1, { message: 'Seleccione su disponibilidad' }),
  zoomLink: z.string().url({ message: 'Ingresa una URL de Zoom válida' }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function LawyerProfileForm() {
  const { user, updateProfile, profile } = useAuth();
  
  // Set initial verification status based on profile data
  useEffect(() => {
    if (profile?.pjud_verified) {
      setVerificationStatus('verified');
    }
  }, [profile]);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'error'>('idle');
  const [verificationError, setVerificationError] = useState('');

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
    const value = e.target.value.toUpperCase();
    const formattedValue = formatRut(value);
    form.setValue('rut', formattedValue, { shouldValidate: true });
    
    // Reset verification status if RUT changes
    if (verificationStatus !== 'idle') {
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


  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.user_metadata?.first_name || '',
      lastName: user?.user_metadata?.last_name || '',
      phone: user?.user_metadata?.phone || '',
      bio: user?.user_metadata?.bio || '',
      specialization: Array.isArray(user?.user_metadata?.specialties) && user.user_metadata.specialties.length > 0 
        ? user.user_metadata.specialties[0] 
        : user?.user_metadata?.specialization || '',
      experience: user?.user_metadata?.experience_years?.toString() || '',
      hourlyRate: user?.user_metadata?.hourly_rate_clp?.toString() || '',
      languages: Array.isArray(user?.user_metadata?.languages) 
        ? user.user_metadata.languages 
        : (user?.user_metadata?.languages ? [user.user_metadata.languages] : ['']),
      education: user?.user_metadata?.education || '',
      university: user?.user_metadata?.university || '',
      // Load study years from user metadata - handle both string and number values
      studyStartYear: user?.user_metadata?.study_start_year !== undefined && 
                     user?.user_metadata?.study_start_year !== null && 
                     user.user_metadata.study_start_year !== ''
        ? String(user.user_metadata.study_start_year)
        : '',
      studyEndYear: user?.user_metadata?.study_end_year !== undefined && 
                   user?.user_metadata?.study_end_year !== null && 
                   user.user_metadata.study_end_year !== ''
        ? String(user.user_metadata.study_end_year)
        : '',
      certifications: user?.user_metadata?.certifications || '',
      barAssociationNumber: user?.user_metadata?.bar_association_number || '',
      rut: user?.user_metadata?.rut || '',
      pjudVerified: user?.user_metadata?.pjud_verified || false,
      availability: user?.user_metadata?.availability || 'disponible',
      zoomLink: user?.user_metadata?.zoom_link || '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      
      console.log('Form submitted with raw data:', {
        studyStartYear: data.studyStartYear,
        studyEndYear: data.studyEndYear,
        studyStartYearType: typeof data.studyStartYear,
        studyEndYearType: typeof data.studyEndYear
      });
      
      // Process study years - convert empty strings to null and validate years
      const processYear = (year: string | undefined): number | null => {
        console.log('Processing year:', { year, type: typeof year });
        if (!year || year.trim() === '') {
          console.log('Year is empty, returning null');
          return null;
        }
        const num = Number(year);
        const result = isNaN(num) ? null : num;
        console.log('Processed year result:', { year, result });
        return result;
      };

      const studyStartYear = processYear(data.studyStartYear);
      const studyEndYear = processYear(data.studyEndYear);
      
      console.log('Processed study years:', { studyStartYear, studyEndYear });
      
      // Validate end year is after start year if both are provided
      if (studyStartYear && studyEndYear) {
        console.log('Validating years:', { studyStartYear, studyEndYear });
        if (studyEndYear < studyStartYear) {
          console.log('Validation failed: end year is before start year');
          form.setError('studyEndYear', {
            type: 'manual',
            message: 'El año de término debe ser posterior al año de inicio'
          });
          setIsLoading(false);
          return;
        }
        console.log('Year validation passed');
      }
      
      console.log('Form submitted with data:', {
        ...data,
        studyStartYear,
        studyEndYear,
        studyStartYearType: typeof data.studyStartYear,
        studyEndYearType: typeof data.studyEndYear
      });
      
      // Prepare the profile data with proper type conversion
      const profileData: Partial<Profile> = {
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        // Use the processed study years
        study_start_year: studyStartYear,
        study_end_year: studyEndYear,
        phone: data.phone || null,
        bio: data.bio || null,
        // Map form fields to profile fields
        display_name: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}`.trim() : null,
        website: null, // Not in form
        location: null, // Not in form
        avatar_url: null, // Handled separately
        specialties: data.specialization ? [data.specialization] : [],
        experience_years: data.experience ? parseInt(data.experience, 10) : null,
        hourly_rate_clp: data.hourlyRate ? parseFloat(data.hourlyRate) : null,
        languages: Array.isArray(data.languages) 
          ? data.languages.filter(lang => lang.trim() !== '')
          : [],
        education: data.education || null,
        university: data.university || null,
        // Handle study years - convert to number or null
        study_start_year: data.studyStartYear ? Number(data.studyStartYear) : null,
        study_end_year: data.studyEndYear ? Number(data.studyEndYear) : null,
        certifications: data.certifications || null,
        bar_association_number: data.barAssociationNumber || null,
        availability: data.availability || null,
        zoom_link: data.zoomLink || null,
        // Default values for required fields
        rut: null, // Not in form
        pjud_verified: false, // Not in form
        profile_setup_completed: true
      };
      
      console.log('Prepared profile data for update:', JSON.stringify(profileData, null, 2));

      console.log('Submitting profile data:', JSON.stringify(profileData, null, 2));
      
      const result = await updateProfile(profileData);
      
      if (!result) {
        throw new Error('Failed to update profile');
      }

      toast({
        title: 'Perfil actualizado',
        description: 'Tus cambios se han guardado correctamente.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil. Por favor, intente nuevamente.',
        variant: 'destructive',
      });
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
                    <Input type="number" placeholder="5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tarifa por hora (CLP)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RUT</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <div className="relative flex-1">
                        <Input
                          {...field}
                          value={field.value || ''}
                          onChange={handleRutChange}
                          placeholder="12.345.678-9"
                          className={verificationStatus === 'verified' ? 'border-green-500' : ''}
                        />
                        {verificationStatus === 'verified' && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <Button
                      type="button"
                      variant={verificationStatus === 'verified' ? 'outline' : 'default'}
                      onClick={handleVerifyRut}
                      disabled={isVerifying || !form.getValues('rut') || !validateRut(form.getValues('rut'))}
                      className="whitespace-nowrap"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : verificationStatus === 'verified' ? (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Verificado
                        </>
                      ) : (
                        <>
                          <Verified className="mr-2 h-4 w-4" />
                          Verificar con PJUD
                        </>
                      )}
                    </Button>
                  </div>
                  <FormDescription>
                    {verificationStatus === 'error' && (
                      <span className="text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {verificationError || 'Error al verificar el RUT'}
                      </span>
                    )}
                    {verificationStatus === 'idle' && 'Ingresa tu RUT para verificar con el Poder Judicial'}
                    {verificationStatus === 'verifying' && 'Verificando con el Poder Judicial...'}
                    {verificationStatus === 'verified' && (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" />
                        RUT verificado correctamente
                      </span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => {
                // Convert array to string for input
                const inputValue = Array.isArray(field.value) 
                  ? field.value.join(', ')
                  : field.value || '';

                return (
                  <FormItem>
                    <FormLabel>Idiomas que hablas</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          value={inputValue}
                          onChange={(e) => {
                            // Store the raw input value
                            field.onChange([e.target.value]);
                          }}
                          onBlur={(e) => {
                            // Split by commas and clean up when input loses focus
                            if (e.target.value) {
                              const languages = e.target.value
                                .split(',')
                                .map(lang => lang.trim())
                                .filter(lang => lang.length > 0);
                              field.onChange(languages);
                            }
                          }}
                          placeholder="Ej: Español, Inglés, Francés"
                        />
                        <p className="text-xs text-muted-foreground">
                          Separa los idiomas con comas
                        </p>
                        
                        {/* Display tags for each language */}
                        {Array.isArray(field.value) && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {field.value.map((lang, index) => (
                              lang.trim() && (
                                <div 
                                  key={index} 
                                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                                >
                                  {lang}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const newLangs = field.value.filter((_, i) => i !== index);
                                      field.onChange(newLangs);
                                    }}
                                    className="ml-1.5 text-blue-600 hover:text-blue-800"
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="education"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título profesional</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Abogado"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Universidad</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Universidad de Chile"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studyStartYear"
                render={({ field }) => {
                  const currentYear = new Date().getFullYear();
                  const startYear = field.value ? parseInt(field.value, 10) : null;
                  
                  return (
                    <FormItem>
                      <FormLabel>Año de inicio</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1900"
                          max={currentYear}
                          placeholder="Ej: 2010"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid year
                            if (value === '' || /^\d{0,4}$/.test(value)) {
                              field.onChange(value || '');
                            }
                          }}
                          onBlur={() => {
                            // Validate year range when field loses focus
                            if (field.value) {
                              const year = parseInt(field.value, 10);
                              if (year < 1900 || year > currentYear) {
                                form.setError('studyStartYear', {
                                  type: 'manual',
                                  message: `Año debe estar entre 1900 y ${currentYear}`
                                });
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-xs text-muted-foreground">
                        Año entre 1900 y {currentYear}
                      </FormDescription>
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="studyEndYear"
                render={({ field }) => {
                  const currentYear = new Date().getFullYear();
                  const startYear = form.watch('studyStartYear');
                  const parsedStartYear = startYear ? parseInt(startYear, 10) : null;
                  const minYear = parsedStartYear || 1900;
                  
                  return (
                    <FormItem>
                      <FormLabel>Año de término</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={minYear}
                          max={currentYear}
                          placeholder="Ej: 2015"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid year
                            if (value === '' || /^\d{0,4}$/.test(value)) {
                              field.onChange(value || '');
                            }
                          }}
                          onBlur={() => {
                            // Validate year range when field loses focus
                            if (field.value) {
                              const year = parseInt(field.value, 10);
                              if (year < minYear || year > currentYear) {
                                form.setError('studyEndYear', {
                                  type: 'manual',
                                  message: `Año debe estar entre ${minYear} y ${currentYear}`
                                });
                              } else if (parsedStartYear && year < parsedStartYear) {
                                form.setError('studyEndYear', {
                                  type: 'manual',
                                  message: 'El año de término no puede ser anterior al año de inicio'
                                });
                              }
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-xs text-muted-foreground">
                        {parsedStartYear ? `Año entre ${parsedStartYear} y ${currentYear}` : `Año hasta ${currentYear}`}
                      </FormDescription>
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificaciones (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Mediador Familiar, Especialización en Derecho Laboral"
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="barAssociationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de colegiado</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingresa tu número de colegiado" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="zoomLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enlace de Zoom (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://us05web.zoom.us/j/12345678901?pwd=ABCDE" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground mt-1">
                    Este enlace se usará para las reuniones virtuales con tus clientes
                  </p>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disponibilidad</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona tu disponibilidad" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Disponibilidad completa">Disponibilidad completa</SelectItem>
                      <SelectItem value="Algunas horas por semana">Algunas horas por semana</SelectItem>
                      <SelectItem value="Solo fines de semana">Solo fines de semana</SelectItem>
                      <SelectItem value="Horario específico">Horario específico</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Biografía profesional</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Cuéntale a tus clientes sobre tu experiencia, especializaciones y enfoque profesional..."
                      className="min-h-[200px] text-base"
                      rows={8}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
