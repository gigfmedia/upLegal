import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tokensToCredits, AI_CREDITS_PER_TOKEN } from '@/lib/aiUsage';

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260804000000_ai_usage_cost_tracking.sql'
);

describe('Fase 3.6 — créditos internos (1 crédito = 1.000 tokens)', () => {
  it('Unidad interna: 1 crédito = 1.000 tokens', () => {
    expect(AI_CREDITS_PER_TOKEN).toBe(1000);
  });

  it('Análisis de documento pequeño: 5.000 tokens → 5 créditos', () => {
    expect(tokensToCredits(5000)).toBe(5);
  });

  it('Chat sobre documento grande: 19.500 tokens → 20 créditos (ceil)', () => {
    expect(tokensToCredits(19500)).toBe(20);
  });

  it('Siempre redondea hacia arriba, sin fracciones de crédito', () => {
    expect(tokensToCredits(1)).toBe(1);
    expect(tokensToCredits(1000)).toBe(1);
    expect(tokensToCredits(1001)).toBe(2);
    expect(tokensToCredits(0)).toBe(0);
    expect(tokensToCredits(-5)).toBe(0);
  });

  it('La migración crea ai_usage y ai_usage_monthly con RLS y el RPC incremental', () => {
    const sql = readFileSync(MIGRATION_PATH, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.ai_usage');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.ai_usage_monthly');
    expect(sql).toContain('credits_used INTEGER NOT NULL DEFAULT 0');
    expect(sql).toContain('estimated_cost_usd NUMERIC');
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('increment_ai_usage_monthly');
    expect(sql).toContain('ON CONFLICT (lawyer_id, period_start) DO UPDATE');
    // La migración solo permite al dueño leer su propio consumo.
    expect(sql).toContain('auth.uid() = lawyer_id');
  });
});
