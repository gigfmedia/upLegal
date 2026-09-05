import { describe, it, expect } from 'vitest';
import {
  isEmailVerified,
  isLawyer,
  isOnboardingCompleted,
  isOnboardingSatisfied,
  isProfileSufficientlyComplete,
  ONBOARDING_COMPLETION_THRESHOLD,
  shouldRedirectToOnboarding,
  shouldRedirectToDashboard,
  getLawyerPostAuthDestination,
  canAccessOnboarding,
} from '@/lib/lawyerOnboardingGate';

const verifiedUser = { email_confirmed_at: '2024-01-01T00:00:00Z', user_metadata: { role: 'lawyer' } };
const unverifiedUser = { email_confirmed_at: null, user_metadata: { role: 'lawyer' } };
const verifiedClient = { email_confirmed_at: '2024-01-01T00:00:00Z', user_metadata: { role: 'client' } };
const noUser = null;

const completedProfile = { role: 'lawyer', profile_setup_completed: true };
const incompleteProfile = { role: 'lawyer', profile_setup_completed: false };
const nullProfile = null;

describe('lawyerOnboardingGate', () => {
  it('isEmailVerified: true solo cuando email_confirmed_at existe', () => {
    expect(isEmailVerified(verifiedUser as any)).toBe(true);
    expect(isEmailVerified(unverifiedUser as any)).toBe(false);
    expect(isEmailVerified(null as any)).toBe(false);
  });

  it('isLawyer: detecta por profile, metadata o role', () => {
    expect(isLawyer(verifiedUser as any, { role: 'lawyer' } as any)).toBe(true);
    expect(isLawyer(verifiedUser as any, null)).toBe(true);
    expect(isLawyer(verifiedClient as any, { role: 'lawyer' } as any)).toBe(true);
    expect(isLawyer(verifiedClient as any, { role: 'client' } as any)).toBe(false);
    expect(isLawyer(noUser as any, null)).toBe(false);
  });

  it('isOnboardingCompleted true solo cuando profile_setup_completed === true', () => {
    expect(isOnboardingCompleted(completedProfile as any)).toBe(true);
    expect(isOnboardingCompleted(incompleteProfile as any)).toBe(false);
    expect(isOnboardingCompleted(null as any)).toBe(false);
  });

  it('Register no dispara onboarding antes de email verification (Caso A/B)', () => {
    // No verificado -> nunca onboarding
    expect(shouldRedirectToOnboarding(unverifiedUser as any, incompleteProfile as any)).toBe(false);
    expect(shouldRedirectToOnboarding(unverifiedUser as any, null as any)).toBe(false);
  });

  it('Usuario no verificado no entra al onboarding', () => {
    expect(canAccessOnboarding(unverifiedUser as any, incompleteProfile as any)).toBe(false);
    expect(canAccessOnboarding(null as any, incompleteProfile as any)).toBe(false);
  });

  it('Usuario verificado + onboarding incompleto → onboarding', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any)).toBe(true);
    expect(shouldRedirectToOnboarding(verifiedUser as any, null as any)).toBe(true);
    expect(getLawyerPostAuthDestination(verifiedUser as any, incompleteProfile as any)).toBe('/lawyer/onboarding');
  });

  it('Usuario verificado + onboarding completo → dashboard', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, completedProfile as any)).toBe(false);
    expect(shouldRedirectToDashboard(verifiedUser as any, completedProfile as any)).toBe(true);
    expect(getLawyerPostAuthDestination(verifiedUser as any, completedProfile as any)).toBe('/lawyer/dashboard');
  });

  it('No existe duplicación: gate no crea profile', () => {
    // El gate es solo lectura, no muta
    const p = { role: 'lawyer', profile_setup_completed: false };
    shouldRedirectToOnboarding(verifiedUser as any, p as any);
    expect(p.profile_setup_completed).toBe(false);
  });

  it('No lawyer nunca va a onboarding', () => {
    expect(shouldRedirectToOnboarding(verifiedClient as any, { role: 'client', profile_setup_completed: false } as any)).toBe(false);
    expect(getLawyerPostAuthDestination(verifiedClient as any, null as any)).toBe(null);
  });

  it('Caso D: abandonar y volver — onboarding persiste si incompleto', () => {
    // Simula refresh: mismo usuario verificado + perfil incompleto
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any)).toBe(true);
    // Tras completar, ya no vuelve
    expect(shouldRedirectToOnboarding(verifiedUser as any, completedProfile as any)).toBe(false);
  });

  // === Nueva regla >=70% ===
  it('>=70% satisface onboarding sin profile_setup_completed', () => {
    expect(ONBOARDING_COMPLETION_THRESHOLD).toBe(70);
    expect(isProfileSufficientlyComplete(69)).toBe(false);
    expect(isProfileSufficientlyComplete(70)).toBe(true);
    expect(isProfileSufficientlyComplete(71)).toBe(true);
    expect(isProfileSufficientlyComplete(80)).toBe(true);
    expect(isOnboardingSatisfied(incompleteProfile as any, 69)).toBe(false);
    expect(isOnboardingSatisfied(incompleteProfile as any, 70)).toBe(true);
    expect(isOnboardingSatisfied(incompleteProfile as any, 80)).toBe(true);
  });

  it('Caso 1: verified lawyer 69% → onboarding', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any, 69)).toBe(true);
    expect(getLawyerPostAuthDestination(verifiedUser as any, incompleteProfile as any, 69)).toBe('/lawyer/onboarding');
    expect(canAccessOnboarding(verifiedUser as any, incompleteProfile as any, 69)).toBe(true);
  });

  it('Caso 2: verified lawyer 70% → dashboard (no onboarding)', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any, 70)).toBe(false);
    expect(shouldRedirectToDashboard(verifiedUser as any, incompleteProfile as any, 70)).toBe(true);
    expect(getLawyerPostAuthDestination(verifiedUser as any, incompleteProfile as any, 70)).toBe('/lawyer/dashboard');
    expect(canAccessOnboarding(verifiedUser as any, incompleteProfile as any, 70)).toBe(false);
  });

  it('Caso 3: verified lawyer 80% → dashboard', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any, 80)).toBe(false);
    expect(getLawyerPostAuthDestination(verifiedUser as any, incompleteProfile as any, 80)).toBe('/lawyer/dashboard');
  });

  it('Caso 4: verified lawyer 100% → dashboard', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any, 100)).toBe(false);
    expect(shouldRedirectToDashboard(verifiedUser as any, incompleteProfile as any, 100)).toBe(true);
  });

  it('Caso 5: verified lawyer completed true aunque 50% → dashboard', () => {
    expect(shouldRedirectToOnboarding(verifiedUser as any, completedProfile as any, 50)).toBe(false);
    expect(shouldRedirectToDashboard(verifiedUser as any, completedProfile as any, 50)).toBe(true);
    expect(getLawyerPostAuthDestination(verifiedUser as any, completedProfile as any, 50)).toBe('/lawyer/dashboard');
  });

  it('Caso 6: unverified aunque 90% → verification blocker (no onboarding)', () => {
    expect(shouldRedirectToOnboarding(unverifiedUser as any, incompleteProfile as any, 90)).toBe(false);
    expect(shouldRedirectToDashboard(unverifiedUser as any, incompleteProfile as any, 90)).toBe(false);
    expect(getLawyerPostAuthDestination(unverifiedUser as any, incompleteProfile as any, 90)).toBe(null);
    expect(canAccessOnboarding(unverifiedUser as any, incompleteProfile as any, 90)).toBe(false);
  });

  it('Caso 7: client 90% → nunca lawyer onboarding', () => {
    expect(shouldRedirectToOnboarding(verifiedClient as any, { role: 'client', profile_setup_completed: false } as any, 90)).toBe(false);
    expect(getLawyerPostAuthDestination(verifiedClient as any, null as any, 90)).toBe(null);
  });

  it('Caso 8: 70% no genera loop → dashboard permanece dashboard', () => {
    // Simula DashboardLayout evaluando mismo perfil 70% → no redirige a onboarding
    expect(shouldRedirectToDashboard(verifiedUser as any, incompleteProfile as any, 70)).toBe(true);
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any, 70)).toBe(false);
  });

  it('Abogado nuevo <70% sigue a onboarding (no se salta)', () => {
    // Nuevo registrado: verified pero sin completar, completion típica ~20-30
    expect(shouldRedirectToOnboarding(verifiedUser as any, incompleteProfile as any, 25)).toBe(true);
    expect(getLawyerPostAuthDestination(verifiedUser as any, incompleteProfile as any, 25)).toBe('/lawyer/onboarding');
  });
});
