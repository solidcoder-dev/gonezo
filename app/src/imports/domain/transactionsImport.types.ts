export type TransactionsImportDuplicatePolicy = 'skip' | 'fail' | 'import_anyway';

export type TransactionsImportPolicyInput = {
  createMissingAccounts?: boolean;
  createMissingCategories?: boolean;
  createMissingTags?: boolean;
  duplicatePolicy?: TransactionsImportDuplicatePolicy;
};

export type TransactionsImportRequest = {
  fileBase64: string;
  policy?: TransactionsImportPolicyInput;
};

export type TransactionsImportRowResult = {
  sourceLine: number;
  status: 'imported' | 'failed' | 'skipped';
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export type TransactionsImportResult = {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  rows: TransactionsImportRowResult[];
};
