import { useState } from 'react';
import type { SubmitPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { TransactionsImportRequest, TransactionsImportResult } from '../../imports/application/transactionsImport.types';
import type { WorkspaceRefreshTarget } from './useWorkspaceRefreshSignals';

type WorkspaceImportCoordinatorInput = {
  core: AccountWorkspacePort;
  refresh: (...targets: WorkspaceRefreshTarget[]) => void;
  showToast: (message: string) => void;
};

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
}

export function useWorkspaceImportCoordinator({ core, refresh, showToast }: WorkspaceImportCoordinatorInput) {
  const [importSheetOpen, setImportSheetOpen] = useState(false);
  const [importSubmitPhase, setImportSubmitPhase] = useState<SubmitPhase>('idle');

  async function submitTransactionsImport(input: TransactionsImportRequest): Promise<TransactionsImportResult> {
    setImportSubmitPhase('submitting');
    try {
      const result = input.source === 'mobills'
        ? await core.mobillsImport({ fileBase64: input.fileBase64, policy: input.policy })
        : await core.movementsImportBackup({ fileBase64: input.fileBase64 });
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

  async function requestMovementsBackup(): Promise<void> {
    const result = await core.movementsExportBackup();
    showToast(`Backup saved: ${result.fileName} (${result.postedMovementCount} posted movements).`);
  }

  return {
    state: {
      importSheetOpen,
      importSubmitPhase,
    },
    actions: {
      closeImportSheet: () => setImportSheetOpen(false),
      openImportSheet: () => setImportSheetOpen(true),
      requestMovementsBackup,
      submitTransactionsImport,
    },
  };
}
