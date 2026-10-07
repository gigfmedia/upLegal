import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestimonialsSection } from '@/components/pro/TestimonialsSection';

describe('Founder badges en testimonios', () => {
  it('María y Ángel muestran badge Founder', () => {
    const { container } = render(<TestimonialsSection />);
    const badges = Array.from(container.querySelectorAll('*')).filter(
      (el) => el.children.length === 0 && el.textContent === 'Founder'
    );
    expect(badges).toHaveLength(2);
    expect(screen.getByText('María Fernanda Gómez')).toBeInTheDocument();
    expect(screen.getByText('Ángel Labra')).toBeInTheDocument();
  });
  it('sin pricing ni copy no canónico', () => {
    const { container } = render(<TestimonialsSection />);
    expect(container.textContent).not.toMatch(/\$19\.990|Founder Plan|Early adopter/i);
  });
});
