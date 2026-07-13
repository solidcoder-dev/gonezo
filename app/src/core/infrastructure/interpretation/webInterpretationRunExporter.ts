import type { InterpretationRunExporterPort, InterpretationRunExportOutcome } from '../../../transactions/application/MovementVoiceEntry/InterpretationRunExporterPort';

export class WebInterpretationRunExporter implements InterpretationRunExporterPort {
  async exportRun(runId: string): Promise<InterpretationRunExportOutcome> {
    void runId;
    return {
      kind: 'failure',
      failure: {
        code: 'export-unavailable',
        message: 'Diagnostic export is only available on Android right now.',
        recoverable: false,
      },
    };
  }
}
