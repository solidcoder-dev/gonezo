import { TransactionsImportComponent } from '../../../imports';
import type { AccountPageViewProvided, AccountPageViewRequired } from '../accountPageView.contract';

export type ImportSectionRequired = {
  imports: AccountPageViewRequired['imports'];
  accountsCount: number;
};

export type ImportSectionProvided = {
  imports: AccountPageViewProvided['imports'];
};

type Props = {
  required: ImportSectionRequired;
  provided: ImportSectionProvided;
};

export function ImportSection({ required, provided }: Props) {
  if (!required.imports.sheetOpen) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={provided.imports.closeSheet}>
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
            onClick={provided.imports.closeSheet}
          >
            ×
          </button>
        </div>

        <TransactionsImportComponent
          required={{
            accountsCount: required.accountsCount,
          }}
          provided={{
            submitImport: provided.imports.submitImport,
          }}
        />
      </section>
    </div>
  );
}
