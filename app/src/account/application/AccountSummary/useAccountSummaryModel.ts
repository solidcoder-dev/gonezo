import { useCallback, useState } from 'react';
import type { LedgerGatewayPort } from '../../../ledger/application/ledgerGateway.port';
import type { AccountSummaryComponentProvided } from './AccountSummaryComponent.contract';
import { useAccountManagementModel } from '../ManageAccountSheet/useAccountManagementModel';

export type AccountSummaryState = {
  name: string;
  currency: string;
  balanceAmount: string;
};

export type AccountSummaryModelInput = {
  ports: { ledger: LedgerGatewayPort };
  accountId: string | null;
  enabled: boolean;
  refreshSignal: boolean;
  confirm: (message: string) => boolean;
  events?: AccountSummaryComponentProvided['events'];
};

export type AccountSummaryModelPorts = {
  ledger: LedgerGatewayPort;
};

export type AccountSummaryModel = {
  state: {
    loading: boolean;
    managing: boolean;
    error: string;
    summary: AccountSummaryState | null;
    manageOpen: boolean;
    manageName: string;
  };
  commands: {
    openManage: () => void;
    closeManage: () => void;
    setManageName: (value: string) => void;
    submitRename: (event: { preventDefault: () => void }) => Promise<void>;
    archiveAccount: () => Promise<void>;
    deleteAccount: () => Promise<void>;
  };
};

export function useAccountSummaryModel({
  ports,
  accountId,
  enabled,
  refreshSignal,
  confirm,
  events,
}: AccountSummaryModelInput): AccountSummaryModel {
  const [manageOpen, setManageOpen] = useState(false);
  const management = useAccountManagementModel({
    ports,
    accountId,
    enabled,
    refreshSignal,
    confirm,
    events: {
      onAccountMutated: (id) => {
        setManageOpen(false);
        events?.onAccountMutated?.(id);
      },
      onAccountDeleted: (id) => {
        setManageOpen(false);
        events?.onAccountDeleted?.(id);
      },
      onError: events?.onError,
    },
  });

  const openManage = useCallback(() => {
    setManageOpen(true);
  }, []);

  const closeManage = useCallback(() => {
    setManageOpen(false);
  }, []);

  return {
    state: {
      ...management.state,
      manageOpen,
    },
    commands: {
      ...management.commands,
      openManage,
      closeManage,
    },
  };
}
