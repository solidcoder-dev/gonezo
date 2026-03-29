import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  normalizeImportErrorCode,
  summarizeImportFailures,
  type ImportRowResult,
} from '../domain/importFailureSummary';
import type {
  TransactionsImportDuplicatePolicy,
  TransactionsImportPolicyInput,
  TransactionsImportRequest,
  TransactionsImportResult,
} from '../domain/transactionsImport.types';
import { readImportFileAsBase64 } from '../infrastructure/readImportFileAsBase64';

export type TransactionsImportPort = {
  submitImport(input: TransactionsImportRequest): Promise<TransactionsImportResult>;
};

type UseTransactionsImportInput = {
  port: TransactionsImportPort;
  onCompleted?: (result: TransactionsImportResult) => void;
  onFailed?: (message: string) => void;
};

export function useTransactionsImportController({ port, onCompleted, onFailed }: UseTransactionsImportInput) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TransactionsImportResult | null>(null);
  const [createMissingAccounts, setCreateMissingAccounts] = useState(true);
  const [createMissingCategories, setCreateMissingCategories] = useState(true);
  const [createMissingTags, setCreateMissingTags] = useState(true);
  const [duplicatePolicy, setDuplicatePolicy] = useState<TransactionsImportDuplicatePolicy>('skip');

  const rows = useMemo(() => (result?.rows ?? []) as ImportRowResult[], [result]);
  const failedRows = useMemo(() => rows.filter((row) => row.status === 'failed'), [rows]);
  const failureSummary = useMemo(() => summarizeImportFailures(rows), [rows]);
  const accountNotFoundFailures = useMemo(
    () => failureSummary.find((item) => item.code === 'ACCOUNT_NOT_FOUND')?.count ?? 0,
    [failureSummary],
  );
  const duplicateRowsCount = useMemo(
    () => rows.filter((row) => normalizeImportErrorCode(row.errorCode) === 'DUPLICATE_TRANSACTION').length,
    [rows],
  );

  function setFile(file: File | null) {
    if (!file) {
      setSelectedFile(null);
      setFileName('');
      return;
    }

    setError('');
    setResult(null);
    setSelectedFile(file);
    setFileName(file.name);
  }

  function resetResult() {
    setError('');
    setResult(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    resetResult();

    if (!selectedFile) {
      const message = 'Select an import TSV/CSV file first.';
      setError(message);
      onFailed?.(message);
      return;
    }

    setIsSubmitting(true);
    try {
      const fileBase64 = await readImportFileAsBase64(selectedFile);
      const policy: TransactionsImportPolicyInput = {
        createMissingAccounts,
        createMissingCategories,
        createMissingTags,
        duplicatePolicy,
      };
      const nextResult = await port.submitImport({ fileBase64, policy });
      setResult(nextResult);
      onCompleted?.(nextResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed.';
      setError(message);
      onFailed?.(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    state: {
      isSubmitting,
      fileName,
      error,
      result,
      createMissingAccounts,
      createMissingCategories,
      createMissingTags,
      duplicatePolicy,
      failedRows,
      failureSummary,
      accountNotFoundFailures,
      duplicateRowsCount,
    },
    actions: {
      setFile,
      setCreateMissingAccounts,
      setCreateMissingCategories,
      setCreateMissingTags,
      setDuplicatePolicy,
      submit,
    },
  };
}

export type {
  TransactionsImportDuplicatePolicy,
  TransactionsImportPolicyInput,
  TransactionsImportRequest,
  TransactionsImportResult,
};
