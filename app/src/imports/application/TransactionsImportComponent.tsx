import type { TransactionsImportRequest, TransactionsImportResult } from '../domain/transactionsImport.types';
import { useTransactionsImportController } from './useTransactionsImportController';
import {
  TransactionsImportView,
  type TransactionsImportViewProvided,
  type TransactionsImportViewRequired,
} from '../ui/TransactionsImportView';

export type TransactionsImportComponentRequired = {
  accountsCount: number;
};

export type TransactionsImportComponentProvided = {
  submitImport: (input: TransactionsImportRequest) => Promise<TransactionsImportResult>;
  onCompleted?: (result: TransactionsImportResult) => void;
  onFailed?: (message: string) => void;
};

export type TransactionsImportComponentProps = {
  required: TransactionsImportComponentRequired;
  provided: TransactionsImportComponentProvided;
};

export function TransactionsImportComponent({ required, provided }: TransactionsImportComponentProps) {
  const workspace = useTransactionsImportController({
    port: {
      submitImport: provided.submitImport,
    },
    onCompleted: provided.onCompleted,
    onFailed: provided.onFailed,
  });

  const viewRequired: TransactionsImportViewRequired = {
    state: {
      accountsCount: required.accountsCount,
      fileName: workspace.state.fileName,
      result: workspace.state.result,
      importSource: workspace.state.importSource,
      policy: {
        createMissingAccounts: workspace.state.createMissingAccounts,
        createMissingCategories: workspace.state.createMissingCategories,
        createMissingTags: workspace.state.createMissingTags,
        duplicatePolicy: workspace.state.duplicatePolicy,
      },
      failedRows: workspace.state.failedRows,
      failureSummary: workspace.state.failureSummary,
      accountNotFoundFailures: workspace.state.accountNotFoundFailures,
      duplicateRowsCount: workspace.state.duplicateRowsCount,
    },
    status: {
      submitPhase: workspace.state.submitPhase,
      error: workspace.state.error,
    },
  };

  const viewProvided: TransactionsImportViewProvided = {
    commands: {
      setFile: workspace.actions.setFile,
      setCreateMissingAccounts: workspace.actions.setCreateMissingAccounts,
      setCreateMissingCategories: workspace.actions.setCreateMissingCategories,
      setCreateMissingTags: workspace.actions.setCreateMissingTags,
      setDuplicatePolicy: workspace.actions.setDuplicatePolicy,
      setUseMobillsImport: workspace.actions.setUseMobillsImport,
      submit: workspace.actions.submit,
    },
  };

  return <TransactionsImportView required={viewRequired} provided={viewProvided} />;
}
