import { SegmentedControlView } from '../../../shared/ui/SegmentedControlView';
import { AmountInputView } from '../../../shared/ui/AmountInput/AmountInputView';
import type { ViewProps } from '../../../shared/ui/ViewProps';

export type TransferFxModeView = 'auto_destination' | 'auto_rate';

export type TransferFxFieldsViewProps = ViewProps<
  {
    amountInLabel: string;
    fxLabel: string;
  },
  Record<string, never>,
  {
    amountIn: string;
    fxRate: string;
    fxMode: TransferFxModeView;
  },
  {
    disabled?: boolean;
    amountInError?: string;
    fxRateError?: string;
  },
  {
    changeAmountIn: (value: string) => void;
    changeFxRate: (value: string) => void;
    changeFxMode: (value: TransferFxModeView) => void;
  }
>;

function currencyFromLabel(label: string): string {
  return label.match(/\(([^)]+)\)/)?.[1] ?? '';
}

export function TransferFxFieldsView({ required, provided }: TransferFxFieldsViewProps) {
  const { config, state, status } = required;

  return (
    <div className="vstack gap-2 gz-item-editor">
      <AmountInputView
        required={{ config: { label: config.amountInLabel, currency: currencyFromLabel(config.amountInLabel) }, data: {}, state: { value: state.amountIn }, status: { disabled: status.disabled || state.fxMode === 'auto_destination', error: status.amountInError } }}
        provided={{ commands: { change: provided.commands.changeAmountIn } }}
      />

      <label className="vstack gap-2">
        <span className="visually-hidden">{config.fxLabel}</span>
        <input
          aria-label={config.fxLabel}
          type="number"
          min="0.0000001"
          step="0.0001"
          value={state.fxRate}
          onChange={(event) => provided.commands.changeFxRate(event.target.value)}
          inputMode="decimal"
          disabled={state.fxMode === 'auto_rate'}
          aria-invalid={Boolean(status.fxRateError)}
          aria-describedby={status.fxRateError ? 'composer-transfer-fx-rate-error' : undefined}
        />
      </label>
      {status.fxRateError ? <p id="composer-transfer-fx-rate-error" className="gz-field-error">{status.fxRateError}</p> : null}

      <SegmentedControlView<TransferFxModeView>
        required={{
          config: { ariaLabel: 'Transfer auto calculation mode', columns: 2 },
          data: {
            options: [
              { value: 'auto_destination', label: 'Auto amount in' },
              { value: 'auto_rate', label: 'Auto FX rate' },
            ],
          },
          state: { value: state.fxMode },
          status: { disabled: status.disabled },
        }}
        provided={{ commands: { select: provided.commands.changeFxMode } }}
      />
      <p className="gz-hint">Edit two values; the third one is calculated automatically.</p>
    </div>
  );
}
