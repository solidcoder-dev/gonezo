import type { CanonicalMerchantDefinition } from './canonicalMerchantResolver';
export { MACRO_MERCHANT_CATALOG_VERSION } from '../domain/macroMerchantCatalogVersion';

export const canonicalMerchantCatalog: readonly CanonicalMerchantDefinition[] = Object.freeze([
  { code: 'MERCADONA', aliases: ['mercadona'] },
  { code: 'LIDL', aliases: ['lidl'] },
  { code: 'CARREFOUR', aliases: ['carrefour'] },
]);
