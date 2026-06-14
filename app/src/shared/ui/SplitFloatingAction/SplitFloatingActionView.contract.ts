import type { ReactNode } from 'react';
import type { ViewProps } from '../ViewProps';

export type SplitFloatingActionViewProps = ViewProps<
  {
    ariaLabel: string;
    primaryLabel: string;
    secondaryLabel: string;
    primaryAriaLabel?: string;
    secondaryAriaLabel?: string;
    open?: boolean;
    placement?: 'bottom-right';
  },
  {
    primaryContent?: ReactNode;
  },
  Record<string, never>,
  {
    disabled?: boolean;
  },
  {
    primary: () => void;
    secondary: () => void;
  }
>;
