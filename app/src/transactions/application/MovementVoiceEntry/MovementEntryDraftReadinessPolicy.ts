import type {
  MovementEntryDraft,
  MovementEntryDraftField,
} from './MovementEntryDraftInterpreterPort';

export type MovementEntryDraftReadiness =
  | Readonly<{
      kind: 'ready';
    }>
  | Readonly<{
      kind: 'incomplete';
      missingFields: ReadonlyArray<MovementEntryDraftField>;
    }>;

export class MovementEntryDraftReadinessPolicy {
  evaluate(draft: MovementEntryDraft): MovementEntryDraftReadiness {
    const missingFields: MovementEntryDraftField[] = [];

    if (draft.type !== 'expense' && draft.type !== 'income') {
      missingFields.push('type');
    }

    const amount = draft.amount?.trim() ?? '';
    const numericAmount = Number(amount);

    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      missingFields.push('amount');
    }

    return missingFields.length === 0
      ? { kind: 'ready' }
      : {
          kind: 'incomplete',
          missingFields,
        };
  }
}
