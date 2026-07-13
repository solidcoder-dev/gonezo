import { describe, expect, it } from 'vitest';
import { MovementEntryInterpretationContextFactory } from './movementEntryInterpretationContextFactory';

describe('MovementEntryInterpretationContextFactory', () => {
  it('normalizes the account currency before passing it to the generic context', () => {
    const context = new MovementEntryInterpretationContextFactory().create({
      currentDate: '2026-07-15',
      timeZone: 'Europe/London',
      inputLanguage: 'es',
      locale: 'en-GB',
      currency: ' eur ',
    });

    expect(context.entries).toEqual([
      {
        key: 'currentDate',
        value: {
          type: 'date',
          value: '2026-07-15',
        },
      },
      {
        key: 'timeZone',
        value: {
          type: 'text',
          value: 'Europe/London',
        },
      },
      {
        key: 'inputLanguage',
        value: {
          type: 'text',
          value: 'es',
        },
      },
      {
        key: 'locale',
        value: {
          type: 'text',
          value: 'en-GB',
        },
      },
      {
        key: 'currency',
        value: {
          type: 'text',
          value: 'EUR',
        },
      },
    ]);
  });

  it('rejects blank currencies with a stable invalid_input error', () => {
    const create = () => new MovementEntryInterpretationContextFactory().create({
      currentDate: '2026-07-15',
      timeZone: 'Europe/London',
      inputLanguage: 'es',
      locale: 'en-GB',
      currency: '   ',
    });

    try {
      create();
      throw new Error('Expected the context factory to reject blank account currencies.');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'invalid_input',
        message: 'Account currency must be a three-letter ISO currency code.',
        recoverable: false,
      });
    }
  });

  it('rejects currencies that are not three letters long', () => {
    const create = () => new MovementEntryInterpretationContextFactory().create({
      currentDate: '2026-07-15',
      timeZone: 'Europe/London',
      inputLanguage: 'es',
      locale: 'en-GB',
      currency: 'EURO',
    });

    expect(create).toThrow('Account currency must be a three-letter ISO currency code.');
  });
});
