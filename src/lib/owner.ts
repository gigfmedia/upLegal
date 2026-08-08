const OWNER_EMAILS = [
  'gigfmedia@icloud.com',
  'juan.fercommerce@gmail.com',
];

const normalizeEmail = (email?: string | null): string =>
  (email || '').trim().toLowerCase();

export const isOwnerEmail = (email?: string | null): boolean =>
  OWNER_EMAILS.includes(normalizeEmail(email));

export const isTestHostname = (): boolean => {
  const host = window.location.hostname;
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.netlify.app') ||
    host.includes('-preview') ||
    import.meta.env.DEV === true
  );
};

export const getOwnerContext = (email?: string | null): { is_owner: boolean } => ({
  is_owner: isTestHostname() || isOwnerEmail(email),
});