import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { DEFAULT_META_DESCRIPTION } from '@/App';

// ---------------------------------------------------------------------------
// FASE 5.15 — deduplicación global de meta description.
//
// Arquitectura: index.html NO trae <meta name="description"> hardcodeado.
// AppContent monta un Helmet default; los componentes SEO por ruta
// (BlogGrowthHacks, landings, /pro, /blog) lo overridean vía Helmet anidado.
// react-helmet-async garantiza exactamente UN tag, innermost-wins, y restaura
// el default al desmontar (sin descripciones stale al navegar).
// ---------------------------------------------------------------------------

const LEGACY_SHELL_COPY =
  'Consulta con un abogado especialista en Chile. Arriendo, laboral, familia y más. Respuesta en 24 horas, sin salir de casa. Abogados verificados en LegalUp.';

const metaDescriptions = () =>
  Array.from(document.querySelectorAll('meta[name="description"]')).map((el) =>
    el.getAttribute('content'),
  );

afterEach(cleanup);

describe('FASE 5.15 shell sin description hardcodeada', () => {
  it('index.html no contiene <meta name="description">', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf-8');
    expect(html).not.toContain('meta name="description"');
  });

  it('el default conserva verbatim el copy del shell pre-5.15 (dedup, no rewrite)', () => {
    expect(DEFAULT_META_DESCRIPTION).toBe(LEGACY_SHELL_COPY);
  });
});

describe('FASE 5.15 exactamente 1 meta description por estado de ruta', () => {
  it('ruta sin SEO propio: 1 tag con el default (home, perfiles, /search)', async () => {
    render(
      <HelmetProvider>
        <Helmet>
          <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        </Helmet>
        <div>home sin override</div>
      </HelmetProvider>,
    );
    await waitFor(() => expect(metaDescriptions()).toHaveLength(1));
    expect(metaDescriptions()[0]).toBe(DEFAULT_META_DESCRIPTION);
  });

  it('ruta con SEO propio: 1 tag con el contenido de la ruta (blog, landings, /pro)', async () => {
    const article = 'Un juicio laboral por despido injustificado dura entre 3 y 8 meses en promedio.';
    render(
      <HelmetProvider>
        <Helmet>
          <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        </Helmet>
        <Helmet>
          <meta name="description" content={article} />
        </Helmet>
      </HelmetProvider>,
    );
    await waitFor(() => expect(metaDescriptions()).toHaveLength(1));
    expect(metaDescriptions()[0]).toBe(article);
  });

  it('navegación artículo → home: vuelve al default, sin stale ni duplicados', async () => {
    const article = 'Calcula al instante el reajuste de tu arriendo por IPC.';
    const { rerender } = render(
      <HelmetProvider>
        <Helmet>
          <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        </Helmet>
        <Helmet>
          <meta name="description" content={article} />
        </Helmet>
      </HelmetProvider>,
    );
    await waitFor(() => expect(metaDescriptions()).toEqual([article]));

    rerender(
      <HelmetProvider>
        <Helmet>
          <meta name="description" content={DEFAULT_META_DESCRIPTION} />
        </Helmet>
      </HelmetProvider>,
    );
    await waitFor(() => expect(metaDescriptions()).toEqual([DEFAULT_META_DESCRIPTION]));
  });
});

describe('FASE 5.15 rutas representativas mantienen su description propia', () => {
  it('artículo 5.14 preserva title + meta (dedup only, sin rewrite)', () => {
    const c = readFileSync(
      join(process.cwd(), 'src/pages/blog/cuanto-dura-juicio-laboral-despido-injustificado-chile-2026.tsx'),
      'utf-8',
    );
    expect(c).toContain('¿Cuánto dura un juicio laboral en Chile? De 3 a 8 meses');
    expect(c).toContain('entre 3 y 8 meses en promedio');
  });

  it('IPC preserva copy del experimento (sin rewrite)', () => {
    const c = readFileSync(
      join(process.cwd(), 'src/pages/blog/reajuste-arriendo-ipc-chile-2026.tsx'),
      'utf-8',
    );
    expect(c).toContain('Calcula al instante');
  });

  it('/abogado-arriendo mantiene su description propia', () => {
    const c = readFileSync(join(process.cwd(), 'src/pages/ArriendoLanding.tsx'), 'utf-8');
    expect(c).toContain('Abogado para arriendos en Chile');
  });

  it('/pro mantiene su description propia', () => {
    const c = readFileSync(join(process.cwd(), 'src/pages/LegalUpPro.tsx'), 'utf-8');
    expect(c).toContain('Gestiona clientes, casos, solicitudes y citas');
  });
});
