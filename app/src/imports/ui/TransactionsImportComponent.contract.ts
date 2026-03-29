import type { TransactionsImportRequest, TransactionsImportResult } from '../domain/transactionsImport.types';

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
