/**
 * Canonical password strength rules (single authority).
 *
 * Mirrors the AuthModal / AcceptInvite contract: 8–18 chars with uppercase,
 * lowercase, number and symbol. Stronger than legacy min-length-6 checks;
 * never weaken below this.
 */
export type PasswordStrength = {
  length: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
};

export function checkPasswordStrength(password: string): PasswordStrength {
  const pw = password || '';
  return {
    length: pw.length >= 8 && pw.length <= 18,
    hasUppercase: /[A-Z]/.test(pw),
    hasLowercase: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/.test(pw),
  };
}

export function isPasswordStrong(password: string): boolean {
  return Object.values(checkPasswordStrength(password)).every(Boolean);
}
