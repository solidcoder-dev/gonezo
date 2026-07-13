import type {
  InterpretationAllowedValue,
  InterpretationContextEntry,
  InterpretationFieldSpec,
  InterpretationIssue,
  InterpretationResult,
  InterpretationValueType,
  SchemaGuidedInterpretationRequest,
} from '../../application/interpretation/schemaGuidedInterpretationContract';

export const SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION = '1' as const;

type InterpretationFieldTypeV1Dto =
  | 'TEXT'
  | 'DECIMAL'
  | 'DATE'
  | 'ENUM'
  | 'BOOLEAN'
  | 'INTEGER';

type InterpretationContextValueTypeV1Dto =
  | 'text'
  | 'decimal'
  | 'date'
  | 'enum'
  | 'boolean'
  | 'integer';

type InterpretationValueTypeV1Dto = InterpretationContextValueTypeV1Dto;

type InterpretationRequestV1Dto = Readonly<{
  contractVersion: '1';
  input: string;
  inputLanguage: string;
  spec: InterpretationSpecV1Dto;
  context: InterpretationContextV1Dto;
}>;

type InterpretationSpecV1Dto = Readonly<{
  contractVersion: '1';
  specId: string;
  version: string;
  fields: ReadonlyArray<InterpretationFieldSpecV1Dto>;
}>;

type InterpretationFieldSpecV1Dto = Readonly<{
  key: string;
  description: string;
  type: InterpretationFieldTypeV1Dto;
  required: boolean;
  format?: string;
  allowedValues?: ReadonlyArray<{
    stableValue: string;
    label: string;
    description?: string;
  }>;
}>;

type InterpretationContextV1Dto = Readonly<{
  entries: ReadonlyArray<{
    key: string;
    value: {
      type: InterpretationContextValueTypeV1Dto;
      value: string | number | boolean;
    };
  }>;
}>;

type InterpretationResultV1Dto = Readonly<{
  contractVersion: '1';
  specId: string;
  version: string;
  fields: ReadonlyArray<InterpretationFieldResultV1Dto>;
  issues?: ReadonlyArray<InterpretationIssueV1Dto>;
}>;

type InterpretationFieldResultV1Dto = Readonly<{
  key: string;
  interpretation: InterpretationInterpretationV1Dto;
}>;

type InterpretationInterpretationV1Dto =
  | Readonly<{
      kind: 'resolved';
      candidate: InterpretationFieldCandidateV1Dto;
    }>
  | Readonly<{
      kind: 'ambiguous';
      candidates: ReadonlyArray<InterpretationFieldCandidateV1Dto>;
    }>
  | Readonly<{
      kind: 'missing';
    }>;

type InterpretationFieldCandidateV1Dto = Readonly<{
  value: {
    type: InterpretationValueTypeV1Dto;
    value: string | number | boolean;
  };
  confidence: number;
  rationale?: string;
}>;

type InterpretationIssueV1Dto = Readonly<{
  code: string;
  message: string;
  level?: 'WARNING' | 'ERROR' | 'warning' | 'error';
  fieldKey?: string;
}>;

export class SchemaGuidedInterpretationJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaGuidedInterpretationJsonError';
  }
}

export class SchemaGuidedInterpretationJsonCodec {
  encodeRequest(request: Omit<SchemaGuidedInterpretationRequest, 'requestId'>): string {
    const dto: InterpretationRequestV1Dto = {
      contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
      input: request.inputSource.text,
      inputLanguage: request.inputLanguage,
      spec: {
        contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
        specId: request.interpretationSpec.id,
        version: request.interpretationSpec.version,
        fields: request.interpretationSpec.fields.map((field) => encodeFieldSpec(field)),
      },
      context: {
        entries: request.interpretationContext.entries.map((entry) => encodeContextEntry(entry)),
      },
    };

    return JSON.stringify(dto);
  }

  decodeResult(json: string): InterpretationResult {
    const dto = decodeResultDto(json);

    return {
      specId: dto.specId,
      specVersion: dto.version,
      fields: dto.fields,
      issues: (dto.issues ?? []).map((issue): InterpretationIssue => ({
        code: issue.code,
        message: issue.message,
        level: decodeIssueLevel(issue.level),
        ...(issue.fieldKey !== undefined ? { fieldKey: issue.fieldKey } : {}),
      })),
    };
  }
}

