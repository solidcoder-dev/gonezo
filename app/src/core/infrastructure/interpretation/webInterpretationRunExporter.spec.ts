import { describe, expect, it } from 'vitest';
import { WebInterpretationRunExporter } from './webInterpretationRunExporter';

describe('WebInterpretationRunExporter', () => {
  it('returns a stable export unavailable failure', async () => {
    const exporter = new WebInterpretationRunExporter();

    await expect(exporter.exportRun('11111111-1111-1111-1111-111111111111')).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'export-unavailable',
        message: 'Diagnostic export is only available on Android right now.',
        recoverable: false,
      },
    });
  });
});
