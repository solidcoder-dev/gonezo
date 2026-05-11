import type { LoadPhase, SubmitPhase } from '../../domain/accountPage.types';
import type {
  TransactionsImportRequest,
  TransactionsImportResult,
} from '../../../imports/domain/transactionsImport.types';

export type TransactionsImportComponentRequired = {
  state: {
    accountsCount: number;
    isOpen: boolean;
  };
  status: {
    loadPhase: LoadPhase;
    submitPhase: SubmitPhase;
  };
};

export type TransactionsImportComponentProvided = {
  commands: {
    open: () => void;
    close: () => void;
    submit: (input: TransactionsImportRequest) => Promise<TransactionsImportResult>;
  };
  events?: {
    onImported?: (result: TransactionsImportResult) => void;
    onImportFailed?: (message: string) => void;
  };
};

export type TransactionsImportComponentProps = {
  required: TransactionsImportComponentRequired;
  provided: TransactionsImportComponentProvided;
};
