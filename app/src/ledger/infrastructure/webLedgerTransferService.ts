import type {
  LedgerRecordTransferFxInput,
  LedgerRecordTransferFxResult,
  LedgerRecordTransferInput,
  LedgerRecordTransferResult,
} from '../application/ledger.port';
import type { WebRuntimeDependencies } from '../../core/infrastructure/webRuntimeDependencies';
import {
  ensureWebAccountCanPost,
  getWebLedgerAccountOrThrow,
} from './webLedgerGuards';
import type { WebAppState } from '../../core/infrastructure/webAppState';

export type WebLedgerTransferServiceOptions = {
  state: WebAppState;
  dependencies: WebRuntimeDependencies;
};

export class WebLedgerTransferService {
  private readonly state: WebAppState;

  private readonly dependencies: WebRuntimeDependencies;

  constructor(options: WebLedgerTransferServiceOptions) {
    this.state = options.state;
    this.dependencies = options.dependencies;
  }

  private nextId(): string {
    return this.dependencies.idGenerator.nextId();
  }

  async recordTransfer(input: LedgerRecordTransferInput): Promise<LedgerRecordTransferResult> {
    const fromAccount = getWebLedgerAccountOrThrow(this.state, input.fromAccountId);
    const toAccount = getWebLedgerAccountOrThrow(this.state, input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    ensureWebAccountCanPost(fromAccount, input.currency);
    ensureWebAccountCanPost(toAccount, input.currency);

    const transferOutId = this.nextId();
    const transferInId = this.nextId();
    const currency = input.currency.toUpperCase();

    this.state.ledgerTransactions.push({
      id: transferOutId,
      accountId: fromAccount.id,
      type: 'transfer_out',
      status: 'posted',
      amount: input.amount,
      currency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferInId,
      items: [],
    });
    this.state.ledgerTransactions.push({
      id: transferInId,
      accountId: toAccount.id,
      type: 'transfer_in',
      status: 'posted',
      amount: input.amount,
      currency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferOutId,
      items: [],
    });

    return {
      transferOutId,
      transferInId,
    };
  }

  async recordTransferFx(input: LedgerRecordTransferFxInput): Promise<LedgerRecordTransferFxResult> {
    const fromAccount = getWebLedgerAccountOrThrow(this.state, input.fromAccountId);
    const toAccount = getWebLedgerAccountOrThrow(this.state, input.toAccountId);
    if (fromAccount.id === toAccount.id) {
      throw new Error('source and destination accounts must be different');
    }
    ensureWebAccountCanPost(fromAccount, input.sourceCurrency);
    ensureWebAccountCanPost(toAccount, input.destinationCurrency);

    const sourceAmount = Number(input.sourceAmount);
    const destinationAmount = Number(input.destinationAmount);
    if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
      throw new Error('source amount must be greater than 0');
    }
    if (!Number.isFinite(destinationAmount) || destinationAmount <= 0) {
      throw new Error('destination amount must be greater than 0');
    }

    const sourceCurrency = input.sourceCurrency.toUpperCase();
    const destinationCurrency = input.destinationCurrency.toUpperCase();

    const resolvedExchangeRate = input.exchangeRate == null || input.exchangeRate.trim().length === 0
      ? destinationAmount / sourceAmount
      : Number(input.exchangeRate);
    if (!Number.isFinite(resolvedExchangeRate) || resolvedExchangeRate <= 0) {
      throw new Error('exchange rate must be greater than 0');
    }

    const normalizedSourceAmount = Number(sourceAmount.toFixed(2));
    const normalizedDestinationAmount = Number(destinationAmount.toFixed(2));

    if (sourceCurrency === destinationCurrency) {
      if (Math.abs(normalizedSourceAmount - normalizedDestinationAmount) > 0.000001) {
        throw new Error('Same-currency transfer must keep equal source and destination amounts');
      }
      if (input.exchangeRate != null && input.exchangeRate.trim().length > 0 && Math.abs(resolvedExchangeRate - 1) > 0.000001) {
        throw new Error('Same-currency transfer exchange rate must be 1');
      }
    } else {
      const expectedDestinationAmount = Number((normalizedSourceAmount * resolvedExchangeRate).toFixed(2));
      if (Math.abs(expectedDestinationAmount - normalizedDestinationAmount) > 0.000001) {
        throw new Error('Transfer amounts do not match exchange rate');
      }
    }

    const transferOutId = this.nextId();
    const transferInId = this.nextId();

    this.state.ledgerTransactions.push({
      id: transferOutId,
      accountId: fromAccount.id,
      type: 'transfer_out',
      status: 'posted',
      amount: normalizedSourceAmount.toFixed(2),
      currency: sourceCurrency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferInId,
      items: [],
    });
    this.state.ledgerTransactions.push({
      id: transferInId,
      accountId: toAccount.id,
      type: 'transfer_in',
      status: 'posted',
      amount: normalizedDestinationAmount.toFixed(2),
      currency: destinationCurrency,
      occurredAt: input.occurredAt,
      description: input.description,
      linkedTransactionId: transferOutId,
      items: [],
    });

    return {
      transferOutId,
      transferInId,
    };
  }
}
