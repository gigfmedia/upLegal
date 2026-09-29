/**
 * Configuración del footer — expansión regional.
 *
 * FOOTER_COUNTRIES_ENABLED = false → <CountriesSection /> no se renderiza
 * (render condicional, sin display:none ni opacity).
 */
export type FooterCountry = {
  code: string;
  name: string;
  flag: string;
};

export const FOOTER_COUNTRIES_ENABLED = false as const;

export const FOOTER_COUNTRIES: FooterCountry[] = [
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: 'BR', name: 'Brasil', flag: '🇧🇷' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
];
