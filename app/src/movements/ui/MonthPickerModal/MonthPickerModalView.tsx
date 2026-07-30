import { useEffect, type ReactNode } from 'react';
import './MonthPickerModalView.css';

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
  const { onDismiss } = provided;

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onDismiss();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onDismiss]);

  if (!open) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        className="month-picker-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="sheet-backdrop"
        onClick={onDismiss}
      />
      <div
        className="month-picker-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Choose month"
      >
        {children}
      </div>
    </div>
  );
}
