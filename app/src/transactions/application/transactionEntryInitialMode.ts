import type { ComposerMode } from './transactions.types';

export type TransactionEntryInitialMode = Exclude<ComposerMode, 'picker'>;

export function applyTransactionEntryInitialMode(
  mode: TransactionEntryInitialMode | undefined,
  setMode: (mode: TransactionEntryInitialMode) => void,
  prepareTransfer: () => void,
): void {
  if (!mode) {
    return;
  }

  setMode(mode);
  if (mode === 'transfer') {
    prepareTransfer();
  }
}
