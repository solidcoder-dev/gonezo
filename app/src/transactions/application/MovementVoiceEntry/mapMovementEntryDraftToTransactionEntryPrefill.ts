import type { TransactionEntryPrefillRequest } from '../TransactionEntryComponent.contract';
import type { MovementEntryDraft } from './MovementEntryDraftInterpreterPort';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function requestId(): number {
  return Date.now();
}

export function mapMovementEntryDraftToTransactionEntryPrefill(
  draft: MovementEntryDraft,
  options: { readonly requestId?: number; readonly defaultDate?: string } = {},
): TransactionEntryPrefillRequest {
  return {
    requestId: options.requestId ?? requestId(),
    mode: draft.type ?? 'expense',
    amount: draft.amount ?? '',
    date: draft.occurredOn ?? options.defaultDate ?? todayIso(),
    note: draft.note,
    categoryId: draft.categoryId,
  };
}
