import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useInView } from 'react-intersection-observer';
import { useFeatureFlagVariantKey } from '@posthog/react';
import { track, detectLegalCategory } from '@/lib/track';

type Props = {
  articleSlug?: string;
  legalCategory?: string;
  targetUrl?: string;
};

const CTA_COPY: Record<string, { title: string; message: string; primary: string; secondary: string }> = {
  arriendo: {
    title: '¿Te pasó esto con tu arriendo?',
    message: 'Cuéntanos tu caso y revisa qué opciones tienes antes de tomar una decisión.',
    primary: 'Revisar mi caso',
    secondary: 'Ver abogados de arriendo',
  },
  laboral: {
    title: '¿Problemas en tu trabajo?',
    message: 'Un abogado laboral revisa tu caso y te dice si puedes demandar y cuánto podrías recuperar.',
    primary: 'Revisar mi caso',
    secondary: 'Ver abogados laborales',
  },
  familia: {
    title: '¿Conflicto familiar?',
    message: 'Un abogado de familia te orienta sobre tus derechos y los pasos a seguir.',
    primary: 'Revisar mi caso',
    secondary: 'Ver abogados de familia',
  },
  penal: {
    title: '¿Problema penal?',
    message: 'Habla con un abogado penal hoy y aclara tu situación.',
    primary: 'Revisar mi caso',
    secondary: 'Ver abogados penales',
  },
  general: {
    title: '¿Necesitas ayuda legal?',
    message: 'Cuéntanos tu caso y revisa qué opciones tienes.',
    primary: 'Revisar mi caso',
    secondary: 'Ver abogados',
  },
};

// Overrides por slug específico para mensaje ultra-contextual (Fase 6)
const SLUG_OVERRIDES: Record<string, { title: string; message: string }> = {
  'dicom-deuda-arriendo-chile-2026': {
    title: '¿Te pueden mandar a DICOM por no pagar el arriendo?',
    message: 'Cuéntanos tu caso y revisa qué opciones tienes antes de tomar una decisión.',
  },
  'tacita-reconduccion-chile-2026': {
    title: '¿Tu contrato de arriendo terminó pero sigues viviendo ahí?',
    message: 'Un abogado puede revisar si existe renovación automática y qué consecuencias tiene.',
  },
  'reajuste-arriendo-ipc-chile-2026': {
    title: '¿Te subieron el arriendo más de lo permitido?',
    message: 'Revisa si el reajuste corresponde y qué puedes hacer.',
  },
  'orden-desalojo-chile-2026': {
    title: '¿Recibiste una orden de desalojo?',
    message: 'Revisa con un abogado si la orden puede ejecutarse y cuáles son tus opciones.',
  },
  'no-devuelven-garantia-arriendo-chile-2026': {
    title: '¿No te devuelven la garantía?',
    message: 'Un abogado revisa si la retención es legal y cómo exigir la devolución.',
  },
  'cuanto-dura-juicio-laboral-despido-injustificado-chile-2026': {
    title: '¿Te despidieron y no sabes cuánto demora el juicio?',
    message: 'Calcula tu plazo y revisa si te conviene demandar.',
  },
};

export const BlogContextualCTA: React.FC<Props> = ({ articleSlug, legalCategory, targetUrl }) => {
  const flag = useFeatureFlagVariantKey('blog_contextual_cta');
  const isContextual = flag === 'contextual';

  const slug = articleSlug || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '');
  const category = legalCategory || detectLegalCategory(slug);
  const override = SLUG_OVERRIDES[slug];
  const base = CTA_COPY[category] || CTA_COPY.general;

  const title = override?.title || base.title;
  const message = override?.message || base.message;
  const primaryText = base.primary;
  const secondaryText = base.secondary;

  const resolvedCategory = category;
  const resolvedSlug = slug;

  // Control: texto genérico (mantiene conversión anterior)
  const controlTitle = '¿Necesitas ayuda legal?';
  const controlMessage = 'Habla con un abogado sobre tu caso.';
  const controlButton = 'Agenda tu consulta';
  const controlTarget = targetUrl || `/search?specialty=${encodeURIComponent(resolvedCategory === 'general' ? 'Derecho Civil' : resolvedCategory)}`;

  const displayTitle = isContextual ? title : controlTitle;
  const displayMessage = isContextual ? message : controlMessage;
  const displayPrimary = isContextual ? primaryText : controlButton;
  const displaySecondary = secondaryText;

  const contextualTarget = `/search?specialty=${encodeURIComponent(resolvedCategory)}&utm_source=blog&utm_medium=cta&utm_campaign=${resolvedSlug}`;
  const primaryTarget = isContextual ? contextualTarget : controlTarget;
  const secondaryTarget = `/search?specialty=${encodeURIComponent(resolvedCategory)}`;

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });

  useEffect(() => {
    if (inView) {
      track.blogContextualCTAViewed({
        article_slug: resolvedSlug,
        legal_category: resolvedCategory,
        cta_variant: isContextual ? 'contextual' : 'control',
        source: 'blog',
      });
      // Mantener compatibilidad con evento anterior para dashboards existentes
      track.commercialCTAViewed({
        article_slug: resolvedSlug,
        legal_category: resolvedCategory,
        cta_variant: isContextual ? 'contextual' : 'control',
      });
    }
  }, [inView, resolvedSlug, resolvedCategory, isContextual]);

  const handlePrimary = () => {
    sessionStorage.setItem('has_commercial_intent', 'true');
    track.blogContextualCTAClicked({
      article_slug: resolvedSlug,
      legal_category: resolvedCategory,
      cta_variant: isContextual ? 'contextual' : 'control',
      source: 'blog',
    });
    track.commercialCTAClicked({
      article_slug: resolvedSlug,
      legal_category: resolvedCategory,
      cta_variant: isContextual ? 'contextual' : 'control',
    });
    track.problemStarted({
      article_slug: resolvedSlug,
      legal_category: resolvedCategory,
      source: 'blog_contextual_cta',
    });
  };

  const handleSecondary = () => {
    sessionStorage.setItem('has_commercial_intent', 'true');
    track.blogContextualCTAClicked({
      article_slug: resolvedSlug,
      legal_category: resolvedCategory,
      cta_variant: isContextual ? 'contextual_secondary' : 'control_secondary',
      source: 'blog',
    });
  };

  return (
    <div ref={ref} className="my-10 p-8 border border-gray-200 bg-cream-900 rounded-2xl text-center shadow-sm">
      <h3 className="text-2xl font-bold font-serif text-green-900 mb-2">{displayTitle}</h3>
      <p className="text-green-900 mb-4">{displayMessage}</p>

      {/* Trust signals — no inventar ratings, usa copy genérico real */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5 justify-center">
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> Respuesta hoy</span>
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> Consulta online</span>
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> 60 min</span>
        <span className="flex items-center gap-1.5 text-sm text-green-900"><span className="text-green-600 font-bold">✓</span> Precio fijo $35.000</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Link to={primaryTarget} onClick={handlePrimary} className="w-full sm:w-auto">
          <Button className="bg-green-900 hover:bg-green-700 text-white px-8 h-12 rounded-lg shadow-md active:scale-95 w-full sm:w-auto font-bold text-base">
            {displayPrimary} →
          </Button>
        </Link>
        {isContextual && (
          <Link to={secondaryTarget} onClick={handleSecondary} className="w-full sm:w-auto">
            <Button variant="outline" className="border-green-900 text-green-900 hover:bg-green-50 px-6 h-12 rounded-lg w-full sm:w-auto font-medium">
              {displaySecondary}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default BlogContextualCTA;
