import type {
  LedgerArchiveAccountInput,
  LedgerDeleteAccountInput,
  LedgerGetAccountSummaryInput,
  LedgerGetAccountSummaryResult,
  LedgerListAccountsResult,
  LedgerListSupportedCurrenciesResult,
  LedgerOpenAccountInput,
  LedgerOpenAccountResult,
  LedgerRenameAccountInput,
  LedgerRestoreAccountInput,
} from '../application/ledger.port';
import type { LedgerAccountType } from '../application/ledger.port';
import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import {
  calculateWebAccountNet,
  formatWebAccountBalance,
  getWebLedgerAccountOrThrow,
} from './webLedgerGuards';
import type {
  WebAppState,
  WebLedgerAccount,
} from '../../core/infrastructure/webAppState';

export type WebLedgerAccountServiceOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
};

export class WebLedgerAccountService {
  private readonly state: WebAppState;

  private readonly dependencies: WebRuntimeDependencies;

  constructor(options: WebLedgerAccountServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nowIso(): string {
    return this.dependencies.clock.nowIso();
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  getAccountOrThrow(accountId: string): WebLedgerAccount {
    return getWebLedgerAccountOrThrow(this.state, accountId);
  }

  async resolveImportAccount(
    accountName: string,
    currency: string,
    createMissingAccounts: boolean,
  ): Promise<WebLedgerAccount> {
    const normalizedName = accountName.trim();
    let account = this.state.ledgerAccounts.find(
      (item) => item.name.toLowerCase() === normalizedName.toLowerCase() && item.currency === currency,
    );
    if (!account) {
      if (!createMissingAccounts) {
        throw new Error(`ACCOUNT_NOT_FOUND:${normalizedName}:${currency}`);
      }
      const opened = await this.openAccount({
        name: normalizedName,
        type: 'cash',
        currency,
      });
      account = this.state.ledgerAccounts.find((item) => item.id === opened.id);
    }
    if (!account) {
      throw new Error(`Account not found: ${normalizedName}`);
    }
    return account;
  }

  async openAccount(input: LedgerOpenAccountInput): Promise<LedgerOpenAccountResult> {
    const id = this.nextId();
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    const currency = input.currency.toUpperCase();
    if (!this.state.supportedCurrencies.includes(currency)) {
      throw new Error(`unsupported currency code: ${currency}`);
    }
    const openingBalanceRaw = input.openingBalanceAmount?.trim();
    const openingBalance = ExactDecimal.from(openingBalanceRaw || '0');
    const openingBalanceScale = openingBalanceRaw?.split('.')[1]?.length ?? 0;
    const type = normalizeAccountType(input.type);

    this.state.ledgerAccounts.push({
      id,
      name,
      type,
      currency,
      status: 'active',
      createdAt: input.createdAt ?? this.nowIso(),
    });
    if (openingBalance.compare(ExactDecimal.from('0')) !== 0) {
      const openingBalanceAmount = openingBalance.compare(ExactDecimal.from('0')) < 0
        ? openingBalance.multiplyByInteger(-1).toFixed(openingBalanceScale)
        : openingBalance.toFixed(openingBalanceScale);
      this.state.ledgerTransactions.push({
        id: this.nextId(),
        accountId: id,
        type: openingBalance.compare(ExactDecimal.from('0')) > 0 ? 'income' : 'expense',
        status: 'posted',
        amount: openingBalanceAmount,
        currency,
        occurredAt: input.createdAt ?? this.nowIso(),
        description: 'Opening balance',
        items: [],
      });
    }
    return { id };
  }

  async listSupportedCurrencies(): Promise<LedgerListSupportedCurrenciesResult> {
    return { items: [...this.state.supportedCurrencies] };
  }

  async renameAccount(input: LedgerRenameAccountInput): Promise<void> {
    const account = this.getAccountOrThrow(input.accountId);
    const name = input.name.trim();
    if (!name) {
      throw new Error('name is required');
    }
    account.name = name;
  }

  async archiveAccount(input: LedgerArchiveAccountInput): Promise<void> {
    const account = this.getAccountOrThrow(input.accountId);
    account.status = 'archived';
    account.archivedAt = input.archivedAt ?? this.nowIso();
  }

  async restoreAccount(input: LedgerRestoreAccountInput): Promise<void> {
    const account = this.getAccountOrThrow(input.accountId);
    account.status = 'active';
    account.archivedAt = undefined;
  }

  async deleteAccount(input: LedgerDeleteAccountInput): Promise<void> {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.getAccountOrThrow(accountId);

    const deletedTransactionIds = new Set(
      this.state.ledgerTransactions
        .filter((tx) => tx.accountId === accountId)
        .map((tx) => tx.id),
    );

    this.state.ledgerTransactions = this.state.ledgerTransactions
      .filter((tx) => tx.accountId !== accountId);
    this.state.ledgerAccounts = this.state.ledgerAccounts
      .filter((account) => account.id !== accountId);

    for (const transactionId of deletedTransactionIds) {
      this.state.taxonomyTransactionTags.delete(transactionId);
    }
    if (deletedTransactionIds.size > 0) {
      this.state.mobillsImportFingerprintToTransactionId = new Map(
        [...this.state.mobillsImportFingerprintToTransactionId.entries()]
          .filter(([, transactionId]) => !deletedTransactionIds.has(transactionId)),
      );
    }
  }

  async listAccounts(): Promise<LedgerListAccountsResult> {
    return {
      items: this.state.ledgerAccounts.map((account) => ({
        id: account.id,
        name: account.name,
        type: account.type,
        currency: account.currency,
        status: account.status,
      })),
    };
  }

  async getAccountSummary(input: LedgerGetAccountSummaryInput): Promise<LedgerGetAccountSummaryResult> {
    const account = this.getAccountOrThrow(input.accountId);
    return {
      accountId: account.id,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balanceAmount: formatWebAccountBalance(calculateWebAccountNet(this.state, account.id)),
    };
  }
}

function normalizeAccountType(type: string | undefined): LedgerAccountType {
  const normalized = (type ?? 'cash').toLowerCase();
  if (['bank', 'cash', 'card', 'wallet', 'savings', 'other'].includes(normalized)) {
    return normalized as LedgerAccountType;
  }
  throw new Error(`Unsupported account type: ${type}`);
}
