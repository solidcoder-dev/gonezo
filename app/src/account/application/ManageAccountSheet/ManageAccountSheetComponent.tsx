import { useMemo } from 'react';
import { createLedgerGateway } from '../../../ledger/application/ledgerGateway';
import { ManageAccountSheetView } from '../../ui/ManageAccountSheet/ManageAccountSheetView';
import type { ManageAccountSheetComponentProps } from './ManageAccountSheetComponent.contract';
import { useAccountManagementModel } from './useAccountManagementModel';

export type { ManageAccountSheetComponentProps } from './ManageAccountSheetComponent.contract';

export function ManageAccountSheetComponent({ required, provided }: ManageAccountSheetComponentProps) {
  const { core, accountId } = required.context;
  const ports = useMemo(() => ({ ledger: createLedgerGateway(core) }), [core]);
  const model = useAccountManagementModel({
    ports,
    accountId,
    enabled: required.config.open,
    refreshSignal: required.config.refreshSignal,
    confirm: (message) => window.confirm(message),
    events: {
      onAccountMutated: () => provided.events.onAccountMutated?.(),
      onAccountDeleted: () => provided.events.onAccountDeleted?.(),
      onError: provided.events.onError,
    },
  });

  if (!required.config.open || !accountId) return null;

  return (
    <ManageAccountSheetView
      required={{
        config: {},
        data: { summary: model.state.summary },
        state: { open: true, name: model.state.manageName },
        status: { loading: model.state.loading, managing: model.state.managing, error: model.state.error },
      }}
      provided={{
        commands: {
          close: provided.events.onClose,
          setName: model.commands.setManageName,
          submitRename: model.commands.submitRename,
          archive: model.commands.archiveAccount,
          delete: model.commands.deleteAccount,
        },
      }}
    />
  );
}
