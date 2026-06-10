import type { ReactNode, RefObject } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { ComposerMode } from '../../application/transactions.types';
import './TransactionMainFieldsView.css';

export type TransactionMainFieldsViewProps = ViewProps<
  {
    amountLabel: string;
    dateInputLabel: string;
    datePlaceholder: string;
    noteLabel: string;
    notePlaceholder: string;
    afterAmount?: ReactNode;
    amountInputRef?: RefObject<HTMLInputElement | null>;
    dateInputRef?: RefObject<HTMLInputElement | null>;
  },
  {
    transferTargetOptions: Array<{ id: string; name: string; currency: string }>;
  },
  {
    mode: Exclude<ComposerMode, 'picker'>;
    amount: string;
    date: string;
    note: string;
    transferTargetAccountId: string;
  },
  {
    disabled?: boolean;
    dateDisabled?: boolean;
    dateVisible?: boolean;
    amountError?: string;
    dateError?: string;
  },
  {
    changeAmount: (value: string) => void;
    changeDate: (value: string) => void;
    changeNote: (value: string) => void;
    changeTransferTarget: (value: string) => void;
  }
>;

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) {
    return digits;
  }
  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

export function TransactionMainFieldsView({ required, provided }: TransactionMainFieldsViewProps) {
  const { config, data, state, status } = required;
  const {
    amountLabel,
    amountInputRef,
    dateInputLabel,
    dateInputRef,
    datePlaceholder,
    noteLabel,
    notePlaceholder,
    afterAmount,
  } = config;
  const showTransferFields = state.mode === 'transfer';
  const dateVisible = status.dateVisible ?? true;

  return (
    <>
      {!showTransferFields ? (
        <>
          <label className="stack">
            <span className="visually-hidden">{amountLabel}</span>
            <input
              ref={amountInputRef}
              aria-label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              value={state.amount}
              placeholder="Amount"
              onChange={(event) => provided.commands.changeAmount(event.target.value)}
              inputMode="decimal"
              aria-invalid={Boolean(status.amountError)}
              aria-describedby={status.amountError ? 'composer-amount-error' : undefined}
            />
          </label>
          {status.amountError ? <p id="composer-amount-error" className="field-error">{status.amountError}</p> : null}
          {afterAmount}
        </>
      ) : null}

      {showTransferFields ? (
        <label className="stack">
          <span className="visually-hidden">Destination account</span>
          <select
            aria-label="Destination account"
            value={state.transferTargetAccountId}
            onChange={(event) => provided.commands.changeTransferTarget(event.target.value)}
          >
            <option value="">Select account</option>
            {data.transferTargetOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {showTransferFields ? (
        <>
          <label className="stack">
            <span className="visually-hidden">{amountLabel}</span>
            <input
              ref={amountInputRef}
              aria-label="Amount"
              type="number"
              min="0.01"
              step="0.01"
              value={state.amount}
              placeholder="Amount"
              onChange={(event) => provided.commands.changeAmount(event.target.value)}
              inputMode="decimal"
              aria-invalid={Boolean(status.amountError)}
              aria-describedby={status.amountError ? 'composer-amount-error' : undefined}
            />
          </label>
          {status.amountError ? <p id="composer-amount-error" className="field-error">{status.amountError}</p> : null}
          {afterAmount}

          <label className="stack">
            <span className="visually-hidden">{noteLabel}</span>
            <input
              aria-label={noteLabel}
              value={state.note}
              onChange={(event) => provided.commands.changeNote(event.target.value)}
              placeholder={notePlaceholder}
            />
          </label>
        </>
      ) : null}

      {!showTransferFields ? (
        <label className="stack">
          <span className="visually-hidden">{noteLabel}</span>
          <input
            aria-label={noteLabel}
            value={state.note}
            onChange={(event) => provided.commands.changeNote(event.target.value)}
            placeholder={notePlaceholder}
          />
        </label>
      ) : null}

      {dateVisible ? (
        <>
          <div className="date-input-row">
            <label className="stack date-input-field">
              <span className="visually-hidden">{dateInputLabel}</span>
              <input
                aria-label={dateInputLabel}
                type="text"
                value={state.date}
                placeholder={datePlaceholder}
                inputMode="numeric"
                disabled={status.dateDisabled}
                onFocus={() => {
                  if (state.date === datePlaceholder) {
                    provided.commands.changeDate('');
                  }
                }}
                onChange={(event) => provided.commands.changeDate(formatDateInput(event.target.value))}
                aria-invalid={Boolean(status.dateError)}
                aria-describedby={status.dateError ? 'composer-date-error' : undefined}
              />
              <input
                ref={dateInputRef}
                className="visually-hidden"
                aria-hidden="true"
                tabIndex={-1}
                type="date"
                value={state.date}
                disabled={status.dateDisabled}
                onChange={(event) => provided.commands.changeDate(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="text-button icon-button date-picker-button"
              aria-label="Open calendar"
              onClick={() => {
                dateInputRef?.current?.showPicker?.();
              }}
              disabled={status.disabled || status.dateDisabled}
            >
              <i className="bi bi-calendar3" aria-hidden />
            </button>
          </div>
          {status.dateError ? <p id="composer-date-error" className="field-error">{status.dateError}</p> : null}
        </>
      ) : null}
    </>
  );
}
