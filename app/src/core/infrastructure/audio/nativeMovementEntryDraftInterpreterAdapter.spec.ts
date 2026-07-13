import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  InterpretMovementEntryDraftOutcome,
  InterpretMovementEntryDraftRequest,
} from '../../../transactions/application/MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import {
  GONEZO_MOVEMENT_ENTRY_SPEC_ID,
  GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
  MOVEMENT_ENTRY_INTERPRETATION_FIELDS,
} from '../../../transactions/application/MovementVoiceEntry/movementEntryInterpretationContract';
import type { SchemaGuidedInterpretationOutcome } from '../../application/interpretation/schemaGuidedInterpretationContract';

const interpret = vi.fn();
const cancel = vi.fn();
const isNativeRuntime = vi.fn();
const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);

vi.mock('../interpretation/schemaGuidedInterpretationPlugin', () => ({
  SchemaGuidedInterpretationPlugin: {
    interpret,
    cancel,
  },
}));

vi.mock('../runtimeAdapterSupport', () => ({
  isNativeRuntime,
}));

describe('NativeMovementEntryDraftInterpreterAdapter', () => {
  beforeEach(() => {
    vi.resetModules();
    interpret.mockReset();
    cancel.mockReset();
    isNativeRuntime.mockReset();
    debug.mockClear();
  });

  it('returns model unavailable when the runtime is not native', async () => {
    isNativeRuntime.mockReturnValue(false);

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await expect(adapter.interpret(request())).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'model_unavailable',
        recoverable: false,
      },
    });
    expect(interpret).not.toHaveBeenCalled();
  });

  it('forwards native bridge results', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockResolvedValue({
      kind: 'success',
      result: {
        specId: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
        specVersion: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
        fields: [
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type,
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: { type: 'enum', value: 'expense' },
                confidence: 0.9,
              },
            },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount,
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: { type: 'decimal', value: '34.80' },
                confidence: 0.9,
              },
            },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn,
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: { type: 'date', value: '2026-07-14' },
                confidence: 0.9,
              },
            },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.note,
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: { type: 'text', value: 'Gasté 34,80 euros ayer en Comida' },
                confidence: 0.9,
              },
            },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.categoryId,
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: { type: 'enum', value: 'cat-food' },
                confidence: 0.9,
              },
            },
          },
        ],
        issues: [],
      },
    } satisfies SchemaGuidedInterpretationOutcome);

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await expect(adapter.interpret(request())).resolves.toEqual({
      kind: 'success',
      draft: {
        type: 'expense',
        amount: '34.80',
        occurredOn: '2026-07-14',
        note: 'Gasté 34,80 euros ayer en Comida',
        categoryId: 'cat-food',
        issues: [],
      },
    } satisfies InterpretMovementEntryDraftOutcome);
    expect(interpret).toHaveBeenCalledWith(expect.objectContaining({
      runId: '11111111-1111-1111-1111-111111111111',
      requestId: expect.any(String),
      interpretationRequest: expect.objectContaining({
        contractVersion: '1',
        inputSource: {
          kind: 'transcript',
          text: 'Gasté 34,80 euros ayer en Comida',
        },
        interpretationSpec: expect.objectContaining({
          id: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
          version: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
          fields: expect.arrayContaining([
            expect.objectContaining({
              key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.categoryId,
              allowedValues: expect.arrayContaining([
                expect.objectContaining({
                  stableValue: 'cat-food',
                  label: 'Comida',
                }),
              ]),
            }),
          ]),
        }),
        interpretationContext: expect.objectContaining({
          entries: expect.arrayContaining([
            expect.objectContaining({
              key: 'currentDate',
              value: expect.objectContaining({ type: 'date', value: '2026-07-15' }),
            }),
            expect.objectContaining({
              key: 'timeZone',
              value: expect.objectContaining({ type: 'text', value: 'Atlantic/Canary' }),
            }),
            expect.objectContaining({
              key: 'locale',
              value: expect.objectContaining({ type: 'text', value: 'es-ES' }),
            }),
            expect.objectContaining({
              key: 'currency',
              value: expect.objectContaining({ type: 'text', value: 'EUR' }),
            }),
          ]),
        }),
      }),
    }));
  });

  it('passes the selected account currency into the interpretation context factory', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockResolvedValue({
      kind: 'success',
      result: {
        specId: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
        specVersion: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
        fields: [
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount,
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: { type: 'decimal', value: '1' },
                confidence: 0.9,
              },
            },
          },
        ],
        issues: [],
      },
    } satisfies SchemaGuidedInterpretationOutcome);

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await adapter.interpret({
      ...request(),
      currency: ' eur ',
    });

    expect(interpret).toHaveBeenCalledWith(expect.objectContaining({
      interpretationRequest: expect.objectContaining({
        interpretationContext: expect.objectContaining({
          entries: expect.arrayContaining([
            expect.objectContaining({
              key: 'currency',
              value: expect.objectContaining({ type: 'text', value: 'EUR' }),
            }),
          ]),
        }),
      }),
    }));
    expect(debug).not.toHaveBeenCalled();
  });

  it('returns no usable interpretation when the model only produces missing or ambiguous fields', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockResolvedValue({
      kind: 'success',
      result: {
        specId: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
        specVersion: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
        fields: [
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.type,
            interpretation: { kind: 'missing' },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.amount,
            interpretation: { kind: 'missing' },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.occurredOn,
            interpretation: { kind: 'missing' },
          },
          {
            key: MOVEMENT_ENTRY_INTERPRETATION_FIELDS.note,
            interpretation: {
              kind: 'ambiguous',
              candidates: [
                {
                  value: { type: 'text', value: 'Fuel' },
                  confidence: 0.5,
                },
                {
                  value: { type: 'text', value: 'Gasoline' },
                  confidence: 0.4,
                },
              ],
            },
          },
        ],
        issues: [],
      },
    } satisfies SchemaGuidedInterpretationOutcome);

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await expect(adapter.interpret(request())).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'no_usable_interpretation',
        recoverable: true,
        technicalMessage: 'The model did not return any usable fields.',
      },
    } satisfies InterpretMovementEntryDraftOutcome);
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({
      runId: '11111111-1111-1111-1111-111111111111',
      code: 'no_usable_interpretation',
    }));
  });

  it('rejects invalid account currencies without losing the diagnostic context', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockResolvedValue({
      kind: 'success',
      result: {
        specId: GONEZO_MOVEMENT_ENTRY_SPEC_ID,
        specVersion: GONEZO_MOVEMENT_ENTRY_SPEC_VERSION,
        fields: [],
        issues: [],
      },
    } satisfies SchemaGuidedInterpretationOutcome);

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await expect(adapter.interpret({
      ...request(),
      currency: '  ',
    })).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'invalid_input',
        recoverable: false,
        technicalMessage: 'Account currency must be a three-letter ISO currency code.',
      },
    });

    expect(interpret).not.toHaveBeenCalled();
    expect(debug).toHaveBeenCalledWith(expect.objectContaining({
      runId: '11111111-1111-1111-1111-111111111111',
      code: 'invalid_input',
      technicalMessage: 'Account currency must be a three-letter ISO currency code.',
    }));
  });

  it('maps native bridge failures to stable diagnostics instead of swallowing them silently', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockRejectedValue({
      code: 'invalid_input',
      message: 'Account currency must be a three-letter ISO currency code.',
      recoverable: false,
    });

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await expect(adapter.interpret(request())).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'invalid_input',
        recoverable: false,
        technicalMessage: 'Account currency must be a three-letter ISO currency code.',
      },
    });

    expect(debug).toHaveBeenCalledWith(expect.objectContaining({
      runId: '11111111-1111-1111-1111-111111111111',
      code: 'invalid_input',
      technicalMessage: 'Account currency must be a three-letter ISO currency code.',
    }));
  });

  it.each([
    ['model_unavailable', 'model_unavailable'],
    ['model_corrupt', 'model_corrupt'],
    ['unsupported_device', 'unsupported_device'],
    ['inference_failed', 'inference_failed'],
    ['malformed_output', 'output_invalid'],
  ] as const)('preserves native code %s', async (nativeCode, expectedCode) => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockResolvedValue({
      kind: 'failure',
      failure: {
        code: nativeCode,
        message: 'Native failure.',
        recoverable: nativeCode !== 'malformed_output',
      },
    });

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    await expect(adapter.interpret(request())).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: expectedCode,
        recoverable: nativeCode !== 'malformed_output',
        technicalMessage: 'Native failure.',
      },
    });
  });

  it('cancels the active request idempotently', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockImplementation(async () => await new Promise<never>(() => undefined));

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    void adapter.interpret(request());
    await adapter.cancel();
    await adapter.cancel();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith(expect.any(String));
  });

  it('propagates cancellation failures and clears the request id in finally', async () => {
    isNativeRuntime.mockReturnValue(true);
    interpret.mockImplementation(async () => await new Promise<never>(() => undefined));
    cancel.mockRejectedValue({
      code: 'interpretation-cancellation-failed',
      message: 'Schema-guided interpretation cancellation timed out.',
      recoverable: true,
    });

    const { NativeMovementEntryDraftInterpreterAdapter } = await import('./nativeMovementEntryDraftInterpreterAdapter');
    const adapter = new NativeMovementEntryDraftInterpreterAdapter();

    void adapter.interpret(request());
    await expect(adapter.cancel()).rejects.toEqual({
      code: 'interpretation-cancellation-failed',
      message: 'Schema-guided interpretation cancellation timed out.',
      recoverable: true,
    });

    await adapter.cancel();
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

function request(): InterpretMovementEntryDraftRequest {
  return {
    runId: '11111111-1111-1111-1111-111111111111',
    transcript: 'Gasté 34,80 euros ayer en Comida',
    inputLanguage: 'es',
    currentDate: '2026-07-15',
    timeZone: 'Atlantic/Canary',
    locale: 'es-ES',
    currency: 'EUR',
    categories: [{ id: 'cat-food', label: 'Comida' }],
  };
}
