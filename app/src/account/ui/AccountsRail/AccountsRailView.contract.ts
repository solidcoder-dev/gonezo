import type { ViewProps } from '../../../shared/ui/ViewProps';

export type AccountsRailAccountView = {
  accountId: string;
  name: string;
  type?: string;
  formattedBalance: string;
  trend?: {
    points: Array<{ value: number }>;
    ariaLabel: string;
  };
  isDefault: boolean;
};

export type AccountsRailViewProps = ViewProps<
  {
    previewLimit: number;
  },
  {
    accounts: AccountsRailAccountView[];
  },
  {
    allAccountsOpen: boolean;
  },
  {
    loading: boolean;
    disabled?: boolean;
  },
  {
    openAllAccounts: () => void;
    closeAllAccounts: () => void;
    selectAccount: (accountId: string) => void;
    manageAccount: (accountId: string) => void;
  }
>;
