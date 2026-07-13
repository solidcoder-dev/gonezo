import type { InterpretationRunExporterPort, InterpretationRunExportOutcome } from '../../../transactions/application/MovementVoiceEntry/InterpretationRunExporterPort';
import { InterpretationRunExportPlugin } from './interpretationRunExportPlugin';

const EXPORT_FAILURE_CODES = new Set([
  'export-unavailable',
  'export-failed',
  'run-not-found',
]);

type InterpretationRunExportFailure = Extract<InterpretationRunExportOutcome, { kind: 'failure' }>['failure'];

type NativeExportError = {
  code?: string;
  message?: string;
  recoverable?: boolean;
};

export class NativeInterpretationRunExporter implements InterpretationRunExporterPort {
  async exportRun(runId: string): Promise<InterpretationRunExportOutcome> {
    const normalizedRunId = runId.trim();
    if (!normalizedRunId) {
      return {
        kind: 'failure',
        failure: {
          code: 'export-failed',
          message: 'Diagnostic export failed.',
          recoverable: false,
        },
      };
    }

    const suggestedFileName = `gonezo-voice-run-${normalizedRunId}.zip`;
    try {
      const result = await InterpretationRunExportPlugin.exportRun({
        runId: normalizedRunId,
        suggestedFileName,
      });
      if (result.kind === 'cancelled') {
        return {
          kind: 'cancelled',
        };
      }
      return {
        kind: 'success',
        fileName: result.fileName?.trim() || suggestedFileName,
      };
    } catch (error) {
      const failure = mapExportFailure(error);
      logExportDiagnostic(normalizedRunId, failure.code, technicalMessageOf(error));
      return {
        kind: 'failure',
        failure,
      };
    }
  }
}

function mapExportFailure(error: unknown): InterpretationRunExportFailure {
  const nativeError = error as NativeExportError;
  if (typeof nativeError?.code === 'string' && EXPORT_FAILURE_CODES.has(nativeError.code)) {
    return {
      code: nativeError.code as 'export-unavailable' | 'export-failed' | 'run-not-found',
      message: nativeError.message?.trim() || 'Diagnostic export failed.',
      recoverable: nativeError.code === 'export-failed',
    };
  }

  return {
    code: 'export-failed',
    message: nativeError.message?.trim() || 'Diagnostic export failed.',
    recoverable: true,
  };
}

function technicalMessageOf(error: unknown): string {
  if (typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string') {
    return (error as { message: string }).message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Diagnostic export failed.';
}

function logExportDiagnostic(runId: string, code: string, technicalMessage: string): void {
  if (import.meta.env.DEV) {
    console.debug({
      runId,
      code,
      technicalMessage,
    });
  }
}
