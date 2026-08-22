export interface ProcessingPreparer {
  prepare(): Promise<void>;
  cancel(): void;
}
