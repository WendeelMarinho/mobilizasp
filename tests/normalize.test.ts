// tests/normalize.test.ts

import { describe, it, expect } from 'vitest';
import { normalizeText } from '../src/utils/text.js';

describe('normalizeText', () => {
  it('should remove accents', () => {
    const input = 'São Paulo';
    const result = normalizeText(input);
    expect(result).toBe('Sao Paulo');
  });

  it('should handle empty string', () => {
    const result = normalizeText('');
    expect(result).toBe('');
  });

  it('should handle special characters', () => {
    const input = 'Acúmulo de caracteres é questão!';
    const result = normalizeText(input);
    expect(result).not.toContain('ú');
    expect(result).not.toContain('é');
  });

  it('should preserve spaces', () => {
    const input = 'Av Paulista 1000';
    const result = normalizeText(input);
    expect(result).toContain(' ');
  });
});

