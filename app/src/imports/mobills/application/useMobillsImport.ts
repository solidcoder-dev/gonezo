import { useState } from 'react';
import type { FormEvent } from 'react';
import { readMobillsFileAsBase64 } from '../infrastructure/mobillsFileReader';

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

export type MobillsImportPort = {
  mobillsImport(input: {
    fileBase64: string;
    policy?: MobillsImportPolicyInput;
  }): Promise<MobillsImportResult>;
};

type UseMobillsImportInput = {
  core: MobillsImportPort;
  accountsCount: number;
  selectedAccountId: string;
  refreshAccounts: (preferredAccountId?: string) => Promise<void>;
  showToast: (message: string) => void;
};

export function useMobillsImport({
  core,
  accountsCount,
  selectedAccountId,
  refreshAccounts,
  showToast,
}: UseMobillsImportInput) {
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importingMobills, setImportingMobills] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importFile, setImportFileState] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<MobillsImportResult | null>(null);
  const [importCreateMissingAccounts, setImportCreateMissingAccounts] = useState(true);
  const [importCreateMissingCategories, setImportCreateMissingCategories] = useState(true);
  const [importCreateMissingTags, setImportCreateMissingTags] = useState(true);
  const [importDuplicatePolicy, setImportDuplicatePolicy] = useState<MobillsDuplicatePolicy>('skip');

  function openImportSheet() {
    setImportError('');
    setImportResult(null);
    if (accountsCount === 0) {
      setImportCreateMissingAccounts(true);
    }
    setImportSheetOpen(true);
  }

  function closeImportSheet() {
    setImportSheetOpen(false);
    setImportError('');
  }

  function setImportFile(file: File | null) {
    if (!file) {
      setImportFileState(null);
      setImportFileName('');
      return;
    }

    setImportError('');
    setImportResult(null);
    setImportFileState(file);
    setImportFileName(file.name);
  }

  async function submitMobillsImport(event: FormEvent) {
    event.preventDefault();
    setImportError('');
    setImportResult(null);

    if (!importFile) {
      setImportError('Select a Mobills TSV/CSV file first.');
      return;
    }

    setImportingMobills(true);
    try {
      const fileBase64 = await readMobillsFileAsBase64(importFile);
      const result = await core.mobillsImport({
        fileBase64,
        policy: {
          createMissingAccounts: importCreateMissingAccounts,
          createMissingCategories: importCreateMissingCategories,
          createMissingTags: importCreateMissingTags,
          duplicatePolicy: importDuplicatePolicy,
        },
      });
      setImportResult(result);
      await refreshAccounts(selectedAccountId || undefined);
      showToast(`Import finished: ${result.importedCount} imported, ${result.failedCount} failed.`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImportingMobills(false);
    }
  }

  return {
    importSheetOpen,
    importingMobills,
    importFileName,
    importError,
    importResult,
    importCreateMissingAccounts,
    importCreateMissingCategories,
    importCreateMissingTags,
    importDuplicatePolicy,
    setImportCreateMissingAccounts,
    setImportCreateMissingCategories,
    setImportCreateMissingTags,
    setImportDuplicatePolicy,
    setImportFile,
    openImportSheet,
    closeImportSheet,
    submitMobillsImport,
  };
}
