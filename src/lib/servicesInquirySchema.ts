import { z } from 'zod';
import { SERVICE_CATEGORY_SLUGS } from '@/data/servicesCatalog';

export const servicesInquirySchema = z.object({
  contactName: z
    .string()
    .trim()
    .min(2, 'Ingresa tu nombre.')
    .max(120, 'El nombre es demasiado largo.'),
  companyName: z
    .string()
    .trim()
    .min(2, 'Ingresa el nombre de tu empresa.')
    .max(160, 'El nombre de la empresa es demasiado largo.'),
  email: z
    .string()
    .trim()
    .min(1, 'Ingresa tu email.')
    .email('Ingresa un email válido.')
    .max(254, 'El email es demasiado largo.'),
  phone: z
    .string()
    .trim()
    .max(40, 'El teléfono es demasiado largo.')
    .optional()
    .or(z.literal('')),
  serviceCategory: z.enum(SERVICE_CATEGORY_SLUGS, {
    errorMap: () => ({ message: 'Selecciona un servicio.' }),
  }),
  description: z
    .string()
    .trim()
    .min(20, 'Cuéntanos un poco más (mínimo 20 caracteres).')
    .max(5000, 'La descripción es demasiado larga.'),
  privacyAccepted: z
    .boolean()
    .refine((value) => value === true, 'Debes aceptar la política de privacidad.'),
  website: z.string().max(0).optional(),
});

export type ServicesInquiryFormValues = z.infer<typeof servicesInquirySchema>;
