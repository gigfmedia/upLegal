// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import * as mailerModule from './mailer.mjs';
import * as indexModule from './index.mjs';
import { createProspectingModule } from './index.mjs';

const sourceDir = new URL('.', import.meta.url);
const productionFiles = readdirSync(sourceDir)
  .filter((name) => name.endsWith('.mjs') && !name.endsWith('.test.mjs'));

function source(name) {
  return readFileSync(new URL(name, sourceDir), 'utf8');
}

describe('prospecting mailer boundary', () => {
  it('no exporta la fábrica ni un sender desde el módulo autorizado', () => {
    expect(indexModule.createProspectingMailer).toBeUndefined();
    expect(indexModule.sendProspectEmail).toBeUndefined();
    expect(mailerModule.createProspectingMailer).toBeUndefined();
    expect(mailerModule.sendProspectEmail).toBeUndefined();
    expect(Object.keys(mailerModule)).toEqual(['isTransientSendError']);
  });

  it('no expone el mailer en la API pública del módulo', () => {
    const resendSend = vi.fn(async () => ({ data: { id: 'resend-test' } }));
    const module = createProspectingModule({
      supabase: {},
      resend: { emails: { send: resendSend } },
      env: {},
      logger: { info() {}, warn() {}, error() {} },
      requireAdminMiddleware: (req, res, next) => next(),
    });

    expect(module).not.toHaveProperty('mailer');
    expect(module).not.toHaveProperty('sendProspectEmail');
    expect(module.engine).not.toHaveProperty('mailer');
    expect(module.engine).not.toHaveProperty('sendProspectEmail');
    expect(module.mailer?.sendProspectEmail).toBeUndefined();
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('solo el engine invoca sendProspectEmail', () => {
    const callers = productionFiles.filter((name) => source(name).includes('.sendProspectEmail('));
    expect(callers).toEqual(['engine.mjs']);
  });

  it('la fábrica del mailer solo se usa dentro de index', () => {
    const users = productionFiles.filter((name) => source(name).includes('createProspectingMailer'));
    expect(users).toEqual(['index.mjs']);
  });
});
