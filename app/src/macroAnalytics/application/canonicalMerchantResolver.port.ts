import type { MacroMerchantCode } from '../domain/macroMerchantCode';

export type CanonicalMerchantResolverPort = Readonly<{
  resolve(input: Readonly<{ merchantKey: string }>): MacroMerchantCode | null;
}>;
