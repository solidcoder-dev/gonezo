import { describe, expect, it } from 'vitest';
import { createCanonicalMerchantResolver } from './canonicalMerchantResolver';

const catalog = [
  { code: 'MERCADONA', aliases: ['mercadona'] },
  { code: 'LIDL', aliases: ['lidl'] },
] as const;

describe('canonical merchant resolver', () => {
  it('resolves explicit aliases deterministically and only by exact key', () => {
    const resolver = createCanonicalMerchantResolver(catalog);
    expect(resolver.resolve({ merchantKey: 'mercadona' })).toBe('MERCADONA');
    expect(resolver.resolve({ merchantKey: 'mercadona' })).toBe(resolver.resolve({ merchantKey: 'mercadona' }));
    expect(resolver.resolve({ merchantKey: 'Mercadona' })).toBeNull();
    expect(resolver.resolve({ merchantKey: 'mercadona #123' })).toBeNull();
    expect(resolver.resolve({ merchantKey: 'unlisted' })).toBeNull();
  });

  it('rejects aliases shared by different canonical merchants', () => {
    expect(() => createCanonicalMerchantResolver([
      { code: 'MERCADONA', aliases: ['market'] },
      { code: 'LIDL', aliases: ['market'] },
    ])).toThrow(/alias/i);
  });

  it('rejects duplicate canonical codes', () => {
    expect(() => createCanonicalMerchantResolver([
      { code: 'LIDL', aliases: ['lidl'] },
      { code: 'LIDL', aliases: ['lidl-es'] },
    ])).toThrow(/code/i);
  });
});
