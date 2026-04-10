import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Basic Sanity Check', () => {
  it('should pass a simple math test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should be able to use DOM globals', () => {
    const div = document.createElement('div');
    div.innerHTML = 'Hello Vitest';
    expect(div.innerHTML).toBe('Hello Vitest');
  });
});
