import type { ViewProps } from '../ViewProps';

export type BottomNavigationItemView = {
  id: string;
  label: string;
  iconClassName: string;
};

export type BottomNavigationViewProps = ViewProps<
  {
    ariaLabel: string;
  },
  {
    items: BottomNavigationItemView[];
  },
  {
    activeItemId: string;
  },
  {
    disabled?: boolean;
  },
  {
    select: (itemId: string) => void;
  }
>;
