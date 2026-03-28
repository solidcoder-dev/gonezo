import { MobillsImportSheetView } from '../../../imports/mobills/ui/MobillsImportSheetView';
import { MobillsImportSummaryView } from '../../../imports/mobills/ui/MobillsImportSummaryView';
import { normalizeImportErrorCode } from '../../../imports/mobills/domain/importFailureSummary';
import type { AccountPageActions, AccountPageState } from '../accountPageView.contract';

type Props = {
  imports: AccountPageState['imports'];
  accountsCount: number;
  importActions: AccountPageActions['imports'];
};

export function ImportSection({ imports, accountsCount, importActions }: Props) {
  return (
    <MobillsImportSheetView open={imports.sheetOpen} onClose={importActions.closeSheet}>
      <div className="inline-header">
        <h3>Import from Mobills</h3>
        <button
          type="button"
          className="text-button icon-button"
          aria-label="Close import sheet"
          onClick={importActions.closeSheet}
        >
          ×
        </button>
      </div>

      {imports.error ? (
        <div className="banner error" role="alert">
          {imports.error}
        </div>
      ) : null}

      <div className="import-sheet-content">
        <form className="stack" onSubmit={importActions.submitImport} aria-busy={imports.isImporting}>
          <label className="stack">
            Mobills file (TSV/CSV)
            <input
              aria-label="Mobills file (TSV/CSV)"
              type="file"
              accept=".csv,text/csv,.tsv,.txt,text/tab-separated-values"
              onChange={(event) => importActions.setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          {imports.fileName ? <p className="hint">Selected: {imports.fileName}</p> : null}

          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={imports.createMissingAccounts}
              onChange={(event) => importActions.setCreateMissingAccounts(event.target.checked)}
            />
            Create missing accounts
          </label>
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={imports.createMissingCategories}
              onChange={(event) => importActions.setCreateMissingCategories(event.target.checked)}
            />
            Create missing categories
          </label>
          <label className="inline-checkbox">
            <input
              type="checkbox"
              checked={imports.createMissingTags}
              onChange={(event) => importActions.setCreateMissingTags(event.target.checked)}
            />
            Create missing tags
          </label>

          <label className="stack">
            Duplicate transactions
            <select
              aria-label="Duplicate transactions"
              value={imports.duplicatePolicy}
              onChange={(event) =>
                importActions.setDuplicatePolicy(event.target.value as 'skip' | 'fail' | 'import_anyway')
              }
            >
              <option value="skip">Skip duplicates (recommended)</option>
              <option value="fail">Mark duplicates as failed</option>
              <option value="import_anyway">Import duplicates anyway</option>
            </select>
          </label>

          <button type="submit" disabled={imports.isImporting}>
            {imports.isImporting ? 'Importing...' : 'Import file'}
          </button>
        </form>

        {imports.result ? (
          <section className="stack section-gap" aria-label="Import summary">
            <MobillsImportSummaryView result={imports.result} duplicatesCount={imports.duplicateRowsCount} />
            {imports.result.importedCount > 0 && accountsCount === 0 ? (
              <p className="hint">
                Import reported successful rows, but no accounts are visible. Reopen the app and re-check account list.
                If this persists, share the failed-line examples below.
              </p>
            ) : null}
            {imports.failureSummary.length > 0 ? (
              <>
                <p>Failure reasons</p>
                <ul>
                  {imports.failureSummary.slice(0, 6).map((item) => (
                    <li key={item.code}>
                      {item.label}: {item.count}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {imports.accountNotFoundFailures > 0 ? (
              <p className="hint">
                Tip: many rows failed because account names were not found. Enable `Create missing accounts` and import
                again.
              </p>
            ) : null}
            {imports.failedRows.length > 0 ? (
              <>
                <p>Failed line examples</p>
                <ul>
                  {imports.failedRows.slice(0, 10).map((row) => (
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
