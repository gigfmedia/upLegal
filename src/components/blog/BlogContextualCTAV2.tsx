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

const V2_SLUGS = new Set([
  'cese-de-convivencia-chile-2026',
  'me-quieren-desalojar-que-hago-chile-2026',
  'cuanto-demora-juicio-desalojo-chile-2026',
]);

const V2_COPY: Record<string, { title: string; message: string; primary: string; target: string }> = {
  'cese-de-convivencia-chile-2026': {
    title: '¿Necesitas acreditar tu cese de convivencia?',
    message: 'Si necesitas saber cómo afecta tu situación a un divorcio u otro trámite de familia, puedes revisar tu caso con un abogado de familia.',
    primary: 'Ver abogados de familia disponibles',
    target: '/abogado-familia',
  },
  'me-quieren-desalojar-que-hago-chile-2026': {
    title: '¿Ya te avisaron que debes dejar la propiedad?',
    message: 'Si recibiste una notificación, demanda o aviso y necesitas saber qué opciones tienes según tus antecedentes, puedes revisar tu caso con un abogado de arriendos.',
    primary: 'Ver abogados de arriendos disponibles',
    target: '/abogado-arriendo',
  },
  'cuanto-demora-juicio-desalojo-chile-2026': {
    title: '¿Ya estás enfrentando un juicio de desalojo?',
    message: 'Los plazos pueden variar según el procedimiento y lo que ocurra en el caso. Si necesitas revisar tu situación concreta, puedes consultar con un abogado de arriendos.',
    primary: 'Ver abogados de arriendos disponibles',
    target: '/abogado-arriendo',
  },
};

export const BlogContextualCTAV2: React.FC<Props> = ({ articleSlug, legalCategory, targetUrl }) => {
  const flag = useFeatureFlagVariantKey('blog_contextual_cta_v2');
  const isContextual = flag === 'contextual';

  const slug = articleSlug || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '' : '');
  if (!V2_SLUGS.has(slug)) {
    // Fallback to V1 behavior if slug not in V2 (should not happen, pages using V2 are only V2 slugs)
    return null;
  }

  const category = legalCategory || detectLegalCategory(slug);
  const v2 = V2_COPY[slug];
  const PREVIOUS_CONTROL: Record<string, { title: string; message: string; primary: string; target: string }> = {
    'cese-de-convivencia-chile-2026': {
      title: '¿Necesitas acreditar el cese de convivencia para divorciarte?',
      message: 'Un abogado de familia puede ayudarte a reunir pruebas, fijar la fecha correcta y proteger tus derechos patrimoniales.',
      primary: 'Habla con un abogado ahora',
      target: `/search?specialty=${encodeURIComponent('Derecho de Familia')}`,
    },
    'me-quieren-desalojar-que-hago-chile-2026': {
      title: '¿Ya te avisaron que debes dejar la propiedad?',
      message: 'Si recibiste una notificación, demanda o aviso y necesitas saber qué opciones tienes según tus antecedentes, puedes revisar tu caso con un abogado de arriendos.',
      primary: 'Ver abogados de arriendos disponibles',
      target: '/abogado-arriendo',
    },
    'cuanto-demora-juicio-desalojo-chile-2026': {
      title: '¿Ya estás enfrentando un juicio de desalojo?',
      message: 'Los plazos pueden variar según el procedimiento y lo que ocurra en el caso. Si necesitas revisar tu situación concreta, puedes consultar con un abogado de arriendos.',
      primary: 'Ver abogados de arriendos disponibles',
      target: '/abogado-arriendo',
    },
  };
  const prev = PREVIOUS_CONTROL[slug];
  const controlTitle = prev?.title || '¿Necesitas ayuda legal?';
  const controlMessage = prev?.message || 'Habla con un abogado sobre tu caso.';
  const controlButton = prev?.primary || 'Agenda tu consulta';
  const controlTarget = targetUrl || prev?.target || `/search?specialty=${encodeURIComponent(category === 'general' ? 'Derecho Civil' : category)}`;

  const displayTitle = isContextual ? v2.title : controlTitle;
  const displayMessage = isContextual ? v2.message : controlMessage;
  const displayPrimary = isContextual ? v2.primary : controlButton;
  const primaryTarget = isContextual ? v2.target : controlTarget;

  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });

  useEffect(() => {
    if (inView) {
      track.blogContextualCTAViewed({
        article_slug: slug,
        legal_category: category,
        cta_variant: isContextual ? 'contextual' : 'control',
        source: 'blog',
        experiment_name: 'blog_contextual_cta_v2',
      });
    }
  }, [inView, slug, category, isContextual]);

  const handlePrimary = () => {
    try { sessionStorage.setItem('legalup_article_slug', slug); } catch {}
    sessionStorage.setItem('has_commercial_intent', 'true');
    track.blogContextualCTAClicked({
      article_slug: slug,
      legal_category: category,
      cta_variant: isContextual ? 'contextual' : 'control',
      source: 'blog',
      experiment_name: 'blog_contextual_cta_v2',
      target_url: primaryTarget,
    });
    track.problemStarted({
      article_slug: slug,
      legal_category: category,
      source: 'blog_contextual_cta_v2',
    });
  };

  return (
    <div ref={ref} className="my-10 p-8 border border-gray-200 bg-cream-900 rounded-2xl text-center shadow-sm">
      <h3 className="text-2xl font-bold font-serif text-green-900 mb-2">{displayTitle}</h3>
      <p className="text-green-900 mb-4">{displayMessage}</p>
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
      </div>
    </div>
  );
};

export default BlogContextualCTAV2;
export { V2_SLUGS };
