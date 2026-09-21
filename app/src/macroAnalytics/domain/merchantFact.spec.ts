import { describe, expect, it } from 'vitest';
import { createMacroMerchantCode } from './macroMerchantCode';
import { createMerchantFact } from './merchantFact';

const validFact = {
  id: 'posted/movement-1/merchant',
  occurredAt: '2026-09-18T10:30:00Z',
  source: 'POSTED' as const,
  kind: 'EXPENSE' as const,
  currency: 'EUR',
  amount: '60.00',
  merchant: createMacroMerchantCode('MERCADONA'),
};

describe('MerchantFact', () => {
  it('retains only the privacy-safe canonical fact fields', () => {
    const fact = createMerchantFact({
      ...validFact,
      merchantKey: 'secret merchant key',
      displayName: 'Private Merchant Name',
      description: 'Private description',
      accountId: 'private-account',
    } as typeof validFact);

    expect(fact).toEqual(validFact);
    expect(JSON.stringify(fact)).not.toMatch(/secret merchant key|Private Merchant Name|Private description|private-account/);
  });

  it('accepts unresolved explicit merchants through the reserved code', () => {
    expect(createMerchantFact({ ...validFact, merchant: createMacroMerchantCode('UNMAPPED') }).merchant).toBe('UNMAPPED');
  });
});
