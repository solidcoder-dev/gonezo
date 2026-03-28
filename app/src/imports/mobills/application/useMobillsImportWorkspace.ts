import type { FormEvent } from 'react';
import {
  normalizeImportErrorCode,
  summarizeImportFailures,
  type ImportRowResult,
} from '../domain/importFailureSummary';
import type { MobillsDuplicatePolicy, MobillsImportResult } from '../domain/mobillsImport.types';

type MobillsImportWorkspaceSlice = {
  importSheetOpen: boolean;
  importingMobills: boolean;
  importFileName: string;
  importError: string;
  importResult: MobillsImportResult | null;
  importCreateMissingAccounts: boolean;
  importCreateMissingCategories: boolean;
  importCreateMissingTags: boolean;
  importDuplicatePolicy: MobillsDuplicatePolicy;
  setImportFile: (file: File | null) => void;
  setImportCreateMissingAccounts: (value: boolean) => void;
  setImportCreateMissingCategories: (value: boolean) => void;
  setImportCreateMissingTags: (value: boolean) => void;
  setImportDuplicatePolicy: (value: MobillsDuplicatePolicy) => void;
  openImportSheet: () => void;
  closeImportSheet: () => void;
  submitMobillsImport: (event: FormEvent) => Promise<void>;
};

export function useMobillsImportWorkspace<T extends MobillsImportWorkspaceSlice>(model: T) {
  const importRows = (model.importResult?.rows ?? []) as ImportRowResult[];
  const importFailedRows = importRows.filter((row) => row.status === 'failed');
  const importFailureSummary = summarizeImportFailures(importRows);
  const accountNotFoundFailures = importFailureSummary.find((item) => item.code === 'ACCOUNT_NOT_FOUND')?.count ?? 0;
  const duplicateRowsCount = importRows
    .filter((row) => normalizeImportErrorCode(row.errorCode) === 'DUPLICATE_TRANSACTION')
    .length;

  return {
    state: {
      importSheetOpen: model.importSheetOpen,
      importingMobills: model.importingMobills,
      importFileName: model.importFileName,
      importError: model.importError,
      importResult: model.importResult,
      importCreateMissingAccounts: model.importCreateMissingAccounts,
      importCreateMissingCategories: model.importCreateMissingCategories,
      importCreateMissingTags: model.importCreateMissingTags,
      importDuplicatePolicy: model.importDuplicatePolicy,
      importFailedRows,
      importFailureSummary,
      accountNotFoundFailures,
      duplicateRowsCount,
    },
    actions: {
      setImportFile: model.setImportFile,
      setImportCreateMissingAccounts: model.setImportCreateMissingAccounts,
      setImportCreateMissingCategories: model.setImportCreateMissingCategories,
      setImportCreateMissingTags: model.setImportCreateMissingTags,
      setImportDuplicatePolicy: model.setImportDuplicatePolicy,
      openImportSheet: model.openImportSheet,
      closeImportSheet: model.closeImportSheet,
      submitMobillsImport: model.submitMobillsImport,
    },
  };
}
