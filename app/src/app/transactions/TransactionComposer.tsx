import type { FormEvent } from 'react';
import type { TransactionType } from '../accounts/useAccountsPageModel';
import { AmountSpinnerInput } from './components/AmountSpinnerInput';
import { CounterpartyField } from './components/CounterpartyField';
import { QuickDateSelector } from './components/QuickDateSelector';
import { StepSelector } from './components/StepSelector';
import { TransactionTypeToggle } from './components/TransactionTypeToggle';

type Props = {
  transactionType: TransactionType;
  amount: string;
  date: string;
  counterparty: string;
  amountError?: string;
  dateError?: string;
  disabled: boolean;
  accountLabel: string;
  accountCurrency: string;
  showStepSettings: boolean;
  isEditing: boolean;
  stepSize: string;
  onChangeType: (value: TransactionType) => void;
  onSetAmount: (value: string) => void;
  onFormatAmount: () => void;
  onChangeDate: (value: string) => void;
  onChangeCounterparty: (value: string) => void;
  onToday: () => void;
  onYesterday: () => void;
  onToggleStepSettings: () => void;
  onChangeStepSize: (value: string) => void;
  onCancelEdit: () => void;
  onRollUnits: (units: number) => void;
  onSubmit: (event: FormEvent) => Promise<void> | void;
};

const DEFAULT_VISIBLE_STEPS = ['0.01', '0.10', '1.00', '5.00'];
const DEFAULT_MORE_STEPS = ['0.05', '0.25', '0.50', '2.00', '10.00'];

export function TransactionComposer({
  transactionType,
  amount,
  date,
  counterparty,
  amountError,
  dateError,
  disabled,
  accountLabel,
  accountCurrency,
  showStepSettings,
  isEditing,
  stepSize,
  onChangeType,
  onSetAmount,
  onFormatAmount,
  onChangeDate,
  onChangeCounterparty,
  onToday,
  onYesterday,
  onToggleStepSettings,
  onChangeStepSize,
  onCancelEdit,
  onRollUnits,
  onSubmit,
}: Props) {
  const submitText = disabled ? (isEditing ? 'Saving transaction...' : 'Posting transaction...') : isEditing ? 'Save changes' : 'Post transaction';

  return (
    <form className="stack section-gap" onSubmit={onSubmit} aria-busy={disabled}>
      <h2>Add transaction</h2>
      <p className="hint">Posting to {accountLabel} in {accountCurrency}</p>

      <TransactionTypeToggle value={transactionType} disabled={disabled} onChange={onChangeType} />

      <AmountSpinnerInput
        amount={amount}
        disabled={disabled}
        onRollUnits={onRollUnits}
        onSetAmount={onSetAmount}
        onFormatAmount={onFormatAmount}
      />
      {amountError ? <p className="field-error">{amountError}</p> : null}

      <StepSelector
        disabled={disabled}
        stepSize={stepSize}
        showMore={showStepSettings}
        visibleSteps={DEFAULT_VISIBLE_STEPS}
        moreSteps={DEFAULT_MORE_STEPS}
        onToggleMore={onToggleStepSettings}
        onChangeStepSize={onChangeStepSize}
      />

      <QuickDateSelector
        date={date}
        disabled={disabled}
        onToday={onToday}
        onYesterday={onYesterday}
        onChangeDate={onChangeDate}
      />
      {dateError ? <p className="field-error">{dateError}</p> : null}

      <CounterpartyField
        transactionType={transactionType}
        value={counterparty}
        disabled={disabled}
        onChange={onChangeCounterparty}
      />

      <div className="quick-row composer-actions">
        <button type="submit" className="primary-cta" disabled={disabled}>
          {submitText}
        </button>
        {isEditing ? (
          <button type="button" className="text-button" disabled={disabled} onClick={onCancelEdit}>
            Cancel edit
          </button>
        ) : null}
      </div>
    </form>
  );
}
