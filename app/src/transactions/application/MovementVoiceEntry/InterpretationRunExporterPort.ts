export type InterpretationRunExportOutcome =
  | {
      kind: 'success';
      fileName: string;
    }
  | {
      kind: 'cancelled';
    }
  | {
      kind: 'failure';
      failure: {
        code:
          | 'run-not-found'
          | 'export-failed'
          | 'export-unavailable';
        message: string;
        recoverable: boolean;
      };
    };

export interface InterpretationRunExporterPort {
  exportRun(runId: string): Promise<InterpretationRunExportOutcome>;
}