function encodeFieldSpec(field: InterpretationFieldSpec): InterpretationFieldSpecV1Dto {
  const allowedValues = field.allowedValues ?? [];
  const dto: InterpretationFieldSpecV1Dto = {
    key: field.key,
    description: field.description,
    type: encodeFieldType(field.type),
    required: field.required,
    ...(field.format !== undefined ? { format: field.format } : {}),
    ...((allowedValues.length > 0)
      ? { allowedValues: allowedValues.map((value) => encodeAllowedValue(value)) }
      : {}),
  };

  return dto;
}

function encodeFieldType(type: InterpretationValueType): InterpretationFieldTypeV1Dto {
  switch (type) {
    case 'text':
      return 'TEXT';
    case 'decimal':
      return 'DECIMAL';
    case 'date':
      return 'DATE';
    case 'enum':
      return 'ENUM';
    case 'boolean':
      return 'BOOLEAN';
    case 'integer':
      return 'INTEGER';
    default: {
      const exhaustiveCheck: never = type;
      throw new SchemaGuidedInterpretationJsonError(`Unknown interpretation value type ${String(exhaustiveCheck)}.`);
    }
  }
}

function encodeAllowedValue(value: InterpretationAllowedValue): Readonly<{
  stableValue: string;
  label: string;
  description?: string;
}> {
  return {
    stableValue: value.stableValue,
    label: value.label,
    ...(value.description !== undefined ? { description: value.description } : {}),
  };
}

function encodeContextEntry(entry: InterpretationContextEntry): InterpretationContextV1Dto['entries'][number] {
  return {
    key: entry.key,
    value: {
      type: entry.value.type,
      value: entry.value.value,
    },
  };
}

function decodeResultDto(json: string): InterpretationResultV1Dto {
  const root = requireRecord(parseJson(json), 'interpretation result');
  requireExactKeys(root, new Set(['contractVersion', 'specId', 'version', 'fields']), new Set(['issues']));

  const contractVersion = requireString(root.contractVersion, 'interpretation result.contractVersion');
  if (contractVersion !== SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION) {
    throw new SchemaGuidedInterpretationJsonError('Unsupported interpretation JSON contract version.');
  }

  return {
    contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
    specId: requireNonEmptyString(root.specId, 'interpretation result.specId'),
    version: requireNonEmptyString(root.version, 'interpretation result.version'),
    fields: requireArray(root.fields, 'interpretation result.fields').map((field, index) =>
      decodeFieldResultDto(field, `interpretation result.fields[${index}]`),
    ),
    ...(root.issues === undefined
      ? {}
      : {
          issues: requireArray(root.issues, 'interpretation result.issues').map((issue, index) =>
            decodeIssueDto(issue, `interpretation result.issues[${index}]`),
          ),
        }),
  };
}

function decodeFieldResultDto(value: unknown, label: string): InterpretationFieldResultV1Dto {
  const record = requireRecord(value, label);
  requireExactKeys(record, new Set(['key', 'interpretation']));

  return {
    key: requireNonEmptyString(record.key, `${label}.key`),
    interpretation: decodeInterpretationDto(record.interpretation, `${label}.interpretation`),
  };
}

function decodeInterpretationDto(value: unknown, label: string): InterpretationInterpretationV1Dto {
  const record = requireRecord(value, label);
  const kind = requireString(record.kind, `${label}.kind`);

  switch (kind) {
    case 'resolved':
      requireExactKeys(record, new Set(['kind', 'candidate']));
      return {
        kind: 'resolved',
        candidate: decodeCandidateDto(record.candidate, `${label}.candidate`),
      };
    case 'ambiguous':
      requireExactKeys(record, new Set(['kind', 'candidates']));
      return {
        kind: 'ambiguous',
        candidates: requireArray(record.candidates, `${label}.candidates`).map((candidate, index) =>
          decodeCandidateDto(candidate, `${label}.candidates[${index}]`),
        ),
      };
    case 'missing':
      requireExactKeys(record, new Set(['kind']));
      return {
        kind: 'missing',
      };
    default:
      throw new SchemaGuidedInterpretationJsonError('Unknown interpretation kind.');
  }
}

