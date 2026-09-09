import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { AmountVisibility } from '../../../shared/domain/amountVisibility';

export type CurrencyAccountView = {
  accountId: string;
  name: string;
  type: string;
  formattedBalance: string;
  currency: string;
  status: 'active' | 'archived';
  isDefault: boolean;
};

export type CurrencyAccountsSheetViewProps = ViewProps<
  { amountVisibility?: AmountVisibility },
  { accounts: CurrencyAccountView[]; currency: string },
  Record<string, never>,
  { loadPhase: 'loading' | 'empty' | 'success' | 'error'; error?: string },
  { close: () => void; selectAccount: (accountId: string) => void; manageAccount: (accountId: string) => void }
>;
