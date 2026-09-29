import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';
import CountriesSection from './footer/CountriesSection';
import { StickyBottomBarProvider } from '@/contexts/StickyBottomBarContext';

function setup() {
  return render(
    <MemoryRouter>
      <StickyBottomBarProvider>
        <Footer />
      </StickyBottomBarProvider>
    </MemoryRouter>,
  );
}

describe('Footer rediseño', () => {
  it('muestra marca, columnas y legal sin sección de países (flag false)', () => {
    setup();
    expect(screen.getByText('LegalUp', { selector: 'p' })).toBeTruthy();
    expect(screen.getByText(/Asesoría legal online con abogados verificados\./)).toBeTruthy();
    expect(screen.getByText(/Gestiona consultas, casos y servicios legales/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'LegalUp Pro' }).getAttribute('href')).toBe('/pro');
    expect(screen.getByRole('link', { name: 'LegalUp AI' }).getAttribute('href')).toBe('/ai');
    expect(screen.getByRole('link', { name: 'Buscar abogados' }).getAttribute('href')).toBe('/search');
    expect(screen.getByRole('link', { name: 'Para empresas' }).getAttribute('href')).toBe('/legalup-empresas');
    expect(screen.getByRole('link', { name: 'Quiénes somos' }).getAttribute('href')).toBe('/about');
    expect(screen.getByRole('link', { name: 'Cookies' }).getAttribute('href')).toBe('/cookies');
    expect(screen.getByText('© 2026 LegalUp SpA')).toBeTruthy();
    // Línea operadora actualmente comentada en el footer visible
    expect(screen.queryByText('LegalUp es operado por LegalUp SpA.')).toBeNull();
    expect(screen.getByRole('button', { name: 'Configurar cookies' })).toBeTruthy();
    // Países ocultos con flag false
    expect(screen.queryByRole('heading', { name: 'Países' })).toBeNull();
  });
});

describe('CountriesSection', () => {
  it('renderiza grid de países cuando se monta directamente', () => {
    render(<CountriesSection />);
    expect(screen.getByRole('heading', { name: 'Países' })).toBeTruthy();
    expect(screen.getByText('Chile')).toBeTruthy();
    expect(screen.getByText('México')).toBeTruthy();
    // Solo texto, sin links
    expect(screen.queryByRole('link')).toBeNull();
  });
});