function decodeCandidateDto(value: unknown, label: string): InterpretationFieldCandidateV1Dto {
  const record = requireRecord(value, label);
  requireExactKeys(record, new Set(['value', 'confidence']), new Set(['rationale']));

  return {
    value: decodeStructuredValueDto(record.value, `${label}.value`),
    confidence: requireConfidence(record.confidence, `${label}.confidence`),
    ...(record.rationale !== undefined ? { rationale: requireString(record.rationale, `${label}.rationale`) } : {}),
  };
}

function decodeStructuredValueDto(value: unknown, label: string): InterpretationFieldCandidateV1Dto['value'] {
  const record = requireRecord(value, label);
  requireExactKeys(record, new Set(['type', 'value']));
  const type = requireString(record.type, `${label}.type`);

  switch (type) {
    case 'text':
      return {
        type: 'text',
        value: requireString(record.value, `${label}.value`),
      };
    case 'decimal':
      return {
        type: 'decimal',
        value: requireString(record.value, `${label}.value`),
      };
    case 'date':
      return {
        type: 'date',
        value: requireString(record.value, `${label}.value`),
      };
    case 'enum':
      return {
        type: 'enum',
        value: requireString(record.value, `${label}.value`),
      };
    case 'boolean':
      return {
        type: 'boolean',
        value: requireBoolean(record.value, `${label}.value`),
      };
    case 'integer':
      return {
        type: 'integer',
        value: requireInteger(record.value, `${label}.value`),
      };
    default:
      throw new SchemaGuidedInterpretationJsonError('Unknown interpretation value type.');
  }
}

function decodeIssueDto(value: unknown, label: string): InterpretationIssueV1Dto {
  const record = requireRecord(value, label);
  requireExactKeys(record, new Set(['code', 'message']), new Set(['level', 'fieldKey']));

  return {
    code: requireNonEmptyString(record.code, `${label}.code`),
    message: requireNonEmptyString(record.message, `${label}.message`),
    ...(record.level !== undefined ? { level: requireString(record.level, `${label}.level`) as InterpretationIssueV1Dto['level'] } : {}),
    ...(record.fieldKey !== undefined ? { fieldKey: requireNonEmptyString(record.fieldKey, `${label}.fieldKey`) } : {}),
  };
}

function decodeIssueLevel(value: unknown): 'warning' | 'error' {
  switch (value) {
    case undefined:
    case 'WARNING':
    case 'warning':
      return 'warning';
    case 'ERROR':
    case 'error':
      return 'error';
    default:
      throw new SchemaGuidedInterpretationJsonError('Unknown interpretation issue level.');
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  throw new SchemaGuidedInterpretationJsonError(`${label} must be an object.`);
}

function requireString(value: unknown, label: string): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new SchemaGuidedInterpretationJsonError(`${label} must be a string.`);
}

function requireNonEmptyString(value: unknown, label: string): string {
  const text = requireString(value, label);
  if (text.trim()) {
    return text;
  }

  throw new SchemaGuidedInterpretationJsonError(`${label} must not be empty.`);
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  throw new SchemaGuidedInterpretationJsonError(`${label} must be a boolean.`);
}

function requireInteger(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  throw new SchemaGuidedInterpretationJsonError(`${label} must be an integer.`);
}

function requireConfidence(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SchemaGuidedInterpretationJsonError(`${label} must be a number.`);
  }
  if (value < 0 || value > 1) {
    throw new SchemaGuidedInterpretationJsonError(`${label} must be between 0 and 1.`);
  }
  return value;
}

function requireArray(value: unknown, label: string): ReadonlyArray<unknown> {
  if (Array.isArray(value)) {
    return value;
  }

  throw new SchemaGuidedInterpretationJsonError(`${label} must be an array.`);
}

function requireExactKeys(
  value: Record<string, unknown>,
  required: ReadonlySet<string>,
  optional: ReadonlySet<string> = new Set<string>(),
): void {
  const allowed = new Set<string>([...required, ...optional]);
  const keys = Object.keys(value);

  for (const key of required) {
    if (!(key in value)) {
      throw new SchemaGuidedInterpretationJsonError(`Missing required interpretation property ${key}.`);
    }
  }

  for (const key of keys) {
    if (!allowed.has(key)) {
      throw new SchemaGuidedInterpretationJsonError(`Unknown interpretation property ${key}.`);
    }
  }
}

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new SchemaGuidedInterpretationJsonError('Invalid interpretation JSON.');
  }
}
