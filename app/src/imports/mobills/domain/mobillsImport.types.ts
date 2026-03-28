export type MobillsDuplicatePolicy = 'skip' | 'fail' | 'import_anyway';

export type MobillsImportPolicyInput = {
  createMissingAccounts?: boolean;
  createMissingCategories?: boolean;
  createMissingTags?: boolean;
  duplicatePolicy?: MobillsDuplicatePolicy;
};

export type MobillsImportRowResult = {
  sourceLine: number;
  status: 'imported' | 'failed' | 'skipped';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type MobillsImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  rows: MobillsImportRowResult[];
};
