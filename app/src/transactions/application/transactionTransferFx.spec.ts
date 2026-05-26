import { describe, expect, it } from 'vitest';
import {
  calculateTransferDestinationAmount,
  calculateTransferFxRate,
  normalizePositiveFxRate,
  syncTransferFxFields,
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

  it('syncs non-cross-currency transfer fields to source amount and rate one', () => {
    expect(syncTransferFxFields({
      sourceAmount: '100',
      destinationAmount: '50',
      rate: '0.5',
      mode: 'auto_rate',
      crossCurrency: false,
    })).toEqual({
      transferAmountIn: '100',
      transferFxRate: '1',
    });
  });

  it('syncs cross-currency destination or rate based on selected mode', () => {
    expect(syncTransferFxFields({
      sourceAmount: '100',
      destinationAmount: '',
      rate: '0.85',
      mode: 'auto_destination',
      crossCurrency: true,
    })).toEqual({
      transferAmountIn: '85.00',
    });
    expect(syncTransferFxFields({
      sourceAmount: '100',
      destinationAmount: '85',
      rate: '',
      mode: 'auto_rate',
      crossCurrency: true,
    })).toEqual({
      transferFxRate: '0.85',
    });
  });

  it('normalizes cross-currency rate when requested', () => {
    expect(syncTransferFxFields({
      sourceAmount: '100',
      destinationAmount: '',
      rate: '0',
      mode: 'auto_destination',
      crossCurrency: true,
      normalizeRate: true,
    })).toEqual({
      transferAmountIn: '100.00',
      transferFxRate: '1',
    });
  });
});
