import type { MobillsImportResult } from '../domain/mobillsImport.types';

type Props = {
  result: MobillsImportResult;
  duplicatesCount?: number;
};

export function MobillsImportSummaryView({ result, duplicatesCount = 0 }: Props) {
  return (
    <section className="stack section-gap" aria-label="Import summary">
      <p>
        Imported {result.importedCount} / {result.totalRows} rows
      </p>
      <p>{result.failedCount} failed</p>
      <p>{result.skippedCount} skipped</p>
      {duplicatesCount > 0 ? <p>{duplicatesCount} duplicates</p> : null}
    </section>
  );
}
