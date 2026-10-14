import { describe, it, expect } from 'vitest';
import {
  needsRoleSelection,
  getDefinedAccountRole,
  getRoleOnboardingDestination,
  buildRoleOnboardingPath,
  isSelectableRole,
  ROLE_ONBOARDING_PATH,
} from './roleOnboarding';

describe('roleOnboarding — needsRoleSelection', () => {
  it('nuevo Google sin perfil ni metadata: muestra onboarding', () => {
    expect(needsRoleSelection(null, { user_metadata: {} })).toBe(true);
  });

  it('usuario existente con rol client/lawyer/company: no lo muestra', () => {
    expect(needsRoleSelection({ role: 'client' })).toBe(false);
    expect(needsRoleSelection({ role: 'lawyer' })).toBe(false);
    expect(needsRoleSelection({ role: 'company' })).toBe(false);
  });

  it('rol legacy "user", vacío o null: lo muestra', () => {
    expect(needsRoleSelection({ role: 'user' })).toBe(true);
    expect(needsRoleSelection({ role: '' })).toBe(true);
    expect(needsRoleSelection({ role: null })).toBe(true);
    expect(needsRoleSelection({})).toBe(true);
  });

  it('metadata lawyer (Google superficie abogado): no lo muestra', () => {
    expect(needsRoleSelection(null, { user_metadata: { role: 'lawyer' } })).toBe(false);
    expect(needsRoleSelection({ role: null }, { user_metadata: { role: 'lawyer' } })).toBe(false);
  });

  it('admin/superadmin (app_metadata o profile): intocables, no lo muestra', () => {
    expect(needsRoleSelection({ role: 'admin' })).toBe(false);
    expect(needsRoleSelection({ role: 'superadmin' })).toBe(false);
    expect(
      needsRoleSelection(null, { app_metadata: { role: 'admin' }, user_metadata: {} }),
    ).toBe(false);
    expect(
      needsRoleSelection({ role: null }, { app_metadata: { role: 'superadmin' } }),
    ).toBe(false);
  });

  it('normaliza mayúsculas y espacios', () => {
    expect(needsRoleSelection({ role: ' Lawyer ' })).toBe(false);
    expect(getDefinedAccountRole({ role: 'CLIENT' })).toBe('client');
  });
});

describe('roleOnboarding — destinos', () => {
  it('abogado sin retorno → onboarding profesional existente', () => {
    expect(getRoleOnboardingDestination('lawyer', null)).toBe('/lawyer/onboarding');
  });

  it('cliente sin retorno → buscador existente', () => {
    expect(getRoleOnboardingDestination('client', null)).toBe('/search');
    expect(getRoleOnboardingDestination('client', undefined)).toBe('/search');
  });

  it('respeta redirectTo cuando existe', () => {
    expect(getRoleOnboardingDestination('client', '/booking/x-1')).toBe('/booking/x-1');
    expect(getRoleOnboardingDestination('lawyer', '/lawyer/cases')).toBe('/lawyer/cases');
  });

  it('construye path con retorno', () => {
    expect(buildRoleOnboardingPath(null)).toBe(ROLE_ONBOARDING_PATH);
    expect(buildRoleOnboardingPath('/search')).toBe(
      `${ROLE_ONBOARDING_PATH}?redirectTo=${encodeURIComponent('/search')}`,
    );
  });

  it('whitelist de roles seleccionables', () => {
    expect(isSelectableRole('client')).toBe(true);
    expect(isSelectableRole('lawyer')).toBe(true);
    expect(isSelectableRole('admin')).toBe(false);
    expect(isSelectableRole('user')).toBe(false);
    expect(isSelectableRole(null)).toBe(false);
  });
});
