import { WebPlugin } from '@capacitor/core';
import type {
  SchemaGuidedInterpretationFailure,
  SchemaGuidedInterpretationOutcome,
  SchemaGuidedInterpretationPlugin,
  SchemaGuidedInterpretationPluginRequest,
} from './schemaGuidedInterpretationPlugin';

function unavailableFailure(): SchemaGuidedInterpretationFailure {
  return {
    code: 'model_unavailable',
    recoverable: false,
    message: 'Local schema-guided interpretation is only available on Android right now.',
  };
}

export class SchemaGuidedInterpretationPluginWeb extends WebPlugin implements SchemaGuidedInterpretationPlugin {
  async interpret(request: SchemaGuidedInterpretationPluginRequest): Promise<SchemaGuidedInterpretationOutcome> {
    void request;
    return {
      kind: 'failure',
      failure: unavailableFailure(),
    };
  }

  async cancel(requestId: string): Promise<void> {
    void requestId;
  }
}
