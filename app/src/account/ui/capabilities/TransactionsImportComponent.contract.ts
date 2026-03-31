import type { LoadPhase, SubmitPhase } from '../../domain/accountPage.types';
import type {
  TransactionsImportPolicyInput,
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
    submit: (input: {
      fileBase64: string;
      policy?: TransactionsImportPolicyInput;
    }) => Promise<TransactionsImportResult>;
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
