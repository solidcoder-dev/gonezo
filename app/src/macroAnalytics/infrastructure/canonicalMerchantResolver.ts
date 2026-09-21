import type { CanonicalMerchantResolverPort } from '../application/canonicalMerchantResolver.port';
import { createMacroMerchantCode } from '../domain/macroMerchantCode';
import type { MacroMerchantCode } from '../domain/macroMerchantCode';

export type CanonicalMerchantDefinition = Readonly<{
  code: string;
  aliases: readonly string[];
}>;

export function createCanonicalMerchantResolver(
  catalog: readonly CanonicalMerchantDefinition[],
): CanonicalMerchantResolverPort {
  const aliasToCode = new Map<string, MacroMerchantCode>();
  const codes = new Set<string>();

  for (const definition of catalog) {
    const code = createMacroMerchantCode(definition.code);
    if (codes.has(code)) throw new Error(`Duplicate canonical merchant code: ${code}`);
    if (code === 'UNMAPPED') throw new Error('UNMAPPED is reserved for unresolved merchants');
    codes.add(code);

    for (const alias of definition.aliases) {
      if (!alias.trim()) throw new Error(`Canonical merchant alias is required for ${code}`);
      if (aliasToCode.has(alias)) throw new Error(`Duplicate canonical merchant alias: ${alias}`);
      aliasToCode.set(alias, code);
    }
  }

  return Object.freeze({
    resolve: ({ merchantKey }) => aliasToCode.get(merchantKey) ?? null,
  });
}
