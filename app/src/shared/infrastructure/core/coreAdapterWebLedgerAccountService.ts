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
} from '../../domain/corePort';
import type { CoreAdapterWebDependencies } from './coreAdapterWebEffects';
import {
  calculateWebAccountNet,
  getWebLedgerAccountOrThrow,
} from './coreAdapterWebLedgerGuards';
import type {
  WebCoreState,
  WebLedgerAccount,
} from './coreAdapterWebState';

export type WebLedgerAccountServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
};

export class WebLedgerAccountService {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

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
    const openingBalance = openingBalanceRaw ? Number(openingBalanceRaw) : 0;
    if (Number.isNaN(openingBalance)) {
      throw new Error('opening balance must be a valid number');
    }

    this.state.ledgerAccounts.push({
      id,
      name,
      type: (input.type ?? 'cash').toLowerCase(),
      currency,
      status: 'active',
      createdAt: input.createdAt ?? this.nowIso(),
    });
    if (openingBalance !== 0) {
      this.state.ledgerTransactions.push({
        id: this.nextId(),
        accountId: id,
        type: openingBalance > 0 ? 'income' : 'expense',
        status: 'posted',
        amount: Math.abs(openingBalance).toFixed(2),
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
      balanceAmount: calculateWebAccountNet(this.state, account.id).toFixed(2),
    };
  }
}
