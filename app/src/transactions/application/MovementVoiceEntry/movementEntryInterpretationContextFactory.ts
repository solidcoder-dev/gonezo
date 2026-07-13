import type {
  InterpretationContext,
  InterpretationContextEntry,
  InterpretationValueType,
} from '../../../core/application/interpretation/schemaGuidedInterpretationContract';

export type MovementEntryInterpretationContextInput = {
  currentDate: string;
  timeZone: string;
  inputLanguage: string;
  locale: string;
  currency: string;
};

export class MovementEntryInterpretationContextFactory {
  create(input: MovementEntryInterpretationContextInput): InterpretationContext {
    return {
      entries: [
        entry('currentDate', 'date', input.currentDate),
        entry('timeZone', 'text', input.timeZone),
        entry('inputLanguage', 'text', input.inputLanguage),
        entry('locale', 'text', input.locale),
        entry('currency', 'text', normalizeAccountCurrency(input.currency)),
      ],
    };
  }
}

function normalizeAccountCurrency(currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw {
      code: 'invalid_input',
      message: 'Account currency must be a three-letter ISO currency code.',
      recoverable: false,
    };
  }

  return normalizedCurrency;
}

function entry(
  key: string,
  type: InterpretationValueType,
  value: string,
): InterpretationContextEntry {
  return {
    key,
    value: {
      type,
      value,
    },
  };
}
