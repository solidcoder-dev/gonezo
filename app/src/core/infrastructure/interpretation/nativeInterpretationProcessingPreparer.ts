import { SchemaGuidedInterpretationPlugin } from './schemaGuidedInterpretationPlugin';
import type { ProcessingPreparer } from '../processing/processingPreparer';

export class NativeInterpretationProcessingPreparer implements ProcessingPreparer {
  prepare(): Promise<void> {
    return SchemaGuidedInterpretationPlugin.prepare();
  }

  cancel(): void {
    void SchemaGuidedInterpretationPlugin.cancelPreparation();
  }
}
