import type { LedgerAccountType } from '../../ledger/application/ledger.port';
import type { MacroAccountTypeCode } from '../domain/macroAccountTypeCode';

export function toMacroAccountTypeCode(type: LedgerAccountType): MacroAccountTypeCode {
  switch (type) {
    case 'bank': return 'BANK';
    case 'cash': return 'CASH';
    case 'card': return 'CARD';
    case 'wallet': return 'WALLET';
    case 'savings': return 'SAVINGS';
    case 'other': return 'OTHER';
  }
}
