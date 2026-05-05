import type { LoadPhase } from '../domain/accountPage.types';
import type { AccountsCorePort } from './accountsCore.port';

export type AccountHubComponentRequired = {
  context: {
    core: AccountsCorePort;
  };
  config: {
    refreshSignal: boolean;
  };
};

export type AccountHubComponentProvided = {
  events?: {
    onSelectedAccountChanged?: (accountId: string | null) => void;
    onAccountsCountChanged?: (count: number) => void;
    onImportRequested?: () => void;
    onLoadPhaseChanged?: (loadPhase: LoadPhase) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type AccountHubComponentProps = {
  required: AccountHubComponentRequired;
  provided?: AccountHubComponentProvided;
};
