import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { LedgerAccountItem } from '../../ledger/application/ledger.port';
import type { ComposerMode, TransactionFieldErrors } from './transactions.types';
import { syncTransferFxFields, type SyncedTransferFxFields, type TransferFxMode } from '../domain/transferFx';

type UseTransactionTransferFxModelInput = {
  accounts: LedgerAccountItem[];
  accountId: string | null;
  accountCurrency: string;
  composerMode: ComposerMode;
  transactionAmount: string;
  setFieldErrors: Dispatch<SetStateAction<TransactionFieldErrors>>;
};

export function useTransactionTransferFxModel(input: UseTransactionTransferFxModelInput) {
  const {
    accounts,
    accountId,
    accountCurrency,
    composerMode,
    transactionAmount,
    setFieldErrors,
  } = input;
  const [transferToAccountId, setTransferToAccountId] = useState('');
  const [transferAmountIn, setTransferAmountIn] = useState('');
  const [transferFxRate, setTransferFxRate] = useState('1');
  const [transferFxMode, setTransferFxMode] = useState<TransferFxMode>('auto_destination');

  const transferTargetOptions = useMemo(
    () => accounts.filter((account) => account.id !== accountId),
    [accounts, accountId],
  );
  const selectedTransferTarget = useMemo(
    () => transferTargetOptions.find((account) => account.id === transferToAccountId),
    [transferTargetOptions, transferToAccountId],
  );
  const transferDestinationCurrency = selectedTransferTarget?.currency ?? '';
  const transferCrossCurrency = Boolean(
    transferToAccountId
    && transferDestinationCurrency
    && transferDestinationCurrency.toUpperCase() !== accountCurrency.toUpperCase(),
  );

  function reset() {
    setTransferAmountIn('');
    setTransferFxRate('1');
    setTransferFxMode('auto_destination');
  }

  function setDefaultTargetForAccounts(nextAccounts: LedgerAccountItem[], nextAccountId: string | null) {
    setTransferToAccountId((previous) =>
      nextAccounts.find((item) => item.id === previous && item.id !== nextAccountId)?.id
      ?? nextAccounts.find((item) => item.id !== nextAccountId)?.id
      ?? '',
    );
  }

  function applyTransferFxFields(fields: SyncedTransferFxFields) {
    if (fields.transferAmountIn !== undefined) {
      setTransferAmountIn(fields.transferAmountIn);
    }
    if (fields.transferFxRate !== undefined) {
      setTransferFxRate(fields.transferFxRate);
    }
  }

  function isTransferCrossCurrency(targetAccountId: string): boolean {
    const target = accounts.find((account) => account.id === targetAccountId);
    if (!target) {
      return false;
    }
    return target.currency.toUpperCase() !== accountCurrency.toUpperCase();
  }

  function syncForTransferMode() {
    applyTransferFxFields(syncTransferFxFields({
      sourceAmount: transactionAmount,
      destinationAmount: transferAmountIn,
      rate: transferFxRate,
      mode: transferFxMode,
      crossCurrency: isTransferCrossCurrency(transferToAccountId),
      normalizeRate: transferFxMode === 'auto_destination',
    }));
  }

  function syncSourceAmount(normalizedAmount: string) {
    if (composerMode !== 'transfer') {
      return;
    }

    applyTransferFxFields(syncTransferFxFields({
      sourceAmount: normalizedAmount,
      destinationAmount: transferAmountIn,
      rate: transferFxRate,
      mode: transferFxMode,
      crossCurrency: isTransferCrossCurrency(transferToAccountId),
    }));
  }

  function setTransferTargetValue(value: string) {
    setTransferToAccountId(value);
    setFieldErrors((previous) => ({
      ...previous,
      transferAmountIn: undefined,
      transferFxRate: undefined,
    }));

    if (!value) {
      setTransferAmountIn('');
      setTransferFxRate('1');
      return;
    }

    applyTransferFxFields(syncTransferFxFields({
      sourceAmount: transactionAmount,
      destinationAmount: transferAmountIn,
      rate: transferFxRate,
      mode: transferFxMode,
      crossCurrency: isTransferCrossCurrency(value),
      normalizeRate: transferFxMode === 'auto_destination',
    }));
  }

  function setTransferAmountInValue(value: string) {
    const normalized = value.replace('-', '');
    setTransferAmountIn(normalized);
    setFieldErrors((previous) => ({ ...previous, transferAmountIn: undefined, transferFxRate: undefined }));

    if (composerMode !== 'transfer') {
      return;
    }
    if (!isTransferCrossCurrency(transferToAccountId)) {
      return;
    }
    if (transferFxMode !== 'auto_rate') {
      return;
    }
    applyTransferFxFields(syncTransferFxFields({
      sourceAmount: transactionAmount,
      destinationAmount: normalized,
      rate: transferFxRate,
      mode: transferFxMode,
      crossCurrency: true,
    }));
  }

  function setTransferFxRateValue(value: string) {
    const normalized = value.replace('-', '');
    setTransferFxRate(normalized);
    setFieldErrors((previous) => ({ ...previous, transferFxRate: undefined, transferAmountIn: undefined }));

    if (composerMode !== 'transfer') {
      return;
    }
    if (!isTransferCrossCurrency(transferToAccountId)) {
      applyTransferFxFields(syncTransferFxFields({
        sourceAmount: transactionAmount,
        destinationAmount: transferAmountIn,
        rate: normalized,
        mode: transferFxMode,
        crossCurrency: false,
      }));
      return;
    }
    if (transferFxMode !== 'auto_destination') {
      return;
    }
    applyTransferFxFields(syncTransferFxFields({
      sourceAmount: transactionAmount,
      destinationAmount: transferAmountIn,
      rate: normalized,
      mode: transferFxMode,
      crossCurrency: true,
    }));
  }

  function setTransferFxModeValue(value: TransferFxMode) {
    setTransferFxMode(value);
    setFieldErrors((previous) => ({ ...previous, transferAmountIn: undefined, transferFxRate: undefined }));

    if (composerMode !== 'transfer') {
      return;
    }
    applyTransferFxFields(syncTransferFxFields({
      sourceAmount: transactionAmount,
      destinationAmount: transferAmountIn,
      rate: transferFxRate,
      mode: value,
      crossCurrency: isTransferCrossCurrency(transferToAccountId),
    }));
  }

  return {
    state: {
      transferToAccountId,
      transferTargetOptions,
      transferAmountIn,
      transferFxRate,
      transferFxMode,
      transferDestinationCurrency,
      transferCrossCurrency,
    },
    actions: {
      reset,
      setTransferToAccountId,
      setTransferAmountIn,
      setTransferFxRate,
      setTransferFxMode,
      setDefaultTargetForAccounts,
      syncForTransferMode,
      syncSourceAmount,
      setTransferTargetValue,
      setTransferAmountInValue,
      setTransferFxRateValue,
      setTransferFxModeValue,
    },
  };
}
