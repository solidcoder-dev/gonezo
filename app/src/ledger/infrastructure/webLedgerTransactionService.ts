import type {
  LedgerAddTransactionItemInput,
  LedgerAddTransactionItemResult,
  LedgerReplacePostedTransactionItemsInput,
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
} from '../application/ledger.port';
import { addDecimalAmounts, isZeroDecimalAmount, subtractDecimalAmounts } from '../application/decimalAmount';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import {
  ensureWebAccountCanPost,
  getWebLedgerAccountOrThrow,
  getWebLedgerTransactionOrThrow,
} from './webLedgerGuards';
import { listWebLedgerTransactions } from './webLedgerQueries';
import type {
  WebAppState,
  WebLedgerTransaction,
} from '../../core/infrastructure/webAppState';

export type WebLedgerTransactionServiceOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
};

export class WebLedgerTransactionService {
  private readonly state: WebAppState;

  private readonly dependencies: WebRuntimeDependencies;

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

  async addTransactionItem(input: LedgerAddTransactionItemInput): Promise<LedgerAddTransactionItemResult> {
    const tx = this.getTransactionOrThrow(input.transactionId);
    if (tx.status !== 'draft') {
      throw new Error('Items can only be modified in draft status');
    }
    if (tx.currency !== input.currency.toUpperCase()) {
      throw new Error('Item currency must match transaction currency');
    }
    const id = this.nextId();
    tx.items.push({
      id,
      name: input.name,
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      categoryId: input.categoryId,
      note: input.note,
    });
    return { id };
  }

  async replacePostedTransactionItems(input: LedgerReplacePostedTransactionItemsInput): Promise<void> {
    const tx = this.getTransactionOrThrow(input.transactionId);
    if (tx.status !== 'posted') throw new Error('Items can only be replaced in posted status');
    if (tx.type === 'transfer' || tx.type === 'transfer_in' || tx.type === 'transfer_out') throw new Error('Transfers cannot contain items');
    const ids = input.items.map((item) => item.id).filter((id): id is string => Boolean(id));
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate item id');
    const items = input.items.map((item) => ({
      id: item.id ?? this.nextId(),
      name: item.name,
      amount: item.amount,
      currency: item.currency.toUpperCase(),
      categoryId: item.categoryId,
      note: item.note,
    }));
    if (items.some((item) => item.currency !== tx.currency)) throw new Error('Item currency must match transaction currency');
    const total = items.reduce((sum, item) => addDecimalAmounts(sum, item.amount), '0');
    if (items.length > 0 && !isZeroDecimalAmount(subtractDecimalAmounts(total, tx.amount))) throw new Error('sum(items) must match transaction amount');
    tx.items = items;
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
      new Map(this.state.taxonomyTags.map((tag) => [tag.id, tag.name])),
    );
  }
}
