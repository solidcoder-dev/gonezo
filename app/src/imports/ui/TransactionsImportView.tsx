import { normalizeImportErrorCode } from '../domain/importFailureSummary';
import { TransactionsImportSummaryView } from './TransactionsImportSummaryView';
import type { TransactionsImportViewProps } from './TransactionsImportView.contract';

export type {
  TransactionsImportViewProps,
  TransactionsImportViewProvided,
  TransactionsImportViewRequired,
} from './TransactionsImportView.contract';

export function TransactionsImportView({ required, provided }: TransactionsImportViewProps) {
  return (
    <div className="import-sheet-content">
      <form className="stack" onSubmit={provided.submit} aria-busy={required.isSubmitting}>
        <label className="stack">
          Import file (TSV/CSV)
          <input
            aria-label="Import file (TSV/CSV)"
            type="file"
            accept=".csv,text/csv,.tsv,.txt,text/tab-separated-values"
            onChange={(event) => provided.setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {required.fileName ? <p className="hint">Selected: {required.fileName}</p> : null}

        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={required.createMissingAccounts}
            onChange={(event) => provided.setCreateMissingAccounts(event.target.checked)}
          />
          Create missing accounts
        </label>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={required.createMissingCategories}
            onChange={(event) => provided.setCreateMissingCategories(event.target.checked)}
          />
          Create missing categories
        </label>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={required.createMissingTags}
            onChange={(event) => provided.setCreateMissingTags(event.target.checked)}
          />
          Create missing tags
        </label>

        <label className="stack">
          Duplicate transactions
          <select
            aria-label="Duplicate transactions"
            value={required.duplicatePolicy}
            onChange={(event) => provided.setDuplicatePolicy(event.target.value as 'skip' | 'fail' | 'import_anyway')}
          >
            <option value="skip">Skip duplicates (recommended)</option>
            <option value="fail">Mark duplicates as failed</option>
            <option value="import_anyway">Import duplicates anyway</option>
          </select>
        </label>

        <button type="submit" disabled={required.isSubmitting}>
          {required.isSubmitting ? 'Importing...' : 'Import file'}
        </button>
      </form>

      {required.error ? (
        <div className="banner error" role="alert">
          {required.error}
        </div>
      ) : null}

      {required.result ? (
        <section className="stack section-gap" aria-label="Import summary">
          <TransactionsImportSummaryView
            required={{
              result: required.result,
              duplicatesCount: required.duplicateRowsCount,
            }}
          />
          {required.result.importedCount > 0 && required.accountsCount === 0 ? (
            <p className="hint">
              Import reported successful rows, but no accounts are visible. Reopen the app and re-check account list.
              If this persists, share the failed-line examples below.
            </p>
          ) : null}
          {required.failureSummary.length > 0 ? (
            <>
              <p>Failure reasons</p>
              <ul>
                {required.failureSummary.slice(0, 6).map((item) => (
                  <li key={item.code}>
                    {item.label}: {item.count}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {required.accountNotFoundFailures > 0 ? (
            <p className="hint">
              Tip: many rows failed because account names were not found. Enable `Create missing accounts` and import
              again.
            </p>
          ) : null}
          {required.failedRows.length > 0 ? (
            <>
              <p>Failed line examples</p>
              <ul>
                {required.failedRows.slice(0, 10).map((row) => (
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
