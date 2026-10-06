import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('Google brand verification: rutas públicas y disclosure', () => {
  it('/pro es pública con footer y links a privacidad/términos', () => {
    const src = read('src/pages/LegalUpPro.tsx');
    expect(src).toContain('/privacidad');
    expect(src).toContain('/terminos');
    expect(src).toContain('Comenzar con LegalUp Pro');
  });
  it('rutas sin guards de auth a nivel de Route', () => {
    const app = read('src/App.tsx');
    for (const path of ['"/pro"', '"/privacidad"', '"/terminos"']) {
      const idx = app.indexOf(`path=${path}`);
      expect(idx, path).toBeGreaterThan(-1);
    }
    // /pro no envuelto en RequireAuth/RequireLawyer (bloque vecino es ruta plana).
    const proBlock = app.slice(app.indexOf('path="/pro"') - 200, app.indexOf('path="/pro"') + 200);
    expect(proBlock).not.toMatch(/RequireAuth|RequireLawyer|Protected/);
  });
  it('privacidad: sección Google Calendar con scopes reales', () => {
    const src = read('src/pages/PrivacyPolicy.tsx');
    expect(src).toContain('4.5. Integración con Google Calendar');
    expect(src).toContain('horarios ocupados');
    expect(src).toContain('revoca');
  });
  it('privacidad: sección Sign-In con Google (datos, finalidad, sin calendario)', () => {
    const src = read('src/pages/PrivacyPolicy.tsx');
    expect(src).toContain('4.6. Inicio de sesión con Google');
    expect(src).toContain('nombre');
    expect(src).toContain('correo electrónico');
    expect(src).toContain('NO otorga');
    expect(src).toContain('calendario');
  });
  it('scopes reales acotados: sin Gmail/Drive/Contactos', () => {
    const edge = read('supabase/functions/google-auth/index.ts');
    expect(edge).toContain('calendar.events');
    expect(edge).toContain('calendar.freebusy');
    expect(edge).not.toMatch(/gmail|drive|contacts/i);
  });
});
