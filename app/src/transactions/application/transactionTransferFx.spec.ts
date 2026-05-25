import { describe, expect, it } from 'vitest';
import {
  calculateTransferDestinationAmount,
  calculateTransferFxRate,
  normalizePositiveFxRate,
} from './transactionTransferFx';

describe('transaction transfer FX helpers', () => {
  it('calculates destination amount from source amount and rate', () => {
    expect(calculateTransferDestinationAmount('100', '0.85')).toBe('85.00');
  });

  it('returns undefined when source amount or rate cannot produce a destination amount', () => {
    expect(calculateTransferDestinationAmount('', '0.85')).toBeUndefined();
    expect(calculateTransferDestinationAmount('100', '0')).toBeUndefined();
  });

  it('calculates FX rate from source and destination amounts', () => {
    expect(calculateTransferFxRate('100', '85')).toBe('0.85');
  });

  it('returns undefined when amounts cannot produce a rate', () => {
    expect(calculateTransferFxRate('', '85')).toBeUndefined();
    expect(calculateTransferFxRate('100', '')).toBeUndefined();
  });

  it('normalizes positive rates and falls back to one', () => {
    expect(normalizePositiveFxRate('1.50000000')).toBe('1.5');
    expect(normalizePositiveFxRate('0')).toBe('1');
    expect(normalizePositiveFxRate('abc')).toBe('1');
  });
});
