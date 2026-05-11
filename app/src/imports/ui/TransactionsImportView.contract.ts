import type { FormEvent } from 'react';
import type { ImportFailureSummaryItem, ImportRowResult } from '../domain/importFailureSummary';
import type {
  TransactionsImportDuplicatePolicy,
  TransactionsImportResult,
  TransactionsImportSource,
} from '../domain/transactionsImport.types';

export type TransactionsImportViewRequired = {
  state: {
    accountsCount: number;
    fileName: string;
    result: TransactionsImportResult | null;
    importSource: TransactionsImportSource;
    policy: {
      createMissingAccounts: boolean;
      createMissingCategories: boolean;
      createMissingTags: boolean;
      duplicatePolicy: TransactionsImportDuplicatePolicy;
    };
    failedRows: ImportRowResult[];
    failureSummary: ImportFailureSummaryItem[];
    accountNotFoundFailures: number;
    duplicateRowsCount: number;
  };
  status: {
    submitPhase: 'idle' | 'submitting' | 'succeeded' | 'failed';
    error: string;
  };
};

export type TransactionsImportViewProvided = {
  commands: {
    setFile: (file: File | null) => void;
    setCreateMissingAccounts: (value: boolean) => void;
    setCreateMissingCategories: (value: boolean) => void;
    setCreateMissingTags: (value: boolean) => void;
    setDuplicatePolicy: (value: TransactionsImportDuplicatePolicy) => void;
    setUseMobillsImport: (value: boolean) => void;
    submit: (event: FormEvent) => Promise<void>;
  };
};

export type TransactionsImportViewProps = {
  required: TransactionsImportViewRequired;
  provided: TransactionsImportViewProvided;
};
