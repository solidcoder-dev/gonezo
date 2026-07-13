import { WebPlugin } from '@capacitor/core';
import type {
  InterpretationRunExportPlugin,
  InterpretationRunExportPluginRequest,
  InterpretationRunExportPluginResult,
} from './interpretationRunExportPlugin';

export class InterpretationRunExportPluginWeb extends WebPlugin implements InterpretationRunExportPlugin {
  async exportRun(request: InterpretationRunExportPluginRequest): Promise<InterpretationRunExportPluginResult> {
    void request;
    throw {
      code: 'export-unavailable',
      message: 'Diagnostic export is only available on Android right now.',
      recoverable: false,
    };
  }
}
