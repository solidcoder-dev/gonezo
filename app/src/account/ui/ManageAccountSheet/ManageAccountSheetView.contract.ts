import type { ViewProps } from '../../../shared/ui/ViewProps';

export type ManageAccountSheetViewProps = ViewProps<
  Record<string, never>,
  { summary: { name: string; currency: string; balanceAmount: string } | null },
  { open: boolean; name: string },
  { loading: boolean; managing: boolean; error: string },
  {
    close: () => void;
    setName: (value: string) => void;
    submitRename: (event: { preventDefault: () => void }) => Promise<void>;
    archive: () => Promise<void>;
    delete: () => Promise<void>;
  }
>;
