import { TransactionEntryView } from '../ui/TransactionEntryView';
import type { TransactionEntryComponentProps } from './TransactionEntryComponent.contract';
import { useTransactionEntryModel } from './useTransactionEntryModel';

export type {
  TransactionEntryComponentProps,
  TransactionEntryComponentProvided,
  TransactionEntryComponentRequired,
} from './TransactionEntryComponent.contract';

export function TransactionEntryComponent({ required, provided = {} }: TransactionEntryComponentProps) {
  const model = useTransactionEntryModel({
    core: required.context.core,
    accountId: required.context.accountId,
    enabled: required.config.enabled,
    onRecorded: provided.events?.onRecorded,
    onError: provided.events?.onError,
  });

  if (!required.config.enabled || !required.context.accountId) {
    return null;
  }

  return (
    <>
      {model.error ? (
        <div className="banner error" role="alert">
          {model.error}
        </div>
      ) : null}
      <TransactionEntryView required={model.required} provided={model.provided} />
    </>
  );
}
