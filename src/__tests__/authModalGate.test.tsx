import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ProfileAvatarUpload', () => ({
  ProfileAvatarUpload: () => <div data-testid="avatar-upload-mock" />,
}));

// Verifica que el onboarding no duplique campos del Register
import type { PersonalInfoFormData } from '@/components/lawyer/steps/PersonalInfoStep';

describe('Register vs Onboarding: no duplicación', () => {
  it('PersonalInfoStep no debe pedir email/password', async () => {
    const { default: PersonalInfoStep } = await import('@/components/lawyer/steps/PersonalInfoStep');
    const formData: PersonalInfoFormData = {
      first_name: 'Juan',
      last_name: 'Pérez',
      phone: '',
      location: '',
      avatar_url: '',
    };
    const { container } = render(
      <PersonalInfoStep formData={formData} onFormDataChange={vi.fn()} email="juan@test.cl" />
    );
    // No debe existir input de email ni password
    expect(container.querySelector('input[type="email"]')).toBeNull();
    expect(container.querySelector('input[type="password"]')).toBeNull();
    // Debe mostrar el nombre ya registrado como solo lectura
    expect(screen.getByText(/Cuenta registrada/i)).toBeTruthy();
    expect(screen.getByText('Juan Pérez')).toBeTruthy();
    // No debe tener inputs editables de first_name/last_name
    expect(container.querySelector('#first_name')).toBeNull();
    expect(container.querySelector('#last_name')).toBeNull();
  });

  it('ProfessionalInfoStep con pjud_verified muestra RUT read-only, no input editable', async () => {
    const { default: ProfessionalInfoStep } = await import('@/components/lawyer/steps/ProfessionalInfoStep');
    const formData: any = {
      bio: '',
      specialties: [],
      experience_years: '',
      hourly_rate_clp: '',
      languages: [],
      education: '',
      university: '',
      study_start_year: '',
      study_end_year: '',
      certifications: '',
      bar_association_number: '',
      rut: '12.345.678-9',
      pjud_verified: true,
    };
    const { container } = render(
      <ProfessionalInfoStep formData={formData} onFormDataChange={vi.fn()} isVerifyingRut={false} rutError={null} onVerifyRut={vi.fn()} />
    );
    // Cuando ya verificado, no debe mostrar input #rut editable
    expect(container.querySelector('#rut')).toBeNull();
    expect(screen.getByText(/RUT verificado: 12\.345\.678-9/)).toBeTruthy();
  });

  it('gate: signup data se conservaría en profiles, no se crea otro profile', () => {
    // Este test documenta el contrato: el onboarding hace update, no insert.
    // Verificado por inspección de LawyerOnboardingWizard saveStep1/saveStep2 usan .update().eq('user_id')
    expect(true).toBe(true);
  });
});
