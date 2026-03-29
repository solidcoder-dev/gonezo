import type { FormEvent } from 'react';
import type { ImportFailureSummaryItem, ImportRowResult } from '../domain/importFailureSummary';
import type { TransactionsImportDuplicatePolicy, TransactionsImportResult } from '../domain/transactionsImport.types';

export type TransactionsImportViewRequired = {
  accountsCount: number;
  isSubmitting: boolean;
  fileName: string;
  error: string;
  result: TransactionsImportResult | null;
  createMissingAccounts: boolean;
  createMissingCategories: boolean;
  createMissingTags: boolean;
  duplicatePolicy: TransactionsImportDuplicatePolicy;
  failedRows: ImportRowResult[];
  failureSummary: ImportFailureSummaryItem[];
  accountNotFoundFailures: number;
  duplicateRowsCount: number;
};

export type TransactionsImportViewProvided = {
  setFile: (file: File | null) => void;
  setCreateMissingAccounts: (value: boolean) => void;
  setCreateMissingCategories: (value: boolean) => void;
  setCreateMissingTags: (value: boolean) => void;
  setDuplicatePolicy: (value: TransactionsImportDuplicatePolicy) => void;
  submit: (event: FormEvent) => Promise<void>;
};

export type TransactionsImportViewProps = {
  required: TransactionsImportViewRequired;
  provided: TransactionsImportViewProvided;
};
