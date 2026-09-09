// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('GA4 purchase client_id', () => {
  const content = readFileSync(resolve('server.mjs'), 'utf8');
  const gaSection = content.slice(content.indexOf('const sendGA4PurchaseEvent'), content.indexOf('const sendGA4PurchaseEvent') + 3000);

  it('uses ga_client_id when present', () => {
    expect(content).toContain('if (!ga_client_id)');
    expect(content).not.toContain('effectiveClientId = ga_client_id || transaction_id');
    expect(gaSection).toContain('client_id: ga_client_id');
  });

  it('does not use transaction_id as fake client_id', () => {
    expect(gaSection).not.toMatch(/client_id:\s*transaction_id/);
    expect(content).toContain("Skipping purchase — no ga_client_id");
  });

  it('posthog distinct_id not used for GA', () => {
    expect(gaSection).not.toContain('posthog_distinct_id');
  });
});
