import type { CanonicalMerchantDefinition } from './canonicalMerchantResolver';

export const MACRO_MERCHANT_CATALOG_VERSION = 1;

export const canonicalMerchantCatalog: readonly CanonicalMerchantDefinition[] = Object.freeze([
  { code: 'MERCADONA', aliases: ['mercadona'] },
  { code: 'LIDL', aliases: ['lidl'] },
  { code: 'CARREFOUR', aliases: ['carrefour'] },
]);
