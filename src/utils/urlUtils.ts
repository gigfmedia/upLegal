/**
 * Creates a URL-friendly slug from a string
 * @param str The string to convert to a slug
 * @returns A URL-friendly slug with no accents or special characters
 */
export const createSlug = (str: string): string => {
  if (!str) return '';
  
  return str
    // Normalize the string to decomposed form (separate base characters from diacritics)
    .normalize('NFD')
    // Remove all diacritical marks (accents)
    .replace(/[\u0300-\u036f]/g, '')
    // Convert to lowercase
    .toLowerCase()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Replace multiple consecutive hyphens with a single one
    .replace(/-+/g, '-');
};

/**
 * Generates a SEO-friendly URL for a lawyer profile
 * @param id The lawyer's ID
 * @param name The lawyer's full name (optional)
 * @returns A complete URL path for the lawyer's profile
 */
export const getLawyerProfileUrl = (id: string, name?: string): string => {
  const nameSlug = name ? createSlug(name) : 'abogado';
  return `/abogado/${nameSlug}-${id}`;
};
