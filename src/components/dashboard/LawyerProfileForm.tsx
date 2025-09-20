import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext/clean/useAuth';
import { toast } from '@/hooks/use-toast';

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
  email: z.string().email({ message: 'Ingrese un correo electrónico válido' }),
  phone: z.string().min(8, { message: 'Ingrese un número de teléfono válido' }),
  bio: z.string().min(20, { message: 'La biografía debe tener al menos 20 caracteres' }),
  specialization: z.string().min(1, { message: 'Seleccione una especialidad' }),
  experience: z.string().min(1, { message: 'Ingrese los años de experiencia' }),
  hourlyRate: z.string().min(1, { message: 'Ingrese una tarifa por hora' }),
  languages: z.string().min(1, { message: 'Ingrese los idiomas que habla' }),
  education: z.string().min(1, { message: 'Ingrese su formación académica' }),
  certifications: z.string().optional(),
  barAssociationNumber: z.string().min(1, { message: 'Ingrese su número de colegiado' }),
  availability: z.string().min(1, { message: 'Seleccione su disponibilidad' }),
  zoomLink: z.string().url({ message: 'Ingrese una URL de Zoom válida' }).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

export function LawyerProfileForm() {
  const { user, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.user_metadata?.first_name || '',
      lastName: user?.user_metadata?.last_name || '',
      email: user?.email || '',
      phone: user?.user_metadata?.phone || '',
      bio: user?.user_metadata?.bio || '',
      specialization: user?.user_metadata?.specialization || '',
      experience: user?.user_metadata?.experience?.toString() || '',
      hourlyRate: user?.user_metadata?.hourly_rate?.toString() || '',
      languages: user?.user_metadata?.languages?.join(', ') || '',
      education: user?.user_metadata?.education || '',
      certifications: user?.user_metadata?.certifications?.join(', ') || '',
      barAssociationNumber: user?.user_metadata?.bar_association_number || '',
      availability: user?.user_metadata?.availability || 'Disponibilidad completa',
      zoomLink: user?.user_metadata?.zoom_link || '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      setIsLoading(true);
      await updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        phone: data.phone,
        bio: data.bio,
        specialization: data.specialization,
        experience: parseInt(data.experience),
        hourly_rate: parseFloat(data.hourlyRate),
        languages: data.languages.split(',').map(lang => lang.trim()),
        education: data.education,
        certifications: data.certifications ? data.certifications.split(',').map(cert => cert.trim()) : [],
        bar_association_number: data.barAssociationNumber,
        availability: data.availability,
        zoom_link: data.zoomLink,
      });

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
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idiomas que hablas (separados por comas)</FormLabel>
                  <FormControl>
                    <Input placeholder="Español, Inglés, Francés" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="education"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formación académica</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ej: Abogado, Universidad de Chile, 2015"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <Input placeholder="Ingrese su número de colegiado" {...field} />
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
