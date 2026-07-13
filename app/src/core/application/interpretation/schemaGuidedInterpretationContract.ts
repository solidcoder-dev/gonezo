export type InterpretationContractVersion = '1';

export type InterpretationInputSource = {
  readonly kind: 'transcript';
  readonly text: string;
};

export type InterpretationValueType = 'text' | 'decimal' | 'date' | 'enum' | 'boolean' | 'integer';

export type InterpretationAllowedValue = {
  readonly stableValue: string;
  readonly label: string;
  readonly description?: string;
};

export type InterpretationFieldSpec = {
  readonly key: string;
  readonly description: string;
  readonly type: InterpretationValueType;
  readonly required: boolean;
  readonly format?: string;
  readonly allowedValues?: ReadonlyArray<InterpretationAllowedValue>;
};

export type InterpretationSpec = {
  readonly id: string;
  readonly version: string;
  readonly fields: ReadonlyArray<InterpretationFieldSpec>;
};

export type InterpretationContextEntry = {
  readonly key: string;
  readonly value: {
    readonly type: InterpretationValueType;
    readonly value: string | number | boolean;
  };
};

export type InterpretationContext = {
  readonly entries: ReadonlyArray<InterpretationContextEntry>;
};

export type InterpretationConfidence = number;

export type InterpretationFieldCandidate = {
  readonly value: {
    readonly type: InterpretationValueType;
    readonly value: string | number | boolean;
  };
  readonly confidence: InterpretationConfidence;
  readonly rationale?: string;
};

export type InterpretationFieldInterpretation =
  | { readonly kind: 'resolved'; readonly candidate: InterpretationFieldCandidate }
  | { readonly kind: 'ambiguous'; readonly candidates: ReadonlyArray<InterpretationFieldCandidate> }
  | { readonly kind: 'missing' };

export type InterpretationFieldResult = {
  readonly key: string;
  readonly interpretation: InterpretationFieldInterpretation;
};

export type InterpretationIssue = {
  readonly code: string;
  readonly message: string;
  readonly level?: 'warning' | 'error';
  readonly fieldKey?: string;
};

export type InterpretationResult = {
  readonly specId: string;
  readonly specVersion: string;
  readonly fields: ReadonlyArray<InterpretationFieldResult>;
  readonly issues: ReadonlyArray<InterpretationIssue>;
};

export type SchemaGuidedInterpretationRequest = {
  readonly requestId: string;
  readonly inputSource: InterpretationInputSource;
  readonly inputLanguage: string;
  readonly interpretationSpec: InterpretationSpec;
  readonly interpretationContext: InterpretationContext;
  readonly contractVersion: InterpretationContractVersion;
};

export type SchemaGuidedInterpretationFailureCode =
  | 'artifact-storage-failed'
  | 'invalid_request'
  | 'contract_version_unsupported'
  | 'malformed_output'
  | 'cancelled'
  | 'model_unavailable'
  | 'model_corrupt'
  | 'unsupported_device'
  | 'inference_failed';

export type SchemaGuidedInterpretationFailure = {
  readonly code: SchemaGuidedInterpretationFailureCode;
  readonly recoverable: boolean;
  readonly message?: string;
};

export type SchemaGuidedInterpretationOutcome =
  | { readonly kind: 'success'; readonly result: InterpretationResult }
  | { readonly kind: 'failure'; readonly failure: SchemaGuidedInterpretationFailure };
