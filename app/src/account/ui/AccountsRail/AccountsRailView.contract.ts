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
  Record<string, never>,
  {
    accounts: AccountsRailAccountView[];
  },
  Record<string, never>,
  {
    loading: boolean;
    disabled?: boolean;
  },
  {
    createAccount: () => void;
    selectAccount: (accountId: string) => void;
    manageAccount: (accountId: string) => void;
  }
>;
