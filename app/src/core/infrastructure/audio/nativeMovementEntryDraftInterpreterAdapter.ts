import {
  SchemaGuidedInterpretationPlugin,
} from '../interpretation/schemaGuidedInterpretationPlugin';
import { SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION } from '../interpretation/schemaGuidedInterpretationJsonCodec';
import { isNativeRuntime } from '../runtimeAdapterSupport';
import type {
  InterpretMovementEntryDraftOutcome,
  InterpretMovementEntryDraftRequest,
  MovementEntryDraftInterpreterPort,
} from '../../../transactions/application/MovementVoiceEntry/MovementEntryDraftInterpreterPort';
import { DefaultMovementEntryInterpretationUsabilityPolicy } from '../../../transactions/application/MovementVoiceEntry/MovementEntryInterpretationUsabilityPolicy';
import { MovementEntryInterpretationContextFactory } from '../../../transactions/application/MovementVoiceEntry/movementEntryInterpretationContextFactory';
import { MovementEntryInterpretationSpecFactory } from '../../../transactions/application/MovementVoiceEntry/movementEntryInterpretationSpecFactory';
import { InterpretationResultToMovementEntryDraftMapper } from '../../../transactions/application/MovementVoiceEntry/interpretationResultToMovementEntryDraftMapper';

export class NativeMovementEntryDraftInterpreterAdapter implements MovementEntryDraftInterpreterPort {
  private readonly specFactory = new MovementEntryInterpretationSpecFactory();
  private readonly contextFactory = new MovementEntryInterpretationContextFactory();
  private readonly usabilityPolicy = new DefaultMovementEntryInterpretationUsabilityPolicy();
  private readonly resultMapper = new InterpretationResultToMovementEntryDraftMapper();
  private activeRequestId: string | null = null;

  async interpret(request: InterpretMovementEntryDraftRequest): Promise<InterpretMovementEntryDraftOutcome> {
    if (!isNativeRuntime()) {
      return {
        kind: 'failure',
        failure: {
          code: 'model_unavailable',
          recoverable: false,
        },
      };
    }

    try {
      const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      this.activeRequestId = requestId;
      const result = await SchemaGuidedInterpretationPlugin.interpret({
        runId: request.runId,
        requestId,
        interpretationRequest: {
          inputSource: {
            kind: 'transcript',
            text: request.transcript,
          },
          inputLanguage: request.inputLanguage,
          interpretationSpec: this.specFactory.create(request.categories),
          interpretationContext: this.contextFactory.create({
            currentDate: request.currentDate,
            timeZone: request.timeZone,
            inputLanguage: request.inputLanguage,
            locale: request.locale,
            currency: request.currency,
          }),
          contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
        },
      });

      if (result.kind === 'failure') {
        logInterpretationDiagnostic(
          request.runId,
          result.failure.code,
          result.failure.message ?? 'Movement interpretation failed.',
        );
        return {
          kind: 'failure',
          failure: mapFailure(result.failure.code, result.failure.recoverable, result.failure.message),
        };
      }

      if (this.usabilityPolicy.evaluate(result.result) === 'NO_USABLE_FIELDS') {
        logInterpretationDiagnostic(
          request.runId,
          'no_usable_interpretation',
          'The model did not return any usable fields.',
        );
        return {
          kind: 'failure',
          failure: {
            code: 'no_usable_interpretation',
            recoverable: true,
            technicalMessage: 'The model did not return any usable fields.',
          },
        };
      }

      return {
        kind: 'success',
        draft: this.resultMapper.map(result.result),
      };
    } catch (error) {
      const failure = mapThrownFailure(error);
      logInterpretationDiagnostic(request.runId, failure.code, technicalMessageOf(error));
      return {
        kind: 'failure',
        failure,
      };
    } finally {
      this.activeRequestId = null;
    }
  }

  async cancel(): Promise<void> {
    const requestId = this.activeRequestId;
    if (!requestId) {
      return;
    }

    try {
      await SchemaGuidedInterpretationPlugin.cancel(requestId);
    } finally {
      this.activeRequestId = null;
    }
  }
}

const KNOWN_FAILURE_CODES = new Set([
  'artifact-storage-failed',
  'cancelled',
  'contract_version_unsupported',
  'invalid_input',
  'invalid_request',
  'malformed_output',
  'model_corrupt',
  'model_unavailable',
  'no_usable_interpretation',
  'unsupported_device',
  'inference_failed',
]);

function mapFailure(
  code: string,
  recoverable: boolean,
  technicalMessage?: string,
): Extract<InterpretMovementEntryDraftOutcome, { kind: 'failure' }>['failure'] {
  switch (code) {
    case 'cancelled':
      return {
        code: 'interpretation_cancelled',
        recoverable,
        technicalMessage,
      };
    case 'model_unavailable':
      return {
        code: 'model_unavailable',
        recoverable,
        technicalMessage,
      };
    case 'model_corrupt':
      return {
        code: 'model_corrupt',
        recoverable,
        technicalMessage,
      };
    case 'unsupported_device':
      return {
        code: 'unsupported_device',
        recoverable,
        technicalMessage,
      };
    case 'inference_failed':
      return {
        code: 'inference_failed',
        recoverable,
        technicalMessage,
      };
    case 'contract_version_unsupported':
      return {
        code: 'schema_incompatible',
        recoverable: false,
        technicalMessage,
      };
    case 'malformed_output':
      return {
        code: 'output_invalid',
        recoverable: false,
        technicalMessage,
      };
    case 'invalid_request':
    case 'invalid_input':
      return {
        code: 'invalid_input',
        recoverable: false,
        technicalMessage,
      };
    case 'artifact-storage-failed':
      return {
        code: 'artifact-storage-failed',
        recoverable: true,
        technicalMessage,
      };
    default:
      return {
        code: 'inference_failed',
        recoverable,
        technicalMessage,
      };
  }
}

function mapThrownFailure(error: unknown): Extract<InterpretMovementEntryDraftOutcome, { kind: 'failure' }>['failure'] {
  const nativeError = error as { code?: string; recoverable?: boolean };
  if (typeof nativeError?.code === 'string' && KNOWN_FAILURE_CODES.has(nativeError.code)) {
    return mapFailure(nativeError.code, nativeError.recoverable ?? false, technicalMessageOf(error));
  }
  return {
    code: 'inference_failed',
    recoverable: true,
    technicalMessage: technicalMessageOf(error),
  };
}

function technicalMessageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Movement interpretation failed.';
}

function logInterpretationDiagnostic(runId: string, code: string, technicalMessage: string): void {
  if (import.meta.env.DEV) {
    console.debug({
      runId,
      code,
      technicalMessage,
    });
  }
}
