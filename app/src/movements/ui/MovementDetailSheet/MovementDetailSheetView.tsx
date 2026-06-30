import type { ReactNode } from 'react';
import { formatCurrencyAmount } from '../../../shared/utils/formatting';
import { SheetView } from '../../../shared/ui/SheetView';
import '../../../shared/ui/detailSheet.css';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import { MovementSplitManagerView, type MovementSplitItemView } from './MovementSplitManagerView';

export type MovementAmountKindView = 'income' | 'expense' | 'transfer' | 'scheduled';

export type MovementDetailActionView = {
  key: string;
  label: string;
  variant?: 'primary' | 'text' | 'danger' | 'text-danger';
  disabled?: boolean;
  onClick: () => void;
};

export type MovementDetailDataView = {
  title: string;
  kicker: string;
  iconClassName: string;
  amount: {
    kind: MovementAmountKindView;
    sign?: ReactNode;
    value: string;
    currency: string;
  };
  meta: Array<{
    label: string;
    value: ReactNode;
  }>;
  ignored?: boolean;
  splitItems?: MovementSplitItemView[];
  actions?: MovementDetailActionView[];
};

export type MovementDetailSheetViewProps = ViewProps<
  {
    ariaLabel: string;
    closeLabel?: string;
  },
  MovementDetailDataView,
  {
    open: boolean;
  },
  {
    disabled?: boolean;
  },
  {
    close: () => void;
  }
>;

function actionClassName(variant: MovementDetailActionView['variant']): string | undefined {
  if (variant === 'text') {
    return 'text-button';
  }
  if (variant === 'danger') {
    return 'danger-button';
  }
  if (variant === 'text-danger') {
    return 'text-button danger-button';
  }
  return undefined;
}

function formatDetailAmount(amount: string, currency: string): string {
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    return `${amount} ${currency}`;
  }
  return formatCurrencyAmount(Math.abs(numeric).toString(), currency);
}

export function MovementDetailSheetView({ required, provided }: MovementDetailSheetViewProps) {
  const { config, data, state, status } = required;
  const closeLabel = config.closeLabel ?? 'Close movement details';

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: config.ariaLabel,
          closeLabel,
        },
        data: {
          header: (
            <div className="detail-sheet-header">
              <div className="detail-sheet-title">
                <span className="detail-sheet-kicker">
                  <i className={data.iconClassName} aria-hidden />
                  <span>{data.kicker}</span>
                </span>
                <div className="detail-sheet-title-line">
                  <h3>{data.title}</h3>
                  {data.ignored ? <span className="movement-detail-ignored-chip">Ignored</span> : null}
                </div>
              </div>
              <button
                type="button"
                className="text-button icon-button"
                aria-label={closeLabel}
                onClick={provided.commands.close}
              >
                <i className="bi bi-x-lg" aria-hidden />
              </button>
            </div>
          ),
          body: (
            <>
              <div className={`detail-sheet-amount detail-sheet-amount--${data.amount.kind}`}>
                {data.amount.sign}
                {formatDetailAmount(data.amount.value, data.amount.currency)}
              </div>
              <div className="detail-meta-grid">
                {data.meta.map((item) => (
                  <div key={item.label} className="detail-meta-item">
                    <span className="hint detail-meta-label">{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
              <MovementSplitManagerView
                required={{
                  config: {},
                  data: { items: data.splitItems ?? [] },
                  state: {},
                  status,
                }}
                provided={{ commands: {} }}
              />
              {data.actions && data.actions.length > 0 ? (
                <div className="detail-actions">
                  {data.actions.map((action) => (
                    <button
                      key={action.key}
                      type="button"
                      className={actionClassName(action.variant)}
                      disabled={status.disabled || action.disabled}
                      onClick={action.onClick}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ),
        },
        state,
        status,
      }}
      provided={provided}
    />
  );
}
