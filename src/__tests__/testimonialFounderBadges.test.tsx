import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestimonialsSection } from '@/components/pro/TestimonialsSection';

describe('Testimonios sin badges', () => {
  it('nombres y subtítulos sin badge adicional', () => {
    const { container } = render(<TestimonialsSection />);
    expect(screen.getByText('María Fernanda Gómez')).toBeInTheDocument();
    expect(screen.getByText('Ángel Labra')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Founder/i);
  });
});
