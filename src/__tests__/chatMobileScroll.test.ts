import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf-8');

describe('chat mobile: sin scroll horizontal', () => {
  it('drawers full-width compensan el borde en mobile', () => {
    for (const p of [
      'src/components/legalup-ai/AICaseChatDrawer.tsx',
      'src/components/lawyer/CaseManagementDrawer.tsx',
    ]) {
      const code = read(p);
      expect(code, p).toContain('w-[100vw]');
      expect(code, p).toContain('max-sm:border-l-0');
    }
  });
  it('burbujas cortan palabras largas (URLs) sin desbordar', () => {
    const code = read('src/components/legalup-ai/AIChatMessage.tsx');
    expect(code.match(/break-words/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
