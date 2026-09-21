import { describe, expect, it } from 'vitest';
import { createAccountBalanceFact } from './accountBalanceFact';

describe('AccountBalanceFact', () => {
  it('accepts signed balances without carrying account identity or movement details', () => {
    const fact = createAccountBalanceFact({
      asOfLocalDateExclusive: '2027-01-01',
      accountType: 'BANK',
      currency: 'EUR',
      balanceAmount: '-10.005',
      accountId: 'private-account',
      accountName: 'Private name',
      isDefault: true,
      transactionId: 'private-transaction',
      description: 'Private description',
      merchant: 'Private merchant',
    } as Parameters<typeof createAccountBalanceFact>[0]);
    expect(fact).toEqual({ asOfLocalDateExclusive: '2027-01-01', accountType: 'BANK', currency: 'EUR', balanceAmount: '-10.005' });
    expect(Object.keys(fact).sort()).toEqual(['accountType', 'asOfLocalDateExclusive', 'balanceAmount', 'currency']);
  });

  it('accepts zero and rejects invalid dates and currencies', () => {
    expect(createAccountBalanceFact({ asOfLocalDateExclusive: '2026-09-01', accountType: 'CASH', currency: 'USD', balanceAmount: '0' }).balanceAmount).toBe('0');
    expect(() => createAccountBalanceFact({ asOfLocalDateExclusive: '2026-02-30', accountType: 'CASH', currency: 'USD', balanceAmount: '1' })).toThrow('valid YYYY-MM-DD');
    expect(() => createAccountBalanceFact({ asOfLocalDateExclusive: '2026-09-01', accountType: 'CASH', currency: 'usd', balanceAmount: '1' })).toThrow('uppercase');
  });
});
