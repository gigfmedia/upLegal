export function normalizeEmail(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  return trimmed.toLowerCase();
}
