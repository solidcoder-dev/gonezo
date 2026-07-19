import type { ViewProps } from '../../shared/ui/ViewProps';
import type { AccountSummaryView } from '../../account/application/accountView.types';

export type VoiceMovementExperimentViewModel = Readonly<{
  enabled: boolean;
  available: boolean;
  saving: boolean;
  disabled: boolean;
  description?: string;
}>;

export type ProfilePageViewProps = ViewProps<
  Record<string, never>,
  {
    accounts: AccountSummaryView[];
    voiceMovementExperiment: VoiceMovementExperimentViewModel;
  },
  {
    favoriteAccountId: string;
  },
  {
    disabled: boolean;
  },
  {
    selectFavoriteAccount: (accountId: string) => void;
    addAccount: () => void;
    importBackup: () => void;
    exportBackup: () => void;
    manageTaxonomy: () => void;
    setVoiceMovementExperimentEnabled: (enabled: boolean) => void;
  }
>;
