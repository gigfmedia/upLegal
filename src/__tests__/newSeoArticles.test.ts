import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// FASE 5.17 — 4 artículos nuevos (2 inmobiliario + 2 civil).
// Verifica arquitectura completa por artículo: archivo, ruta, registro,
// sitemap, asset de imagen, metadata única y componentes comerciales.
// ---------------------------------------------------------------------------

const src = (p: string) => readFileSync(join(process.cwd(), p), 'utf-8');

const NEW_ARTICLES = [
  {
    slug: 'no-puedo-pagar-gastos-comunes-que-hago-chile-2026',
    h1: '¿No puedes pagar los gastos comunes?',
    title: 'Gastos comunes impagos en Chile 2026',
    image: 'gastos-comunes-edificio-chile-2026.png',
  },
  {
    slug: 'terminar-contrato-arriendo-antes-de-tiempo-chile-2026',
    h1: '¿Te quieres ir antes de que termine el contrato de arriendo?',
    title: 'Terminar el arriendo antes de tiempo en Chile 2026',
    image: 'terminar-arriendo-antes-chile-2026.png',
  },
  {
    slug: 'negligencia-medica-chile-2026',
    h1: 'Negligencia médica en Chile 2026',
    title: 'Negligencia médica en Chile 2026',
    image: 'negligencia-medica-chile-2026.png',
  },
  {
    slug: 'incumplimiento-contrato-servicios-chile-2026',
    h1: '¿Contrataste un servicio y no cumplieron?',
    title: 'Incumplimiento de contrato de servicios en Chile 2026',
    image: 'incumplimiento-contrato-servicios-chile-2026.png',
  },
];

describe('FASE 5.17 arquitectura por artículo', () => {
  for (const a of NEW_ARTICLES) {
    it(`${a.slug}: archivo + ruta + registro + sitemap + imagen`, () => {
      expect(existsSync(join(process.cwd(), `src/pages/blog/${a.slug}.tsx`))).toBe(true);
      const routes = src('src/components/BlogRoutes.tsx');
      expect(routes).toContain(`path="${a.slug}"`);
      const registry = src('src/data/blogArticles.ts');
      expect(registry).toContain(`id: "${a.slug}"`);
      // ReadTime + BlogNavigation resuelven por id del registro
      expect(registry).toContain(a.slug);
      const sitemap = src('public/sitemap.xml');
      expect(sitemap).toContain(`https://legalup.cl/blog/${a.slug}`);
      expect(existsSync(join(process.cwd(), `public/assets/${a.image}`))).toBe(true);
    });

    it(`${a.slug}: metadata única + canonical propio + H1 único`, () => {
      const c = src(`src/pages/blog/${a.slug}.tsx`);
      expect(c).toContain(a.title);
      expect(c).toContain(a.h1);
      expect(c).toContain(`https://legalup.cl/blog/${a.slug}`);
      // canonical y url autorreferenciados (no a otro artículo)
      const canonicals = c.match(/https:\/\/legalup\.cl\/blog\/[a-z0-9-]+/g) || [];
      const selfRefs = canonicals.filter((u) => u === `https://legalup.cl/blog/${a.slug}`);
      expect(selfRefs.length).toBeGreaterThanOrEqual(2); // BlogGrowthHacks url + BlogShare url
    });

    it(`${a.slug}: componentes comerciales y tracking presentes`, () => {
      const c = src(`src/pages/blog/${a.slug}.tsx`);
      expect(c).toContain('BlogGrowthHacks');
      expect(c).toContain('RelatedLawyers');
      expect(c).toContain('BlogNavigation');
      expect(c).toContain('BlogShare');
      expect(c).toContain('BlogConversionPopup');
      expect(c).toContain('faqs');
      expect(c).toContain('data-faq-section');
    });
  }

  it('los 4 slugs son únicos y no colisionan con artículos existentes', () => {
    const slugs = NEW_ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(4);
    const registry = src('src/data/blogArticles.ts');
    for (const s of slugs) {
      const occurrences = registry.split(`id: "${s}"`).length - 1;
      expect(occurrences).toBe(1);
    }
  });

  it('sin copy de precios/duración inventado en CTAs civiles', () => {
    for (const slug of ['negligencia-medica-chile-2026', 'incumplimiento-contrato-servicios-chile-2026']) {
      const c = src(`src/pages/blog/${slug}.tsx`);
      expect(c).not.toContain('$35.000');
      expect(c).not.toContain('60 min');
    }
  });
});
