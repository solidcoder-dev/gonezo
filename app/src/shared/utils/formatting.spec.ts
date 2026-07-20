import { describe, expect, it } from 'vitest';
import { currencySymbol } from './formatting';

describe('currencySymbol', () => {
  it.each([
    ['EUR', '€'],
    ['USD', '$'],
    ['BRL', 'R$'],
    ['JPY', '¥'],
    ['GBP', '£'],
  ])('formats %s with its localized symbol', (currency, symbol) => {
    expect(currencySymbol(currency, 'en-US')).toBe(symbol);
  });
});
