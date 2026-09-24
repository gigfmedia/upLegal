import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('Testimonios LegalUp Pro (/pro)', () => {
  const componentPath = 'src/components/pro/TestimonialsSection.tsx';
  const landingPath = 'src/pages/LegalUpPro.tsx';

  it('existe como componente separado e importado por la landing', () => {
    const landing = read(landingPath);
    expect(landing).toContain('TestimonialsSection');
    expect(landing).toContain('@/components/pro/TestimonialsSection');
  });

  it('se ubica entre cómo empezar y pricing (pricing continúa inmediatamente después)', () => {
    const landing = read(landingPath);
    const testiIdx = landing.indexOf('<TestimonialsSection />');
    const pricingIdx = landing.indexOf('id="pricing"');
    expect(testiIdx).toBeGreaterThan(-1);
    expect(pricingIdx).toBeGreaterThan(testiIdx);
    // La primera sección después del componente debe ser pricing (nada intermedio).
    const nextSectionIdx = landing.indexOf('<section', testiIdx);
    expect(nextSectionIdx).toBeGreaterThan(-1);
    expect(landing.slice(nextSectionIdx, nextSectionIdx + 200)).toContain('id="pricing"');
  });

  it('header exacto en una línea (eyebrow + heading cortos)', () => {
    const c = read(componentPath);
    expect(c).toContain('Abogados con LegalUp Pro');
    expect(c).toContain('Menos administrar, más ejercer.');
    expect(c).toContain('whitespace-nowrap');
  });

  it('semántica accesible: section/blockquote/figure/alt', () => {
    const c = read(componentPath);
    expect(c).toContain('<section');
    expect(c).toContain('aria-labelledby="testimonios-pro"');
    expect(c).toContain('<blockquote');
    expect(c).toContain('<figcaption');
    expect(c).toContain('alt="Fotografía de María Fernanda Gómez"');
    expect(c).toContain('alt="Fotografía de Ángel Labra"');
  });

  it('fotos circulares pequeñas junto al nombre (sin áreas grandes ni stock)', () => {
    const c = read(componentPath);
    expect(c).toContain('rounded-full object-cover');
    expect(c).toContain('h-14 w-14');
    expect(c).toContain('h-12 w-12');
    expect(c).not.toMatch(/unsplash|picsum|dicebear|avataaars|placeholder\.(com|it)/i);
  });

  it('textos marcados como placeholder de desarrollo', () => {
    const c = read(componentPath);
    expect(c).toMatch(/PLACEHOLDER/);
  });

  it('sin estrellas, ratings, métricas ni carrusel', () => {
    const c = read(componentPath);
    expect(c).not.toMatch(/Star|★|rating|carousel|slider|Swiper/i);
  });

  it('evento analytics de vista con disparo único', () => {
    const c = read(componentPath);
    expect(c).toContain('pro_testimonials_viewed');
    expect(c).toContain('onViewportEnter');
  });

  it('layout asimétrico editorial con padding de header', () => {
    const c = read(componentPath);
    expect(c).toContain('lg:col-span-3');
    expect(c).toContain('lg:col-span-2');
    expect(c).toContain('bg-green-300');
    expect(c).toContain('border-green-300');
    expect(c).toContain('px-4');
    expect(c).toContain('sm:px-6');
  });
});
