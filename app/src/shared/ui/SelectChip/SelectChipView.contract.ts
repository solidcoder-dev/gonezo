import type { ViewProps } from '../ViewProps';

export type SelectChipViewProps = ViewProps<
  {
    label: string;
    ariaLabel: string;
    open?: boolean;
    tone?: 'neutral' | 'expense' | 'income' | 'transfer';
  },
  Record<string, never>,
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    press: () => void;
  }
>;
