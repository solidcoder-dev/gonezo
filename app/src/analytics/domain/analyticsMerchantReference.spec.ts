import { describe, expect, it } from 'vitest';
import { analyticsMerchantReference } from './analyticsMerchantReference';

describe('analytics merchant reference', () => {
  it.each([
    [' MERCADONA ', { key: 'mercadona', displayName: 'MERCADONA' }],
    ['Mercadona', { key: 'mercadona', displayName: 'Mercadona' }],
    ['MERCADONA', { key: 'mercadona', displayName: 'MERCADONA' }],
    ['El Niño', { key: 'el nino', displayName: 'El Niño' }],
    ['  Lidl   #123  ', { key: 'lidl #123', displayName: 'Lidl #123' }],
  ])('normalizes %s conservatively', (input, expected) => {
    expect(analyticsMerchantReference(input)).toEqual(expected);
  });

  it.each(['', '   ', undefined, null])('omits blank merchant %s', (input) => {
    expect(analyticsMerchantReference(input)).toBeUndefined();
  });
});
