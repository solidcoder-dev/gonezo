import { normalizeImportErrorCode } from '../domain/importFailureSummary';
import { useTransactionsImport } from '../application/useTransactionsImport';
import type { TransactionsImportComponentProps } from '../ui/TransactionsImportComponent.contract';
import { TransactionsImportSummaryView } from '../ui/TransactionsImportSummaryView';

export type { TransactionsImportComponentProps } from '../ui/TransactionsImportComponent.contract';

export function TransactionsImportComponent({ required, provided }: TransactionsImportComponentProps) {
  const workspace = useTransactionsImport({
    port: {
      submitImport: provided.submitImport,
    },
    onCompleted: provided.onCompleted,
    onFailed: provided.onFailed,
  });

  return (
    <div className="import-sheet-content">
      <form className="stack" onSubmit={workspace.actions.submit} aria-busy={workspace.state.isSubmitting}>
        <label className="stack">
          Import file (TSV/CSV)
          <input
            aria-label="Import file (TSV/CSV)"
            type="file"
            accept=".csv,text/csv,.tsv,.txt,text/tab-separated-values"
            onChange={(event) => workspace.actions.setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {workspace.state.fileName ? <p className="hint">Selected: {workspace.state.fileName}</p> : null}

        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={workspace.state.createMissingAccounts}
            onChange={(event) => workspace.actions.setCreateMissingAccounts(event.target.checked)}
          />
          Create missing accounts
        </label>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={workspace.state.createMissingCategories}
            onChange={(event) => workspace.actions.setCreateMissingCategories(event.target.checked)}
          />
          Create missing categories
        </label>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={workspace.state.createMissingTags}
            onChange={(event) => workspace.actions.setCreateMissingTags(event.target.checked)}
          />
          Create missing tags
        </label>

        <label className="stack">
          Duplicate transactions
          <select
            aria-label="Duplicate transactions"
            value={workspace.state.duplicatePolicy}
            onChange={(event) =>
              workspace.actions.setDuplicatePolicy(event.target.value as 'skip' | 'fail' | 'import_anyway')
            }
          >
            <option value="skip">Skip duplicates (recommended)</option>
            <option value="fail">Mark duplicates as failed</option>
            <option value="import_anyway">Import duplicates anyway</option>
          </select>
        </label>

        <button type="submit" disabled={workspace.state.isSubmitting}>
          {workspace.state.isSubmitting ? 'Importing...' : 'Import file'}
        </button>
      </form>

      {workspace.state.error ? (
        <div className="banner error" role="alert">
          {workspace.state.error}
        </div>
      ) : null}

      {workspace.state.result ? (
        <section className="stack section-gap" aria-label="Import summary">
          <TransactionsImportSummaryView
            required={{
              result: workspace.state.result,
              duplicatesCount: workspace.state.duplicateRowsCount,
            }}
          />
          {workspace.state.result.importedCount > 0 && required.accountsCount === 0 ? (
            <p className="hint">
              Import reported successful rows, but no accounts are visible. Reopen the app and re-check account list.
              If this persists, share the failed-line examples below.
            </p>
          ) : null}
          {workspace.state.failureSummary.length > 0 ? (
            <>
              <p>Failure reasons</p>
              <ul>
                {workspace.state.failureSummary.slice(0, 6).map((item) => (
                  <li key={item.code}>
                    {item.label}: {item.count}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {workspace.state.accountNotFoundFailures > 0 ? (
            <p className="hint">
              Tip: many rows failed because account names were not found. Enable `Create missing accounts` and import
              again.
            </p>
          ) : null}
          {workspace.state.failedRows.length > 0 ? (
            <>
              <p>Failed line examples</p>
              <ul>
                {workspace.state.failedRows.slice(0, 10).map((row) => (
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
  );
}
