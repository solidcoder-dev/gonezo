import { registerPlugin } from '@capacitor/core';

export type InterpretationRunExportPluginRequest = {
  runId: string;
  suggestedFileName: string;
};

export type InterpretationRunExportPluginResult = {
  kind: 'success' | 'cancelled';
  fileName?: string;
};

export interface InterpretationRunExportPlugin {
  exportRun(request: InterpretationRunExportPluginRequest): Promise<InterpretationRunExportPluginResult>;
}

export const InterpretationRunExportPlugin = registerPlugin<InterpretationRunExportPlugin>('InterpretationRunExportPlugin', {
  web: () => import('./interpretationRunExportPluginWeb').then((module) => new module.InterpretationRunExportPluginWeb()),
});
