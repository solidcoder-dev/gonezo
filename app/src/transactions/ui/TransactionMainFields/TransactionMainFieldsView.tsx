import { useId, type ReactNode, type RefObject } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import { AmountInputView } from '../../../shared/ui/AmountInput/AmountInputView';
import type { ComposerMode } from '../../application/transactions.types';
import './TransactionMainFieldsView.css';
import { MovementReuseAutocompleteView } from '../MovementReuseAutocomplete/MovementReuseAutocompleteView';
import type { MovementReuseSuggestionGroup, MovementReuseSuggestionVariant } from '../../../movements/application/movementReuseSuggestions.port';

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
    noteInputRef?: RefObject<HTMLInputElement | null>;
    movementReuse?: {
      query: string; open: boolean; loading: boolean; groups: MovementReuseSuggestionGroup[];
      expandedTitle: string | null; variants: MovementReuseSuggestionVariant[]; error: string;
    };
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
    amountVisible?: boolean;
    amountDisabled?: boolean;
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
    continueEditing?: () => void;
    closeMovementReuse?: () => void;
    toggleMovementReuseGroup?: (group: MovementReuseSuggestionGroup) => void;
    selectMovementReuseVariant?: (selection: { title: string; variant: MovementReuseSuggestionVariant }) => void;
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

function currencyFromAmountLabel(label: string): string {
  const match = label.match(/\(([^)]+)\)/);
  return match?.[1] ?? '';
}

export function TransactionMainFieldsView({ required, provided }: TransactionMainFieldsViewProps) {
  const { config, data, state, status } = required;
  const {
    amountLabel,
    amountInputRef,
    dateInputLabel,
    dateInputRef,
    noteInputRef,
    datePlaceholder,
    noteLabel,
    notePlaceholder,
    afterAmount,
    movementReuse,
  } = config;
  const showTransferFields = state.mode === 'transfer';
  const amountVisible = status.amountVisible ?? true;
  const amountDisabled = status.disabled || status.amountDisabled;
  const dateVisible = status.dateVisible ?? true;
  const amountCurrency = currencyFromAmountLabel(amountLabel);
  const dateFieldId = useId();

  return (
    <>
      {!showTransferFields && amountVisible ? (
        <>
          <AmountInputView
            required={{ config: { label: 'Amount', currency: amountCurrency, inputRef: amountInputRef }, data: {}, state: { value: state.amount }, status: { disabled: amountDisabled, error: status.amountError } }}
            provided={{ commands: { change: provided.commands.changeAmount, continueEditing: provided.commands.continueEditing } }}
          />
        </>
      ) : null}

      {!showTransferFields ? afterAmount : null}

      {showTransferFields ? (
        <label className="vstack gap-2">
          <span className="visually-hidden">Destination account</span>
          <select
            className="form-select"
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

      {showTransferFields && amountVisible ? (
        <>
          <AmountInputView
            required={{ config: { label: 'Amount', currency: amountCurrency, inputRef: amountInputRef }, data: {}, state: { value: state.amount }, status: { disabled: amountDisabled, error: status.amountError } }}
            provided={{ commands: { change: provided.commands.changeAmount, continueEditing: provided.commands.continueEditing } }}
          />
          {afterAmount}

          <label className="vstack gap-2">
            <span className="visually-hidden">{noteLabel}</span>
            <input
              ref={noteInputRef}
              className="form-control"
              aria-label={noteLabel}
              value={state.note}
              onChange={(event) => provided.commands.changeNote(event.target.value)}
              placeholder={notePlaceholder}
            />
          </label>
        </>
      ) : null}

      {!showTransferFields ? (
        <label className="vstack gap-2">
          <span className="visually-hidden">{noteLabel}</span>
          {movementReuse && provided.commands.closeMovementReuse && provided.commands.toggleMovementReuseGroup && provided.commands.selectMovementReuseVariant ? (
            <MovementReuseAutocompleteView
              {...movementReuse}
              onChange={provided.commands.changeNote}
              onClose={provided.commands.closeMovementReuse}
              onToggleGroup={provided.commands.toggleMovementReuseGroup}
              onSelectVariant={provided.commands.selectMovementReuseVariant}
            />
          ) : <input
            ref={noteInputRef}
            className="form-control"
            aria-label={noteLabel}
            value={state.note}
            onChange={(event) => provided.commands.changeNote(event.target.value)}
            placeholder={notePlaceholder}
          />}
        </label>
      ) : null}

      {dateVisible ? (
        <>
          <div className="date-input-row">
            <div className="date-input-field">
              <label className="visually-hidden" htmlFor={dateFieldId}>{dateInputLabel}</label>
              <input
                id={dateFieldId}
                className="form-control"
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
              <button
                type="button"
                className="btn btn-link gz-icon-button date-picker-button"
                aria-label="Open calendar"
                onClick={() => {
                  dateInputRef?.current?.showPicker?.();
                }}
                disabled={status.disabled || status.dateDisabled}
              >
                <i className="bi bi-calendar3" aria-hidden />
              </button>
            </div>
          </div>
          {status.dateError ? <p id="composer-date-error" className="gz-field-error">{status.dateError}</p> : null}
        </>
      ) : null}
    </>
  );
}
