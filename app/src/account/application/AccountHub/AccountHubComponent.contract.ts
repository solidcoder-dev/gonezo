import type { LoadPhase } from '../accountPage.types';
import type { LedgerAccountHubPort } from '../../../ledger/application/useLedgerAccounts';
import type { UserPreferencesPort } from '../accounts.port';

export type AccountHubComponentRequired = {
  context: {
    core: LedgerAccountHubPort & UserPreferencesPort;
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
    onBackupRequested?: () => void;
    onLoadPhaseChanged?: (loadPhase: LoadPhase) => void;
    onError?: (error: { message: string }) => void;
  };
};

export type AccountHubComponentProps = {
  required: AccountHubComponentRequired;
  provided?: AccountHubComponentProvided;
};
