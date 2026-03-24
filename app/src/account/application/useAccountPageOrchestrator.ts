import {
  useAccountsPageModel,
  type AccountsCorePort,
} from '../../app/accounts/useAccountsPageModel';
import { useAccountCommands } from './useAccountCommands';
import { useManageAccountFlow } from './useManageAccountFlow';
import { useTransactionsList } from './useTransactionsList';
import { useTransactionSubmitFlow } from './useTransactionSubmitFlow';
import { useToast } from './useToast';

export type { AccountsCorePort };

export function useAccountPageOrchestrator(core: AccountsCorePort) {
  const baseModel = useAccountsPageModel(core);

  const accountCommands = useAccountCommands(baseModel);
  const manageAccountFlow = useManageAccountFlow(baseModel);
  const transactionsList = useTransactionsList(baseModel);
  const transactionSubmitFlow = useTransactionSubmitFlow(baseModel);
  const toast = useToast(baseModel);

  return {
    ...baseModel,
    accountCommands,
    manageAccountFlow,
    transactionsList,
    transactionSubmitFlow,
    toast,
  };
}
