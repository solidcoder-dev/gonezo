import { useEffect, useRef, useState } from 'react';
import type { ShareSettlementChoice } from '../../domain/shareDraft';
import styles from './ShareExpenseEditorView.module.css';

type ShareSettlementDropdownViewProps = {
  readonly name: string;
  readonly movementType: 'expense' | 'income';
  readonly value: ShareSettlementChoice;
  readonly disabled: boolean;
  readonly onChange: (value: ShareSettlementChoice) => void;
};

const choices: readonly ShareSettlementChoice[] = ['pending', 'settled', 'not_required'];

function labelFor(type: ShareSettlementDropdownViewProps['movementType'], choice: ShareSettlementChoice): string {
  switch (choice) {
    case 'pending': return 'Pending';
    case 'settled': return type === 'income' ? 'Paid out' : 'Reimbursed';
    case 'not_required': return type === 'income' ? 'No payout' : 'No reimbursement';
  }
}

export function ShareSettlementDropdownView({ name, movementType, value, disabled, onChange }: ShareSettlementDropdownViewProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutside(event: MouseEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('mousedown', closeOnOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [open]);

  return (
    <div ref={rootRef} className="dropdown">
      <button type="button" className={`${styles.settlementTrigger} dropdown-toggle`} aria-expanded={open} aria-haspopup="listbox" aria-label={`${name} settlement status`} disabled={disabled} onClick={() => setOpen((current) => !current)}>
        {labelFor(movementType, value)}
      </button>
      {open ? (
        <div className={`${styles.settlementMenu} dropdown-menu show`} role="listbox" aria-label={`${name} settlement options`}>
          {choices.map((choice) => (
            <button key={choice} type="button" role="option" aria-selected={choice === value} className="dropdown-item d-flex align-items-center justify-content-between gap-3" onClick={() => { onChange(choice); setOpen(false); }}>
              <span>{labelFor(movementType, choice)}</span>
              {choice === value ? <i className="bi bi-check2" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
