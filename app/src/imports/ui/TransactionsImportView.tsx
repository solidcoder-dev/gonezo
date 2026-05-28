import { normalizeImportErrorCode } from '../application/importFailureSummary';
import { TransactionsImportSummaryView } from './TransactionsImportSummaryView';
import type { TransactionsImportViewProps } from './TransactionsImportView.contract';

export type {
  TransactionsImportViewProps,
  TransactionsImportViewProvided,
  TransactionsImportViewRequired,
} from './TransactionsImportView.contract';

export function TransactionsImportView({ required, provided }: TransactionsImportViewProps) {
  const isSubmitting = required.status.submitPhase === 'submitting';
  const isMobillsImport = required.state.importSource === 'mobills';
  const fileLabel = isMobillsImport ? 'Mobills file (TSV/CSV)' : 'Backup file (JSON)';

  return (
    <div className="import-sheet-content">
      <form className="stack" onSubmit={provided.commands.submit} aria-busy={isSubmitting}>
        <label className="inline-checkbox">
          <input
            type="checkbox"
            checked={isMobillsImport}
            onChange={(event) => provided.commands.setUseMobillsImport(event.target.checked)}
          />
          Import Mobills TSV/CSV
        </label>

        <label className="stack">
          {fileLabel}
          <input
            aria-label={fileLabel}
            type="file"
            accept={isMobillsImport
              ? '.csv,text/csv,.tsv,.txt,text/tab-separated-values'
              : '.json,application/json'}
            onChange={(event) => provided.commands.setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        {required.state.fileName ? <p className="hint">Selected: {required.state.fileName}</p> : null}

        {isMobillsImport ? (
          <>
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={required.state.policy.createMissingAccounts}
                onChange={(event) => provided.commands.setCreateMissingAccounts(event.target.checked)}
              />
              Create missing accounts
            </label>
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={required.state.policy.createMissingCategories}
                onChange={(event) => provided.commands.setCreateMissingCategories(event.target.checked)}
              />
              Create missing categories
            </label>
            <label className="inline-checkbox">
              <input
                type="checkbox"
                checked={required.state.policy.createMissingTags}
                onChange={(event) => provided.commands.setCreateMissingTags(event.target.checked)}
              />
              Create missing tags
            </label>

            <label className="stack">
              Duplicate transactions
              <select
                aria-label="Duplicate transactions"
                value={required.state.policy.duplicatePolicy}
                onChange={(event) => provided.commands.setDuplicatePolicy(event.target.value as 'skip' | 'fail' | 'import_anyway')}
              >
                <option value="skip">Skip duplicates (recommended)</option>
                <option value="fail">Mark duplicates as failed</option>
                <option value="import_anyway">Import duplicates anyway</option>
              </select>
            </label>
          </>
        ) : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Importing...' : isMobillsImport ? 'Import Mobills file' : 'Import backup'}
        </button>
      </form>

      {required.status.error ? (
        <div className="banner error" role="alert">
          {required.status.error}
        </div>
      ) : null}

      {required.state.result ? (
        <section className="stack section-gap" aria-label="Import summary">
          <TransactionsImportSummaryView
            required={{
              result: required.state.result,
              duplicatesCount: required.state.duplicateRowsCount,
            }}
          />
          {required.state.result.importedCount > 0 && required.state.accountsCount === 0 ? (
            <p className="hint">
              Import reported successful rows, but no accounts are visible. Reopen the app and re-check account list.
              If this persists, share the failed-line examples below.
            </p>
          ) : null}
          {required.state.failureSummary.length > 0 ? (
            <>
              <p>Failure reasons</p>
              <ul>
                {required.state.failureSummary.slice(0, 6).map((item) => (
                  <li key={item.code}>
                    {item.label}: {item.count}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {required.state.accountNotFoundFailures > 0 ? (
            <p className="hint">
              Tip: many rows failed because account names were not found. Enable `Create missing accounts` and import
              again.
            </p>
          ) : null}
          {required.state.failedRows.length > 0 ? (
            <>
              <p>Failed line examples</p>
              <ul>
                {required.state.failedRows.slice(0, 10).map((row) => (
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
