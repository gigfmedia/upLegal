import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  normalizeAIEmail,
  AI_TRIAL_MAX_CASES,
  AI_TRIAL_MAX_DOCUMENTS,
} from '../../server/ai/trialIdentity.mjs';

const MIGRATION_PATH = resolve(
  process.cwd(),
  'supabase/migrations/20260804010000_ai_trial_hardening.sql'
);

describe('Fase 3.7 — Capa 1: endurecimiento del trial (1 persona = 1 trial)', () => {
  describe('normalizeAIEmail', () => {
    it('normaliza a minúsculas y recorta espacios (trim + lowercase)', () => {
      expect(normalizeAIEmail('  Abogado.@LEGALUP.CL  ')).toBe('abogado.@legalup.cl');
    });

    it('colapsa espacios internos', () => {
      expect(normalizeAIEmail('a b @c.d')).toBe('ab@c.d');
    });

    it('devuelve null para valores vacíos o no string', () => {
      expect(normalizeAIEmail('   ')).toBeNull();
      expect(normalizeAIEmail('')).toBeNull();
      expect(normalizeAIEmail(null)).toBeNull();
      expect(normalizeAIEmail(undefined)).toBeNull();
      expect(normalizeAIEmail(123)).toBeNull();
    });
  });

  describe('límites de trial', () => {
    it('mantiene 3 casos durante el trial', () => {
      expect(AI_TRIAL_MAX_CASES).toBe(3);
    });

    it('mantiene 10 documentos durante el trial', () => {
      expect(AI_TRIAL_MAX_DOCUMENTS).toBe(10);
    });

    it('los límites coinciden con la migración de BD (autoridad: BD + backend)', () => {
      const sql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(sql).toContain('v_max := 3');
      expect(sql).toContain('v_max := 10');
    });
  });

  describe('migración 20260804010000_ai_trial_hardening', () => {
    it('versiona la estructura de ai_subscriptions (reproducible desde el repo)', () => {
      const sql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.ai_subscriptions');
      expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS ai_subscriptions_one_trial_per_lawyer');
    });

    it('agrega trial_email normalizado con UNIQUE parcial', () => {
      const sql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(sql).toContain('ADD COLUMN IF NOT EXISTS trial_email text');
      expect(sql).toContain('ai_subscriptions_one_trial_per_email');
      expect(sql).toContain('WHERE trial_email IS NOT NULL');
    });

    it('aplica los límites de trial en BD (trigger SECURITY DEFINER)', () => {
      const sql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(sql).toContain('CREATE OR REPLACE FUNCTION public.ai_enforce_trial_limits');
      expect(sql).toContain('trg_ai_enforce_trial_limits_workspaces');
      expect(sql).toContain('trg_ai_enforce_trial_limits_documents');
    });

    it('la función de trial refleja la regla backend (Pro pagado no se limita)', () => {
      const sql = readFileSync(MIGRATION_PATH, 'utf8');
      expect(sql).toMatch(/status = 'trialing'/);
      expect(sql).toMatch(/current_period_end IS NULL OR s\.current_period_end <= now\(\)/);
    });
  });
});