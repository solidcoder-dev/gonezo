import type { ViewProps } from '../ViewProps';

export type FloatingActionButtonViewProps = ViewProps<
  {
    ariaLabel: string;
    iconClassName: string;
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
