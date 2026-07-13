export type MovementEntryCategoryOption = {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
};

export type MovementEntryDraftType = 'expense' | 'income';

export type MovementEntryDraftField = 'type' | 'amount' | 'occurredOn' | 'note' | 'categoryId';

export type MovementEntryDraftIssueCode =
  | 'field_missing'
  | 'field_ambiguous'
  | 'confidence_insufficient'
  | 'value_invalid'
  | 'category_unavailable'
  | 'output_incompatible'
  | 'unexpected_field';

export type MovementEntryDraftIssue = {
  readonly field?: MovementEntryDraftField;
  readonly code: MovementEntryDraftIssueCode;
};

export type MovementEntryDraft = {
  readonly type?: MovementEntryDraftType;
  readonly amount?: string;
  readonly occurredOn?: string;
  readonly note?: string;
  readonly categoryId?: string;
  readonly issues: ReadonlyArray<MovementEntryDraftIssue>;
};

export type InterpretMovementEntryDraftRequest = {
  readonly runId: string;
  readonly transcript: string;
  readonly inputLanguage: string;
  readonly currentDate: string;
  readonly timeZone: string;
  readonly locale: string;
  readonly currency: string;
  readonly categories: ReadonlyArray<MovementEntryCategoryOption>;
};

export type InterpretMovementEntryDraftFailureCode =
  | 'artifact-storage-failed'
  | 'invalid_input'
  | 'empty_transcript'
  | 'interpretation_cancelled'
  | 'model_unavailable'
  | 'model_corrupt'
  | 'unsupported_device'
  | 'inference_failed'
  | 'malformed_output'
  | 'output_invalid'
  | 'no_usable_interpretation'
  | 'interpretation-incomplete'
  | 'schema_incompatible';

export type InterpretMovementEntryDraftFailure = {
  readonly code: InterpretMovementEntryDraftFailureCode;
  readonly recoverable: boolean;
  readonly technicalMessage?: string;
};

export type InterpretMovementEntryDraftOutcome =
  | { readonly kind: 'success'; readonly draft: MovementEntryDraft }
  | { readonly kind: 'failure'; readonly failure: InterpretMovementEntryDraftFailure };

export interface MovementEntryDraftInterpreterPort {
  interpret(request: InterpretMovementEntryDraftRequest): Promise<InterpretMovementEntryDraftOutcome>;
  cancel(): Promise<void>;
}
