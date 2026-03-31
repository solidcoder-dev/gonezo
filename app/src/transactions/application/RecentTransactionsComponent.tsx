import { TransactionHistoryView } from '../ui/TransactionHistoryView';
import type { RecentTransactionsComponentProps } from './RecentTransactionsComponent.contract';
import { useTransactionHistoryModel } from './useTransactionHistoryModel';

export type {
  RecentTransactionsComponentProps,
  RecentTransactionsComponentProvided,
  RecentTransactionsComponentRequired,
} from './RecentTransactionsComponent.contract';

export function RecentTransactionsComponent({ required, provided = {} }: RecentTransactionsComponentProps) {
  const model = useTransactionHistoryModel({
    core: required.context.core,
    accountId: required.context.accountId,
    enabled: required.config.enabled,
    refreshSignal: required.config.refreshSignal,
    onVoided: provided.events?.onVoided,
    onError: provided.events?.onError,
  });

  if (!required.config.enabled || !required.context.accountId) {
    return null;
  }

  const historyReady = !model.required.status.loading || model.required.state.items.length > 0;

  return (
    <>
      {model.error ? (
        <div className="banner error" role="alert">
          {model.error}
        </div>
      ) : null}

      {model.toast.message ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{model.toast.message}</span>
          {model.toast.actionLabel ? (
            <button type="button" className="text-button" onClick={model.toast.runAction}>
              {model.toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={model.toast.dismiss}>
            Dismiss
          </button>
        </div>
      ) : null}

      {historyReady ? (
        <TransactionHistoryView required={model.required} provided={model.provided} />
      ) : null}
    </>
  );
}
