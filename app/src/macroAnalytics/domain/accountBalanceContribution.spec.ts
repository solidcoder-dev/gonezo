import { describe, expect, it } from 'vitest';
import { createAnalyticsPeriod } from './analyticsPeriod';
import { aggregateAccountBalanceFacts } from './accountBalanceContribution';
import { createAccountBalanceFact } from './accountBalanceFact';

const period = createAnalyticsPeriod('2026-09');
const fact = (currency: string, accountType: 'BANK' | 'CASH' | 'CARD', balanceAmount: string) => createAccountBalanceFact({
  asOfLocalDateExclusive: '2026-10-01', accountType, currency, balanceAmount,
});

describe('aggregateAccountBalanceFacts', () => {
  it('aggregates signed balances, zero balances, counts, and canonical order exactly', () => {
    expect(aggregateAccountBalanceFacts([
      fact('USD', 'CASH', '0'), fact('EUR', 'CASH', '-250.50'), fact('EUR', 'BANK', '100.10'), fact('EUR', 'BANK', '0.20'), fact('USD', 'BANK', '5'),
    ], period)).toEqual({ currencies: [
      { currency: 'EUR', buckets: [{ accountType: 'BANK', balanceAmount: '100.3', accountCount: 2 }, { accountType: 'CASH', balanceAmount: '-250.5', accountCount: 1 }] },
      { currency: 'USD', buckets: [{ accountType: 'BANK', balanceAmount: '5', accountCount: 1 }, { accountType: 'CASH', balanceAmount: '0', accountCount: 1 }] },
    ] });
  });

  it('returns empty currencies when no account facts exist', () => {
    expect(aggregateAccountBalanceFacts([], period)).toEqual({ currencies: [] });
  });

  it('rejects a snapshot from another period cutoff', () => {
    expect(() => aggregateAccountBalanceFacts([createAccountBalanceFact({
      asOfLocalDateExclusive: '2026-09-01', accountType: 'BANK', currency: 'EUR', balanceAmount: '1',
    })], period)).toThrow('2026-10-01');
  });
});
