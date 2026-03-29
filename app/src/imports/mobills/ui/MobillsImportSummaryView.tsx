import type { MobillsImportResult } from '../domain/mobillsImport.types';

export type MobillsImportSummaryViewRequired = {
  result: MobillsImportResult;
  duplicatesCount?: number;
};

type Props = {
  required: MobillsImportSummaryViewRequired;
};

export function MobillsImportSummaryView({ required }: Props) {
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
