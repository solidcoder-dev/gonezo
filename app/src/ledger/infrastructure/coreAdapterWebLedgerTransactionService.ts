import type {
  LedgerAddTransactionItemInput,
  LedgerCreateExpenseDraftInput,
  LedgerCreateExpenseDraftResult,
  LedgerListTransactionsInput,
  LedgerListTransactionsResult,
  LedgerPostDraftTransactionInput,
  LedgerRecordExpenseInput,
  LedgerRecordExpenseResult,
  LedgerRecordIncomeInput,
  LedgerRecordIncomeResult,
  LedgerVoidTransactionInput,
} from '../application/ledgerCore.port';
import type { CoreAdapterWebDependencies } from '../../core/infrastructure/coreAdapterWebEffects';
import {
  ensureWebAccountCanPost,
  getWebLedgerAccountOrThrow,
  getWebLedgerTransactionOrThrow,
} from './coreAdapterWebLedgerGuards';
import { listWebLedgerTransactions } from './coreAdapterWebLedgerQueries';
import type {
  WebCoreState,
  WebLedgerTransaction,
} from '../../core/infrastructure/coreAdapterWebState';

export type WebLedgerTransactionServiceOptions = {
  state: WebCoreState;
  dependencies: CoreAdapterWebDependencies;
};

export class WebLedgerTransactionService {
  private readonly state: WebCoreState;

  private readonly dependencies: CoreAdapterWebDependencies;

  constructor(options: WebLedgerTransactionServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  getTransactionOrThrow(transactionId: string): WebLedgerTransaction {
    return getWebLedgerTransactionOrThrow(this.state, transactionId);
  }

  async recordExpense(input: LedgerRecordExpenseInput): Promise<LedgerRecordExpenseResult> {
    const account = getWebLedgerAccountOrThrow(this.state, input.accountId);
    ensureWebAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'expense',
      status: 'posted',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async recordIncome(input: LedgerRecordIncomeInput): Promise<LedgerRecordIncomeResult> {
    const account = getWebLedgerAccountOrThrow(this.state, input.accountId);
    ensureWebAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: 'income',
      status: 'posted',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async createExpenseDraft(input: LedgerCreateExpenseDraftInput): Promise<LedgerCreateExpenseDraftResult> {
    const account = getWebLedgerAccountOrThrow(this.state, input.accountId);
    ensureWebAccountCanPost(account, input.currency);
    const id = this.nextId();
    this.state.ledgerTransactions.push({
      id,
      accountId: input.accountId,
      type: input.type ?? 'expense',
      status: 'draft',
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      occurredAt: input.occurredAt,
      description: input.description,
      merchant: input.merchant,
      categoryId: input.categoryId,
      items: [],
    });
    return { id };
  }

  async addTransactionItem(input: LedgerAddTransactionItemInput): Promise<void> {
    const tx = this.getTransactionOrThrow(input.transactionId);
    if (tx.status !== 'draft') {
      throw new Error('Items can only be modified in draft status');
    }
    if (tx.currency !== input.currency.toUpperCase()) {
      throw new Error('Item currency must match transaction currency');
    }
    tx.items.push({
      id: this.nextId(),
      name: input.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      categoryId: input.categoryId,
      note: input.note,
    });
  }

  async postDraftTransaction(input: LedgerPostDraftTransactionInput): Promise<void> {
    const tx = this.getTransactionOrThrow(input.transactionId);
    if (tx.status !== 'draft') {
      throw new Error('Only draft transactions can be posted');
    }
    if (tx.items.length > 0) {
      const total = tx.items.reduce((acc, item) => acc + Number(item.amount), 0);
      if (Number(tx.amount).toFixed(2) !== total.toFixed(2)) {
        throw new Error('sum(items) must match transaction amount');
      }
    }
    tx.status = 'posted';
  }

  async voidTransaction(input: LedgerVoidTransactionInput): Promise<void> {
    const tx = this.getTransactionOrThrow(input.transactionId);
    if (tx.status !== 'posted') {
      throw new Error('Only posted transactions can be voided');
    }
    tx.status = 'voided';
    if (tx.linkedTransactionId) {
      const linked = this.state.ledgerTransactions.find((item) => item.id === tx.linkedTransactionId);
      if (linked?.status === 'posted') {
        linked.status = 'voided';
      }
    }
  }

  async listTransactions(input: LedgerListTransactionsInput): Promise<LedgerListTransactionsResult> {
    return listWebLedgerTransactions(
      input,
      this.state.ledgerTransactions,
      this.state.taxonomyTransactionTags,
    );
  }
}
