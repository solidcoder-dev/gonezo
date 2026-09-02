import { useState } from 'react';
import type { SubmitPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { ApplicationBackupPort, MovementsBackupPort } from '../../imports/application/imports.port';
import type { TransactionsImportFileReaderPort } from '../../imports/application/transactionsImportFileReader.port';
import type { TransactionsImportRequest, TransactionsImportResult } from '../../imports/application/transactionsImport.types';
import type { WorkspaceRefreshTarget } from './useWorkspaceRefreshSignals';

type WorkspaceImportCoordinatorInput = {
  core: AccountWorkspacePort;
  movementsImport: MovementsBackupPort;
  applicationBackup: ApplicationBackupPort;
  fileReader: TransactionsImportFileReaderPort;
  refresh: (...targets: WorkspaceRefreshTarget[]) => void;
  showToast: (message: string) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useWorkspaceImportCoordinator({ core, movementsImport, applicationBackup, fileReader, refresh, showToast }: WorkspaceImportCoordinatorInput) {
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importSubmitPhase, setImportSubmitPhase] = useState<SubmitPhase>('idle');
  const [restoreSheetOpen, setRestoreSheetOpen] = useState(false);

  async function submitTransactionsImport(input: TransactionsImportRequest): Promise<TransactionsImportResult> {
    setImportSubmitPhase('submitting');
    try {
      const result = input.source === 'mobills'
        ? await core.mobillsImport({ fileBase64: input.fileBase64, policy: input.policy })
        : await movementsImport.movementsImportBackup({ fileBase64: input.fileBase64 });
      setImportSubmitPhase('succeeded');
      showToast(`Import finished: ${result.importedCount} imported, ${result.failedCount} failed.`);
      refresh(
        'accountHub',
        'movementQuickAction',
        'accountSummary',
        'netWorth',
        'recentTransactions',
        'analytics',
        'expectedMovements',
      );
      return result;
    } catch (err) {
      setImportSubmitPhase('failed');
      throw err instanceof Error ? err : new Error(toErrorMessage(err));
    }
  }

  async function requestApplicationBackup(): Promise<void> {
    const result = await applicationBackup.applicationExportBackup();
    showToast(`Backup saved: ${result.fileName}.`);
  }

  async function requestApplicationBackupRestore(file: File): Promise<void> {
    const fileBase64 = await fileReader.readAsBase64(file);
    await applicationBackup.applicationImportBackup({ fileBase64 });
    showToast('Restore completed.');
    refresh('accountHub', 'accountSummary', 'netWorth', 'recentTransactions', 'analytics', 'expectedMovements');
  }

  return {
    state: {
      importSheetOpen,
      importSubmitPhase,
      restoreSheetOpen,
    },
    actions: {
      closeImportSheet: () => setImportSheetOpen(false),
      openImportSheet: () => setImportSheetOpen(true),
      closeRestoreSheet: () => setRestoreSheetOpen(false),
      openRestoreSheet: () => setRestoreSheetOpen(true),
      requestApplicationBackup,
      requestApplicationBackupRestore,
      submitTransactionsImport,
    },
  };
}
