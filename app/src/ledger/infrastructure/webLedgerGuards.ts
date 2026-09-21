import type {
  WebAppState,
  WebLedgerAccount,
  WebLedgerTransaction,
} from '../../core/infrastructure/webAppState';
import { balanceImpact } from '../application/movementSemantics';
import { ExactDecimal, addExactDecimals } from '../../shared/domain/exactDecimal';

export function getWebLedgerAccountOrThrow(
  state: WebAppState,
  accountId: string,
): WebLedgerAccount {
  const account = state.ledgerAccounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error('Account not found');
  }
  return account;
}

export function getWebLedgerTransactionOrThrow(
  state: WebAppState,
  transactionId: string,
): WebLedgerTransaction {
  const transaction = state.ledgerTransactions.find((item) => item.id === transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  return transaction;
}

export function ensureWebAccountCanPost(account: WebLedgerAccount, currency: string) {
  if (account.status !== 'active') {
    throw new Error('Archived accounts cannot accept transactions');
  }
  if (account.currency !== currency.toUpperCase()) {
    throw new Error(`Transaction currency must match account currency (${account.currency})`);
  }
}

export function calculateWebAccountNet(state: WebAppState, accountId: string): string {
  let net = '0';
  for (const tx of state.ledgerTransactions) {
    if (tx.accountId !== accountId || tx.status !== 'posted') {
      continue;
    }
    net = addExactDecimals(net, balanceImpact(tx.type, tx.amount));
  }
  const scale = Math.max(2, net.split('.')[1]?.length ?? 0);
  return ExactDecimal.from(net).toFixed(scale);
}
