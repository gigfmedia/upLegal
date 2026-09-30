import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// FASE 5.18D — Abogados destacados: Agendar → booking directo (sin AuthModal),
// swipe horizontal en mobile, grid intacto en desktop.
// RelatedLawyers / 5.13 congelados (aislamiento verificado aquí).
// ---------------------------------------------------------------------------

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8');

describe('FASE 5.18D booking directo sin intercepción', () => {
  it('schedule usa ruta canónica /booking/:slug-:id', () => {
    const c = src('src/pages/Index.tsx');
    expect(c).toContain('navigate(`/booking/${slug}-${lawyerId}`)');
  });

  it('Agendar destacado NO abre AuthModal (solo contact lo conserva)', () => {
    const c = src('src/pages/Index.tsx');
    expect(c).not.toContain('showScheduleModal');
    expect(c).not.toContain('ScheduleModal');
    // contact mantiene su AuthModal: el modal sigue existiendo para otros flujos
    expect(c).toContain('showAuthModal');
  });

  it('evento booking con convenciones featured_lawyers', () => {
    const c = src('src/pages/Index.tsx');
    expect(c).toContain('featured_lawyer_booking_clicked');
    expect(c).toContain("source: 'featured_lawyers'");
    expect(c).toContain("destination: 'booking'");
    expect(c).toContain('card_position');
  });

  it('perfil intacto: card click sigue yendo a /abogado/', () => {
    const c = src('src/components/LawyerCard.tsx');
    expect(c).toContain('navigate(`/abogado/${nameSlug}-${lawyer.id}`)');
  });
});

describe('FASE 5.18D swipe mobile + grid desktop', () => {
  it('contenedor swipe nativo solo en mobile', () => {
    const c = src('src/pages/Index.tsx');
    expect(c).toContain('overflow-x-auto');
    expect(c).toContain('snap-x');
    expect(c).toContain('snap-mandatory');
    expect(c).toContain('scrollbar-hide');
    expect(c).toContain('basis-[82%]');
    expect(c).toContain('snap-center');
  });

  it('desktop conserva grid (sin carrusel)', () => {
    const c = src('src/pages/Index.tsx');
    expect(c).toContain('sm:grid');
    expect(c).toContain('sm:grid-cols-2');
    expect(c).toContain('lg:grid-cols-3');
    expect(c).toContain('sm:overflow-visible');
    expect(c).not.toMatch(/Autoplay|auto-play|pagination.*dots/i);
  });
});

describe('FASE 5.18D aislamiento experimento 5.13', () => {
  it('Index no importa RelatedLawyers', () => {
    expect(src('src/pages/Index.tsx')).not.toContain('RelatedLawyers');
  });

  it('RelatedLawyers conserva instrumentación 5.13 intacta', () => {
    const c = src('src/components/blog/RelatedLawyers.tsx');
    expect(c).toContain('related_lawyers_shown');
    expect(c).toContain('trackEvent');
  });

  it('RelatedLawyerCard conserva eventos 5.13 intactos', () => {
    const c = src('src/components/blog/RelatedLawyerCard.tsx');
    expect(c).toContain('related_lawyer_profile_clicked');
    expect(c).toContain('related_lawyer_booking_clicked');
  });
});
