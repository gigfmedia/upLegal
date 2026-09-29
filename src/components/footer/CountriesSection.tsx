import { FOOTER_COUNTRIES } from './footerConfig';

/**
 * Sección de países (expansión regional futura). Solo texto, sin links.
 * Se renderiza únicamente cuando FOOTER_COUNTRIES_ENABLED === true.
 */
export default function CountriesSection() {
  return (
    <section aria-label="Países" className="border-t border-white/10 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
        <h2 className="text-2xl font-bold tracking-tight text-white">Países</h2>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {FOOTER_COUNTRIES.map((country) => (
            <li
              key={country.code}
              className="flex items-center gap-2 text-sm text-white/70"
            >
              <span aria-hidden="true">{country.flag}</span>
              <span>{country.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
