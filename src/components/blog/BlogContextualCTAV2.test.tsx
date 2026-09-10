import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { V2_SLUGS } from './BlogContextualCTAV2';

describe('blog_contextual_cta_v2', () => {
  it('V2 slugs are the 3 high-demand pages', () => {
    expect(V2_SLUGS.has('cese-de-convivencia-chile-2026')).toBe(true);
    expect(V2_SLUGS.has('me-quieren-desalojar-que-hago-chile-2026')).toBe(true);
    expect(V2_SLUGS.has('cuanto-demora-juicio-desalojo-chile-2026')).toBe(true);
  });

  it('V1 slugs not in V2', async () => {
    const v1Slugs = [
      'dicom-deuda-arriendo-chile-2026',
      'tacita-reconduccion-chile-2026',
      'reajuste-arriendo-ipc-chile-2026',
    ];
    for (const slug of v1Slugs) {
      expect(V2_SLUGS.has(slug)).toBe(false);
    }
  });

  it('V2 control preserves previous destinations', async () => {
    const src = readFileSync(resolve('src/components/blog/BlogContextualCTAV2.tsx'), 'utf8');
    expect(src).toContain('PREVIOUS_CONTROL');
    expect(src).toContain('cese-de-convivencia-chile-2026');
    expect(src).toContain('/abogado-arriendo');
  });

  it('V2 click persists article_slug for booking attribution', async () => {
    const src = readFileSync(resolve('src/components/blog/BlogContextualCTAV2.tsx'), 'utf8');
    expect(src).toContain("sessionStorage.setItem('legalup_article_slug'");
    expect(src).toContain("article_slug: slug");
  });

  it('V2 does not write bookings.experiment_variant', async () => {
    const src = readFileSync(resolve('src/components/blog/BlogContextualCTAV2.tsx'), 'utf8');
    expect(src).not.toContain('bookings');
    expect(src).not.toContain('ga_client_id');
  });
});
