import {
  TransactionsImportComponent as TransactionsImportFeature,
} from '../../../imports';
import type { TransactionsImportComponentProps } from './TransactionsImportComponent.contract';

export type {
  TransactionsImportComponentProps,
  TransactionsImportComponentProvided,
  TransactionsImportComponentRequired,
} from './TransactionsImportComponent.contract';

export function TransactionsImportComponent({ required, provided }: TransactionsImportComponentProps) {
  if (!required.state.isOpen) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={provided.commands.close}>
      <section
        className="sheet-panel import-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Import transactions"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inline-header">
          <h3>Import transactions</h3>
          <button
            type="button"
            className="text-button icon-button"
            aria-label="Close import sheet"
            onClick={provided.commands.close}
          >
            ×
          </button>
        </div>

        <TransactionsImportFeature
          required={{
            accountsCount: required.state.accountsCount,
          }}
          provided={{
            submitImport: provided.commands.submit,
            onCompleted: provided.events?.onImported,
            onFailed: provided.events?.onImportFailed,
          }}
        />
      </section>
    </div>
  );
}
