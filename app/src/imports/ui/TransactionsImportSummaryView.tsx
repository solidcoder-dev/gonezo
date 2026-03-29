import type { TransactionsImportResult } from '../domain/transactionsImport.types';

export type TransactionsImportSummaryViewRequired = {
  result: TransactionsImportResult;
  duplicatesCount?: number;
};

type TransactionsImportSummaryViewProps = {
  required: TransactionsImportSummaryViewRequired;
};

export function TransactionsImportSummaryView({ required }: TransactionsImportSummaryViewProps) {
  return (
    <section className="stack section-gap" aria-label="Import summary">
      <p>
        Imported {required.result.importedCount} / {required.result.totalRows} rows
      </p>
      <p>{required.result.failedCount} failed</p>
      <p>{required.result.skippedCount} skipped</p>
      {(required.duplicatesCount ?? 0) > 0 ? <p>{required.duplicatesCount} duplicates</p> : null}
    </section>
  );
}
