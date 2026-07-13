import type {
  InterpretationFieldCandidate,
  InterpretationFieldResult,
  InterpretationResult,
} from '../../../core/application/interpretation/schemaGuidedInterpretationContract';
import type {
  MovementEntryDraft,
  MovementEntryDraftField,
  MovementEntryDraftIssue,
  MovementEntryDraftIssueCode,
  MovementEntryDraftType,
} from './MovementEntryDraftInterpreterPort';
import {
  GONEZO_MOVEMENT_ENTRY_SPEC_ID,
  GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
  MOVEMENT_ENTRY_INTERPRETATION_FIELDS,
} from './movementEntryInterpretationContract';

type DraftFieldKey = typeof MOVEMENT_ENTRY_INTERPRETATION_FIELDS[keyof typeof MOVEMENT_ENTRY_INTERPRETATION_FIELDS];

const draftFields = new Set<DraftFieldKey>(Object.values(MOVEMENT_ENTRY_INTERPRETATION_FIELDS));

export class InterpretationResultToMovementEntryDraftMapper {
  private readonly minimumConfidence: number;

  constructor(minimumConfidence = 0.5) {
    if (minimumConfidence < 0 || minimumConfidence > 1) {
      throw new Error('minimum confidence must be between 0 and 1');
    }
    this.minimumConfidence = minimumConfidence;
  }

  map(result: InterpretationResult): MovementEntryDraft {
    if (result.specId !== GONEZO_MOVEMENT_ENTRY_SPEC_ID || result.specVersion !== GONEZO_MOVEMENT_ENTRY_SPEC_VERSION) {
      throw new Error('interpretation result schema does not match the movement entry contract');
    }

    const issues: MovementEntryDraftIssue[] = [];
    const fieldByKey = new Map(result.fields.map((field) => [field.key, field]));

    const type = this.mapType(fieldByKey.get(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type), issues);
    const amount = this.mapAmount(fieldByKey.get(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount), issues);
    const occurredOn = this.mapDate(fieldByKey.get(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn), issues);
    const note = this.mapText(fieldByKey.get(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.note), issues);
    const categoryId = this.mapCategory(fieldByKey.get(MOVEMENT_ENTRY_INTERPRETATION_FIELDS.categoryId), issues);

    for (const issue of result.issues) {
      issues.push({
        field: issue.fieldKey ? toDraftField(issue.fieldKey) : undefined,
        code: 'output_incompatible',
      });
    }

    return {
      type,
      amount,
      occurredOn,
      note,
      categoryId,
      issues,
    };
  }

  private mapType(field: InterpretationFieldResult | undefined, issues: MovementEntryDraftIssue[]): MovementEntryDraftType | undefined {
    const candidate = this.interpretationOf(field, 'type', issues, false);
    if (!candidate) {
      return undefined;
    }
    if (candidate.confidence < this.minimumConfidence) {
      issues.push(issue('type', 'confidence_insufficient'));
      return undefined;
    }
    if (candidate.value.type !== 'enum') {
      issues.push(issue('type', 'value_invalid'));
      return undefined;
    }
    if (candidate.value.value === 'expense') {
      return 'expense';
    }
    if (candidate.value.value === 'income') {
      return 'income';
    }
    issues.push(issue('type', 'value_invalid'));
    return undefined;
  }

  private mapAmount(field: InterpretationFieldResult | undefined, issues: MovementEntryDraftIssue[]): string | undefined {
    const candidate = this.interpretationOf(field, 'amount', issues, false);
    if (!candidate) {
      return undefined;
    }
    if (candidate.confidence < this.minimumConfidence) {
      issues.push(issue('amount', 'confidence_insufficient'));
      return undefined;
    }
    if (candidate.value.type !== 'decimal') {
      issues.push(issue('amount', 'value_invalid'));
      return undefined;
    }
    const amount = String(candidate.value.value).trim();
    if (!amount || Number(amount) <= 0) {
      issues.push(issue('amount', 'value_invalid'));
      return undefined;
    }
    return amount;
  }

  private mapDate(field: InterpretationFieldResult | undefined, issues: MovementEntryDraftIssue[]): string | undefined {
    const candidate = this.interpretationOf(field, 'occurredOn', issues, true);
    if (!candidate) {
      return undefined;
    }
    if (candidate.confidence < this.minimumConfidence) {
      issues.push(issue('occurredOn', 'confidence_insufficient'));
      return undefined;
    }
    if (candidate.value.type !== 'date') {
      issues.push(issue('occurredOn', 'value_invalid'));
      return undefined;
    }
    return String(candidate.value.value);
  }

  private mapText(field: InterpretationFieldResult | undefined, issues: MovementEntryDraftIssue[]): string | undefined {
    const candidate = this.interpretationOf(field, 'note', issues, false);
    if (!candidate) {
      return undefined;
    }
    if (candidate.confidence < this.minimumConfidence) {
      issues.push(issue('note', 'confidence_insufficient'));
      return undefined;
    }
    if (candidate.value.type !== 'text') {
      issues.push(issue('note', 'value_invalid'));
      return undefined;
    }
    const note = String(candidate.value.value).trim();
    return note || undefined;
  }

  private mapCategory(field: InterpretationFieldResult | undefined, issues: MovementEntryDraftIssue[]): string | undefined {
    const candidate = this.interpretationOf(field, 'categoryId', issues, false);
    if (!candidate) {
      return undefined;
    }
    if (candidate.confidence < this.minimumConfidence) {
      issues.push(issue('categoryId', 'confidence_insufficient'));
      return undefined;
    }
    if (candidate.value.type !== 'enum') {
      issues.push(issue('categoryId', 'category_unavailable'));
      return undefined;
    }
    return String(candidate.value.value);
  }

  private interpretationOf(
    field: InterpretationFieldResult | undefined,
    key: DraftFieldKey,
    issues: MovementEntryDraftIssue[],
    required: boolean,
  ): InterpretationFieldCandidate | undefined {
    if (!field) {
      if (required) {
        issues.push(issue(key, 'field_missing'));
      }
      return undefined;
    }
    switch (field.interpretation.kind) {
      case 'resolved':
        return field.interpretation.candidate;
      case 'ambiguous':
        issues.push(issue(key, 'field_ambiguous'));
        return undefined;
      case 'missing':
        if (required) {
          issues.push(issue(key, 'field_missing'));
        }
        return undefined;
    }
  }
}

function issue(field: DraftFieldKey, code: MovementEntryDraftIssueCode): MovementEntryDraftIssue {
  return { field: fieldToDraft(field), code };
}

function fieldToDraft(field: DraftFieldKey): MovementEntryDraftField {
  return field;
}

function toDraftField(fieldKey: string): MovementEntryDraftField | undefined {
  return isDraftField(fieldKey) ? fieldKey : undefined;
}

function isDraftField(fieldKey: string): fieldKey is DraftFieldKey {
  return draftFields.has(fieldKey as DraftFieldKey);
}
