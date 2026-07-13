import { registerPlugin } from '@capacitor/core';
import type * as InterpretationContract from '../../application/interpretation/schemaGuidedInterpretationContract';
import {
  SchemaGuidedInterpretationJsonCodec,
  SchemaGuidedInterpretationJsonError,
} from './schemaGuidedInterpretationJsonCodec';

export type {
  InterpretationAllowedValue,
  InterpretationConfidence,
  InterpretationContext,
  InterpretationContextEntry,
  InterpretationContractVersion,
  InterpretationFieldCandidate,
  InterpretationFieldInterpretation,
  InterpretationFieldResult,
  InterpretationFieldSpec,
  InterpretationInputSource,
  InterpretationIssue,
  InterpretationResult,
  InterpretationSpec,
  InterpretationValueType,
  SchemaGuidedInterpretationFailure,
  SchemaGuidedInterpretationFailureCode,
  SchemaGuidedInterpretationOutcome,
  SchemaGuidedInterpretationRequest,
} from '../../application/interpretation/schemaGuidedInterpretationContract';

export type SchemaGuidedInterpretationPluginRequest = {
  runId: string;
  requestId: string;
  interpretationRequest: Omit<InterpretationContract.SchemaGuidedInterpretationRequest, 'requestId'>;
};

export interface SchemaGuidedInterpretationPlugin {
  interpret(request: SchemaGuidedInterpretationPluginRequest): Promise<InterpretationContract.SchemaGuidedInterpretationOutcome>;
  cancel(requestId: string): Promise<void>;
}

const SchemaGuidedInterpretationCapacitorPlugin = registerPlugin<SchemaGuidedInterpretationPlugin>(
  'SchemaGuidedInterpretationPlugin',
  {
    web: () => import('./schemaGuidedInterpretationPluginWeb').then((module) => new module.SchemaGuidedInterpretationPluginWeb()),
  },
);

const jsonCodec = new SchemaGuidedInterpretationJsonCodec();

export const SchemaGuidedInterpretationPlugin = {
  async interpret(request: SchemaGuidedInterpretationPluginRequest): Promise<InterpretationContract.SchemaGuidedInterpretationOutcome> {
    let requestJson: string;
    try {
      requestJson = jsonCodec.encodeRequest(request.interpretationRequest);
    } catch (error) {
      return {
        kind: 'failure',
        failure: {
          code: 'invalid_request',
          recoverable: false,
          message: technicalMessageOf(error, 'Voice interpretation request is incompatible.'),
        },
      };
    }

    try {
      const response = await SchemaGuidedInterpretationCapacitorPlugin.interpret({
        runId: request.runId,
        requestId: request.requestId,
        requestJson,
      } as never) as {
        kind: 'success' | 'failure';
        resultJson?: string;
        failure?: InterpretationContract.SchemaGuidedInterpretationFailure;
      };

      if (response.kind === 'success' && typeof response.resultJson === 'string') {
        try {
          return {
            kind: 'success',
            result: jsonCodec.decodeResult(response.resultJson),
          };
        } catch (error) {
          return {
            kind: 'failure',
            failure: {
              code: 'malformed_output',
              recoverable: false,
              message: technicalMessageOf(error, 'Voice interpretation result is incompatible.'),
            },
          };
        }
      }

      if (response.kind === 'success') {
        return {
          kind: 'failure',
          failure: {
            code: 'malformed_output',
            recoverable: false,
            message: 'Voice interpretation result is incompatible.',
          },
        };
      }

      return {
        kind: 'failure',
        failure: response.failure ?? {
          code: 'inference_failed',
          recoverable: true,
        },
      };
    } catch (error) {
      const nativeError = error as { code?: string; message?: string; recoverable?: boolean };
      const code = nativeError.code && nativeError.code in interpretationFailureCodeMap
        ? nativeError.code as InterpretationContract.SchemaGuidedInterpretationFailureCode
        : 'inference_failed';
      return {
        kind: 'failure',
        failure: {
          code,
          recoverable: nativeError.recoverable ?? true,
          message: nativeError.message?.trim() || 'Schema-guided interpretation failed.',
        },
      };
    }
  },

  cancel(requestId: string): Promise<void> {
    return SchemaGuidedInterpretationCapacitorPlugin.cancel({ requestId } as never);
  },
};

const interpretationFailureCodeMap: Record<InterpretationContract.SchemaGuidedInterpretationFailureCode, true> = {
  'artifact-storage-failed': true,
  'contract_version_unsupported': true,
  'invalid_request': true,
  'malformed_output': true,
  'model_unavailable': true,
  'model_corrupt': true,
  'unsupported_device': true,
  'inference_failed': true,
  'cancelled': true,
};

function technicalMessageOf(error: unknown, fallbackMessage: string): string {
  if (error instanceof SchemaGuidedInterpretationJsonError) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message.trim() || fallbackMessage;
  }
  return fallbackMessage;
}
