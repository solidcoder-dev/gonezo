import { describe, expect, it } from 'vitest';
import { toMacroAccountTypeCode } from './macroAccountTypeMapper';

describe('Macro account type ACL', () => {
  it.each([
    ['bank', 'BANK'], ['cash', 'CASH'], ['card', 'CARD'], ['wallet', 'WALLET'], ['savings', 'SAVINGS'], ['other', 'OTHER'],
  ] as const)('maps %s to %s', (ledgerType, macroType) => {
    expect(toMacroAccountTypeCode(ledgerType)).toBe(macroType);
  });
});
