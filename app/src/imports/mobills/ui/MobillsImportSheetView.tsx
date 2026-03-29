import type { ReactNode } from 'react';

export type MobillsImportSheetViewRequired = {
  open: boolean;
  title?: string;
};

export type MobillsImportSheetViewProvided = {
  onClose: () => void;
};

type Props = {
  required: MobillsImportSheetViewRequired;
  provided: MobillsImportSheetViewProvided;
  children: ReactNode;
};

export function MobillsImportSheetView({ required, provided, children }: Props) {
  if (!required.open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation" onClick={provided.onClose}>
      <section
        className="sheet-panel import-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={required.title ?? 'Import from Mobills'}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>
  );
}
