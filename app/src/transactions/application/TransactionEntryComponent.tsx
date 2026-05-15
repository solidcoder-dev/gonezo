import { useMemo } from 'react';
import { createExpectedGateway } from '../../expected/infrastructure/expectedGateway';
import { createLedgerGateway } from '../../ledger/infrastructure/ledgerGateway';
import { createSchedulingGateway } from '../../scheduling/infrastructure/schedulingGateway';
import { createTaxonomyGateway } from '../../taxonomy/infrastructure/taxonomyGateway';
import { TransactionEntryView } from '../ui/TransactionEntryView';
import type { TransactionEntryComponentProps } from './TransactionEntryComponent.contract';
import { useTransactionEntryModel } from './useTransactionEntryModel';

export type {
  TransactionEntryComponentProps,
  TransactionEntryComponentProvided,
  TransactionEntryComponentRequired,
} from './TransactionEntryComponent.contract';

export function TransactionEntryComponent({ required, provided = {} }: TransactionEntryComponentProps) {
  const ports = useMemo(() => ({
    ledger: createLedgerGateway(required.context.core),
    scheduling: createSchedulingGateway(required.context.core),
    expected: createExpectedGateway(required.context.core),
    taxonomy: createTaxonomyGateway(required.context.core),
  }), [required.context.core]);

  const model = useTransactionEntryModel({
    ports,
    accountId: required.context.accountId,
    enabled: required.config.enabled,
    prefillRequest: required.config.prefillRequest,
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
