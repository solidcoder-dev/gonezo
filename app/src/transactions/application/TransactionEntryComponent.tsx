import { useMemo } from 'react';
import { createExpectedGateway } from '../../expected/application/expectedGateway';
import { createLedgerGateway } from '../../ledger/application/ledgerGateway';
import { createSchedulingGateway } from '../../scheduling/application/schedulingGateway';
import { createTaxonomyGateway } from '../../taxonomy/application/taxonomyGateway';
import { TransactionEntryView } from '../ui/TransactionComposer/TransactionEntryView';
import type { TransactionEntryComponentProps } from './TransactionEntryComponent.contract';
import type { TransactionEntryModelClock, TransactionEntryModelIdGenerator } from './useTransactionEntryModel';
import { useTransactionEntryModel } from './useTransactionEntryModel';

export type {
  TransactionEntryComponentProps,
  TransactionEntryComponentProvided,
  TransactionEntryComponentRequired,
} from './TransactionEntryComponent.contract';

const SYSTEM_TRANSACTION_CLOCK: TransactionEntryModelClock = {
  now: () => new Date(),
  todayIso: () => new Date().toISOString().slice(0, 10),
  resolveOccurredAt: (dateInput) => {
    const raw = dateInput.trim();
    if (!raw) {
      return new Date().toISOString();
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [year, month, day] = raw.split('-').map((value) => Number(value));
      const now = new Date();
      return new Date(
        year,
        month - 1,
        day,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      ).toISOString();
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }

    return new Date().toISOString();
  },
  dayOfMonthFromDateInput: (dateInput) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return String(Number(dateInput.slice(8, 10)));
    }
    const parsed = new Date(dateInput);
    if (!Number.isNaN(parsed.getTime())) {
      return String(parsed.getUTCDate());
    }
    return String(new Date().getUTCDate());
  },
  weekDayIsoFromDateInput: (dateInput) => {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
      ? new Date(`${dateInput}T12:00:00`)
      : new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
      return '1';
    }
    const day = parsed.getDay();
    return String(day === 0 ? 7 : day);
  },
  resolveTimeZoneId: () => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  },
};

const BROWSER_ID_GENERATOR: TransactionEntryModelIdGenerator = {
  nextId: () => crypto.randomUUID(),
};

export function TransactionEntryComponent({ required, provided = {} }: TransactionEntryComponentProps) {
  const ports = useMemo(() => ({
    ledger: createLedgerGateway(required.context.core),
    scheduling: createSchedulingGateway(required.context.core),
    expected: createExpectedGateway(required.context.core),
    taxonomy: createTaxonomyGateway(required.context.core),
  }), [required.context.core]);

  const model = useTransactionEntryModel({
    ports,
    clock: SYSTEM_TRANSACTION_CLOCK,
    idGenerator: BROWSER_ID_GENERATOR,
    accountId: required.context.accountId,
    enabled: required.config.enabled,
    prefillRequest: required.config.prefillRequest,
    openSignal: required.config.openSignal,
    initialMode: required.config.initialMode,
    movementAccountContext: required.config.movementAccountContext,
    onRecorded: provided.events?.onRecorded,
    onClosed: provided.events?.onClosed,
    onCollapsed: provided.events?.onCollapsed,
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
