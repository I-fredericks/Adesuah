import { describe, it, expect } from 'vitest';
import { formatMoney, termLabel, ordinalSuffixClient } from '../utils/format';

describe('formatMoney', () => {
  it('formats Ghana cedi amounts', () => {
    expect(formatMoney(500)).toBe('GHS 500.00');
    expect(formatMoney(1234.5)).toBe('GHS 1,234.50');
  });

  it('handles null and undefined', () => {
    expect(formatMoney(null)).toBe('GHS 0.00');
  });
});

describe('termLabel', () => {
  it('converts enum names', () => {
    expect(termLabel('TERM_1')).toBe('Term 1');
    expect(termLabel(null)).toBe('');
  });
});

describe('ordinalSuffixClient', () => {
  it('adds correct suffix', () => {
    expect(ordinalSuffixClient(1)).toBe('1st');
    expect(ordinalSuffixClient(22)).toBe('22nd');
    expect(ordinalSuffixClient(13)).toBe('13th');
  });
});
