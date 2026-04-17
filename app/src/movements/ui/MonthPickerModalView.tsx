import { useEffect, type ReactNode } from 'react';

export type MonthPickerModalViewRequired = {
  open: boolean;
};

export type MonthPickerModalViewProvided = {
  onDismiss: () => void;
};

export type MonthPickerModalViewProps = {
  required: MonthPickerModalViewRequired;
  provided: MonthPickerModalViewProvided;
  children: ReactNode;
};

export function MonthPickerModalView({ required, provided, children }: MonthPickerModalViewProps) {
  const { open } = required;

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        provided.onDismiss();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, provided.onDismiss]);

  if (!open) {
    return null;
  }

  return (
    <div className="month-picker-backdrop" aria-label="Close month picker" onClick={provided.onDismiss}>
      <div
        className="month-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Choose month"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
