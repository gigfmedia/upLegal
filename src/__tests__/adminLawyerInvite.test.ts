import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('4.42A admin UI invitar abogado (static)', () => {
  const page = () => read('src/pages/admin/lawyer-profiles.tsx');

  it('acción mínima: email + nombre opcional, sin exponer magic link', () => {
    const c = page();
    expect(c).toContain('/api/admin/invite-lawyer-magic-link');
    expect(c).toContain('inviteEmail');
    expect(c).toContain('inviteName');
    expect(c).toContain('Enviar acceso');
    expect(c).toContain('Invitar abogado');
    expect(c).not.toMatch(/action_link|magic.?link.*href|dangerouslySetInnerHTML/i);
  });

  it('botón deshabilitado mientras envía; éxito/error visibles; sin link crudo', () => {
    const c = page();
    expect(c).toContain('disabled={sendingInvite}');
    expect(c).toContain('setSendingInvite(true)');
    expect(c).toContain('inviteResult');
    // El mensaje de conflicto lo entrega el servidor (409) y el UI lo muestra.
    expect(c).toContain('body?.message');
  });

  it('no promete Pro ni trial en el UI', () => {
    const inviteBlock = page().slice(
      page().indexOf('Invitar abogado nuevo'),
      page().indexOf('Invitar abogado nuevo') + 3000
    );
    expect(inviteBlock).toMatch(/No otorga Pro ni trial/);
    expect(inviteBlock).not.toMatch(/trial gratis|suscripci[óo]n|Pro gratis/i);
  });
});
