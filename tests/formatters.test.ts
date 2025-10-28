// tests/formatters.test.ts

import { describe, it, expect } from 'vitest';
import {
  formatLinha,
  formatPosicao,
  formatPrevisao,
  formatAjuda,
  formatRota,
  truncate
} from '../src/services/formatters.service.js';

describe('Formatters', () => {
  describe('formatAjuda', () => {
    it('should return help text', () => {
      const result = formatAjuda();
      expect(result).toContain('Exemplos:');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'a'.repeat(1500);
      const result = truncate(long);
      expect(result.length).toBeLessThanOrEqual(1200 + 1); // +1 for '…'
      expect(result.endsWith('…')).toBe(true);
    });

    it('should not truncate short strings', () => {
      const short = 'test';
      const result = truncate(short);
      expect(result).toBe('test');
    });
  });

  describe('formatLinha', () => {
    it('should format empty array', () => {
      const result = formatLinha('701U', []);
      expect(result).toContain('Nenhuma linha encontrada');
    });

    it('should format lines', () => {
      const data = [
        { lt: '701U', tl: '10', tp: 'VILA MADALENA', ts: 'TERMINAL JABAQUARA' },
        { lt: '701U', tl: '11', tp: 'TATUAPE', ts: 'VILA FORMOSA' }
      ];
      const result = formatLinha('701U', data);
      expect(result).toContain('701U-10');
      expect(result).toContain('701U-11');
    });
  });

  describe('formatPosicao', () => {
    it('should handle no vehicles', () => {
      const result = formatPosicao('701U', {});
      expect(result).toContain('não há veículos');
    });

    it('should format vehicles', () => {
      const data = {
        vs: [
          { p: '12345' },
          { p: '67890', a: true }
        ]
      };
      const result = formatPosicao('701U', data);
      expect(result).toContain('701U');
      expect(result).toContain('Ônibus');
    });
  });

  describe('formatPrevisao', () => {
    it('should handle no arrival predictions', () => {
      const result = formatPrevisao('340015345', undefined, {});
      expect(result).toContain('Não encontrei');
    });

    it('should format predictions', () => {
      const data = {
        p: {
          cp: 340015345,
          l: [
            {
              c: '701U-10',
              lt0: 'Terminal',
              vs: [
                { t: '10', p: '12345' },
                { t: '25', p: '67890' }
              ]
            }
          ]
        }
      };
      const result = formatPrevisao('340015345', '701U-10', data);
      expect(result).toContain('Previsão');
      expect(result).toContain('701U-10');
    });
  });

  describe('formatRota', () => {
    it('should handle missing route data', () => {
      const result = formatRota('A', 'B', {});
      expect(result).toContain('Não encontrei rota');
    });

    it('should format route with transit details', () => {
      const data = {
        routes: [
          {
            legs: [
              {
                duration: { text: '35 min', value: 2100 },
                distance: { text: '12.5 km', value: 12500 },
                steps: [
                  {
                    transit_details: {
                      line: {
                        short_name: '701U',
                        name: '701U',
                        agencies: [{ name: 'SPTrans' }]
                      },
                      headsign: 'Jabaquara',
                      departure_stop: { name: 'Centro' },
                      arrival_stop: { name: 'Terminal' },
                      arrival_time: { text: '10:30' }
                    }
                  }
                ]
              }
            ]
          }
        ]
      };
      const result = formatRota('A', 'B', data);
      expect(result).toContain('Rota');
      expect(result).toContain('35 min');
    });
  });
});

