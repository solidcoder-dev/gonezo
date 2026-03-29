import { MobillsImportSheetView } from '../../../imports/mobills/ui/MobillsImportSheetView';
import { MobillsImportSummaryView } from '../../../imports/mobills/ui/MobillsImportSummaryView';
import { normalizeImportErrorCode } from '../../../imports/mobills/domain/importFailureSummary';
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
  return (
    <MobillsImportSheetView
      required={{
        open: required.imports.sheetOpen,
      }}
      provided={{
        onClose: provided.imports.closeSheet,
      }}
    >
      <div className="inline-header">
        <h3>Import from Mobills</h3>
        <button
          type="button"
          className="text-button icon-button"
          aria-label="Close import sheet"
          onClick={provided.imports.closeSheet}
        >
          ×
        </button>
      </div>

      {required.imports.error ? (
        <div className="banner error" role="alert">
          {required.imports.error}
        </div>
      ) : null}

      <div className="import-sheet-content">
        <form className="stack" onSubmit={provided.imports.submitImport} aria-busy={required.imports.isImporting}>
          <label className="stack">
            Mobills file (TSV/CSV)
            <input
              aria-label="Mobills file (TSV/CSV)"
              type="file"
              accept=".csv,text/csv,.tsv,.txt,text/tab-separated-values"
              onChange={(event) => provided.imports.setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {required.imports.fileName ? <p className="hint">Selected: {required.imports.fileName}</p> : null}

          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={required.imports.createMissingAccounts}
              onChange={(event) => provided.imports.setCreateMissingAccounts(event.target.checked)}
            />
            Create missing accounts
          </label>
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={required.imports.createMissingCategories}
              onChange={(event) => provided.imports.setCreateMissingCategories(event.target.checked)}
            />
            Create missing categories
          </label>
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={required.imports.createMissingTags}
              onChange={(event) => provided.imports.setCreateMissingTags(event.target.checked)}
            />
            Create missing tags
          </label>

          <label className="stack">
            Duplicate transactions
            <select
              aria-label="Duplicate transactions"
              value={required.imports.duplicatePolicy}
              onChange={(event) =>
                provided.imports.setDuplicatePolicy(event.target.value as 'skip' | 'fail' | 'import_anyway')
              }
            >
              <option value="skip">Skip duplicates (recommended)</option>
              <option value="fail">Mark duplicates as failed</option>
              <option value="import_anyway">Import duplicates anyway</option>
            </select>
          </label>

          <button type="submit" disabled={required.imports.isImporting}>
            {required.imports.isImporting ? 'Importing...' : 'Import file'}
          </button>
        </form>

        {required.imports.result ? (
          <section className="stack section-gap" aria-label="Import summary">
            <MobillsImportSummaryView
              required={{
                result: required.imports.result,
                duplicatesCount: required.imports.duplicateRowsCount,
              }}
            />
            {required.imports.result.importedCount > 0 && required.accountsCount === 0 ? (
              <p className="hint">
                Import reported successful rows, but no accounts are visible. Reopen the app and re-check account list.
                If this persists, share the failed-line examples below.
              </p>
            ) : null}
            {required.imports.failureSummary.length > 0 ? (
              <>
                <p>Failure reasons</p>
                <ul>
                  {required.imports.failureSummary.slice(0, 6).map((item) => (
                    <li key={item.code}>
                      {item.label}: {item.count}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {required.imports.accountNotFoundFailures > 0 ? (
              <p className="hint">
                Tip: many rows failed because account names were not found. Enable `Create missing accounts` and import
                again.
              </p>
            ) : null}
            {required.imports.failedRows.length > 0 ? (
              <>
                <p>Failed line examples</p>
                <ul>
                  {required.imports.failedRows.slice(0, 10).map((row) => (
                    <li key={`${row.sourceLine}-${row.errorCode ?? 'IMPORT_FAILED'}`}>
                      Line {row.sourceLine} ({normalizeImportErrorCode(row.errorCode)}): {row.errorMessage ?? 'Import failed'}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </MobillsImportSheetView>
  );
}
