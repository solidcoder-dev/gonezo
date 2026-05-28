import type {
  WebAppState,
  WebLedgerAccount,
  WebLedgerTransaction,
} from '../../core/infrastructure/webAppState';

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

export function calculateWebAccountNet(state: WebAppState, accountId: string): number {
  let net = 0;
  for (const tx of state.ledgerTransactions) {
    if (tx.accountId !== accountId || tx.status !== 'posted') {
      continue;
    }
    const amount = Number(tx.amount);
    if (Number.isNaN(amount)) {
      continue;
    }
    if (tx.type === 'income') {
      net += amount;
    }
    if (tx.type === 'expense') {
      net -= amount;
    }
    if (tx.type === 'transfer_in') {
      net += amount;
    }
    if (tx.type === 'transfer_out') {
      net -= amount;
    }
  }
  return net;
}
