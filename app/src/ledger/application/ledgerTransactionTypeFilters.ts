import type { LedgerTransactionType } from './ledger.port';

export function expandLedgerSearchTypes(types: LedgerTransactionType[]): LedgerTransactionType[] {
  return [...new Set(types.flatMap((type) => type === 'transfer'
    ? ['transfer', 'transfer_in', 'transfer_out'] as const
    : [type]))];
}
