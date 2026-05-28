import {
  TransactionsImportComponent as TransactionsImportFeature,
} from '../../../../imports';
import { SheetView } from '../../../../shared/ui/SheetView';
import type { TransactionsImportComponentProps } from './TransactionsImportComponent.contract';

export type {
  TransactionsImportComponentProps,
  TransactionsImportComponentProvided,
  TransactionsImportComponentRequired,
} from './TransactionsImportComponent.contract';

export function TransactionsImportComponent({ required, provided }: TransactionsImportComponentProps) {
  if (!required.state.isOpen) {
    return null;
  }

  return (
    <SheetView
      required={{
        config: {
          ariaLabel: 'Import backup',
          title: 'Import backup',
          closeLabel: 'Close import sheet',
          panelClassName: 'import-sheet',
        },
        data: {
          body: (
            <TransactionsImportFeature
              required={{
                accountsCount: required.state.accountsCount,
              }}
              provided={{
                submitImport: provided.commands.submit,
                onCompleted: provided.events?.onImported,
                onFailed: provided.events?.onImportFailed,
              }}
            />
          ),
        },
        state: { open: true },
        status: {},
      }}
      provided={{ commands: { close: provided.commands.close } }}
    />
  );
}
