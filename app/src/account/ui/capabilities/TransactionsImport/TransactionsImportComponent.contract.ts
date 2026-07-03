import type { LoadPhase, SubmitPhase } from '../../../application/accountPage.types';
import type {
  TransactionsImportRequest,
  TransactionsImportResult,
} from '../../../../imports/application/transactionsImport.types';
import type { TransactionsImportFileReaderPort } from '../../../../imports/application/transactionsImportFileReader.port';

export type TransactionsImportComponentRequired = {
  context: {
    fileReader: TransactionsImportFileReaderPort;
  };
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
