import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  SERVICES_CATALOG,
  getServiceCategoryName,
  type ServiceCategorySlug,
} from '@/data/servicesCatalog';
import {
  servicesInquirySchema,
  type ServicesInquiryFormValues,
} from '@/lib/servicesInquirySchema';
import {
  ServicesInquiryError,
  submitServicesInquiry,
  type ServicesInquiryResponse,
} from '@/services/servicesInquiryService';

interface ServicesRequestFormProps {
  preset?: { category: ServiceCategorySlug; nonce: number } | null;
}

function createIdempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return undefined;
}

const inputClassName =
  'h-11 rounded-xl border-gray-200 bg-white text-[15px] text-gray-900 placeholder:text-gray-400 focus-visible:border-green-700 focus-visible:ring-green-700/20';

export function ServicesRequestForm({ preset }: ServicesRequestFormProps) {
  const [submitted, setSubmitted] = useState<ServicesInquiryResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string | undefined>(createIdempotencyKey());
  const cardRef = useRef<HTMLDivElement>(null);

  const form = useForm<ServicesInquiryFormValues>({
    resolver: zodResolver(servicesInquirySchema),
    defaultValues: {
      contactName: '',
      companyName: '',
      email: '',
      phone: '',
      serviceCategory: undefined,
      description: '',
      privacyAccepted: false,
      website: '',
    },
    mode: 'onTouched',
  });

  const description = form.watch('description');

  useEffect(() => {
    if (!preset) return;
    form.setValue('serviceCategory', preset.category, {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [preset, form]);

  useEffect(() => {
    if (!submitted) return;
    cardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [submitted]);

  const onSubmit = async (values: ServicesInquiryFormValues) => {
    setServerError(null);

    try {
      const result = await submitServicesInquiry({
        contactName: values.contactName,
        companyName: values.companyName,
        email: values.email,
        phone: values.phone || undefined,
        serviceCategory: values.serviceCategory,
        description: values.description,
        privacyAccepted: true,
        idempotencyKey: idempotencyKeyRef.current,
        website: values.website || undefined,
      });

      setSubmitted(result);
    } catch (error) {
      if (error instanceof ServicesInquiryError) {
        if (error.fields) {
          for (const [field, message] of Object.entries(error.fields)) {
            if (field in form.getValues()) {
              form.setError(field as keyof ServicesInquiryFormValues, { message });
            }
          }
        }
        setServerError(error.message);
      } else {
        setServerError('No pudimos registrar tu solicitud. Intenta nuevamente.');
      }
    }
  };

  if (submitted) {
    return (
      <div
        ref={cardRef}
        className="scroll-mt-24 rounded-[28px] border border-green-200 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(20,83,45,0.35)] sm:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100">
          <CheckCircle2 className="h-6 w-6 text-green-800" />
        </div>
        <h3 className="mt-5 text-2xl font-semibold tracking-[-0.02em] text-gray-900">
          Solicitud recibida
        </h3>
        <p className="mt-2 text-[15px] leading-7 text-gray-600">
          Guardamos tu solicitud y la revisaremos para evaluar el alcance. Te contactaremos al email
          indicado.
        </p>
        <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm">
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-gray-500">Referencia</span>
            <span className="font-mono font-semibold text-gray-900">{submitted.reference}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-gray-500">Empresa</span>
            <span className="text-right font-medium text-gray-900">{form.getValues('companyName') || '—'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-1">
            <span className="text-gray-500">Servicio</span>
            <span className="text-right font-medium text-gray-900">
              {getServiceCategoryName(form.getValues('serviceCategory'))}
            </span>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-gray-500">
          No se ejecuta ningún trabajo ni cobro automático con este envío. Primero confirmamos alcance,
          plazo y precio.
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => {
            form.reset({
              contactName: '',
              companyName: '',
              email: '',
              phone: '',
              serviceCategory: undefined,
              description: '',
              privacyAccepted: false,
              website: '',
            });
            idempotencyKeyRef.current = createIdempotencyKey();
            setSubmitted(null);
            setServerError(null);
          }}
        >
          Enviar otra solicitud
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="scroll-mt-24 rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_80px_-48px_rgba(16,24,32,0.35)] sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
            Solicitud de servicio
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-gray-900">
            Cuéntanos qué necesita tu empresa
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800">
          <ShieldCheck className="h-3.5 w-3.5" />
          Datos privados
        </span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de contacto</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="name"
                      placeholder="Ej. Camila Rojas"
                      className={inputClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="organization"
                      placeholder="Ej. Comercial Andes SpA"
                      className={inputClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="nombre@empresa.cl"
                      className={inputClassName}
                    />
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
                  <FormLabel>
                    Teléfono <span className="font-normal text-gray-400">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="+56 9 1234 5678"
                      className={inputClassName}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="serviceCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servicio</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="flex h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900 outline-none transition-colors focus:border-green-700 focus:ring-2 focus:ring-green-700/20"
                  >
                    <option value="" disabled>
                      Selecciona una categoría
                    </option>
                    {SERVICES_CATALOG.map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Qué necesitas resolver?</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={5}
                    maxLength={5000}
                    placeholder="Ej. Necesitamos revisar un contrato de servicios con un cliente antes de firmarlo."
                    className="min-h-[128px] rounded-xl border-gray-200 bg-white text-[15px] leading-6 text-gray-900 placeholder:text-gray-400 focus-visible:border-green-700 focus-visible:ring-green-700/20"
                  />
                </FormControl>
                <div className="flex items-start justify-between gap-4">
                  <FormDescription>
                    No incluyas documentos ni datos sensibles en este campo.
                  </FormDescription>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {String(description || '').length}/5000
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="privacyAccepted"
            render={({ field }) => (
              <FormItem className="flex items-start gap-3 space-y-0 rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="mt-0.5 border-gray-300 data-[state=checked]:border-green-800 data-[state=checked]:bg-green-800"
                  />
                </FormControl>
                <div className="space-y-1.5">
                  <FormLabel className="text-sm font-normal leading-6 text-gray-600">
                    Acepto la{' '}
                    <a
                      href="/privacidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-green-800 underline underline-offset-2"
                    >
                      política de privacidad
                    </a>{' '}
                    y el tratamiento de mis datos para responder esta solicitud.
                  </FormLabel>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute -left-[9999px] h-0 w-0 opacity-0"
            {...form.register('website')}
          />

          {serverError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="h-12 w-full rounded-full bg-gray-900 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-green-900 disabled:opacity-70"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando solicitud
              </>
            ) : (
              <>
                Enviar solicitud
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-xs leading-5 text-gray-400">
            No se cobra por enviar la solicitud. La evaluación inicial define si el servicio es
            viable y qué información falta.
          </p>
        </form>
      </Form>
    </div>
  );
}
