import { useRef } from "react";
import { motion } from "framer-motion";
import posthog from "posthog-js";

/**
 * Testimonios LegalUp Pro — sección editorial asimétrica (/pro).
 *
 * PLACEHOLDER DE DESARROLLO: los textos de abajo son provisorios y NO deben
 * publicarse como testimonios reales sin aprobación explícita y consentimiento
 * de las personas citadas.
 *
 * Fotografías (URLs públicas de Storage, mismo mecanismo que los perfiles
 * públicos; sin expiración):
 * - María Fernanda Gómez: avatar provisto para esta sección.
 * - Ángel Labra: avatar público de su perfil.
 */

const ANGEL_PHOTO_URL =
  "https://lgxsfmvyjctxehwslvyw.supabase.co/storage/v1/object/public/avatars/ead9bf91-bb61-46da-a7ee-729b2f1cae78-1765807647060.jpeg";

const MARIA_PHOTO_URL =
  "https://lgxsfmvyjctxehwslvyw.supabase.co/storage/v1/object/public/avatars/3623eed8-8bf5-4c9d-8672-e4a03e039f4c-1765200464840.jpg";

const MARIA_QUOTE =
  "Antes tenía información repartida entre WhatsApp, correo y calendario. Con LegalUp Pro puedo tener clientes, casos y citas en un mismo lugar y saber rápidamente qué tengo pendiente.";

const ANGEL_QUOTE =
  "Lo que más valoro es poder ver cada asunto con su cliente, sus citas y el trabajo pendiente sin tener que reconstruir todo buscando entre distintas herramientas. Tener todo conectado en un mismo lugar me ahorra tiempo todos los días.";

export function TestimonialsSection() {
  const firedRef = useRef(false);

  const handleViewportEnter = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    try {
      posthog.capture("pro_testimonials_viewed", { placement: "pro_landing" });
    } catch {
      /* analytics nunca bloquea UI */
    }
  };

  return (
    <section aria-labelledby="testimonios-pro" className="border-b border-gray-100 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          onViewportEnter={handleViewportEnter}
        >
          <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.18em] text-green-700">
            Abogados con LegalUp Pro
          </p>
          <h2 id="testimonios-pro" className="mt-3 max-w-2xl whitespace-nowrap text-xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Menos administrar, más ejercer.
          </h2>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-5">
          {/* Principal: María Fernanda Gómez */}
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col rounded-3xl bg-green-300 px-4 pb-8 pt-7 sm:px-6 sm:pb-8 sm:pt-10 lg:col-span-3"
          >
            <span aria-hidden="true" className="text-5xl font-bold leading-none text-green-800">
              &ldquo;
            </span>
            <blockquote className="mt-1 flex-1 text-xl font-medium leading-snug text-gray-900 sm:text-2xl">
              {MARIA_QUOTE}
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3 pt-6">
              <img
                src={MARIA_PHOTO_URL}
                alt="Fotografía de María Fernanda Gómez"
                loading="lazy"
                className="h-14 w-14 shrink-0 rounded-full object-cover"
              />
              <span>
                <span className="block text-sm font-bold text-gray-900">María Fernanda Gómez</span>
                <span className="block text-sm text-green-950/70">Abogada registrada en LegalUp</span>
              </span>
            </figcaption>
          </motion.figure>

          {/* Secundario: Ángel Labra */}
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full flex-col rounded-3xl border border-green-300 bg-white px-4 pb-8 pt-6 sm:px-6 sm:pb-8 sm:pt-8 lg:col-span-2"
          >
            <blockquote className="flex-1 text-base font-medium leading-snug text-gray-900 sm:text-lg">
              &ldquo;{ANGEL_QUOTE}&rdquo;
            </blockquote>
            <figcaption className="mt-auto flex items-center gap-3 pt-5">
              <img
                src={ANGEL_PHOTO_URL}
                alt="Fotografía de Ángel Labra"
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-full object-cover"
              />
              <span>
                <span className="block text-sm font-bold text-gray-900">Ángel Labra</span>
                <span className="block text-sm text-gray-500">Abogado registrado en LegalUp</span>
              </span>
            </figcaption>
          </motion.figure>
        </div>
      </div>
    </section>
  );
}
