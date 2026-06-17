import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLedgerGateway } from '../../ledger/application/ledgerGateway';
import { SheetView } from '../../shared/ui/SheetView';
import { useAccountHubModel } from '../../account/application/AccountHub/useAccountHubModel';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import { ProfilePageView } from '../ui/ProfilePageView';
import type { LoadPhase } from '../../account/application/accountPage.types';

export type ProfilePageRequired = {
  context: {
    core: AccountWorkspacePort;
  };
  config: {
    refreshSignal: boolean;
  };
};

export type ProfilePageProvided = {
  events?: {
    onLoadPhaseChanged?: (phase: LoadPhase) => void;
    onSelectedAccountChanged?: (accountId: string | null) => void;
    onAccountsCountChanged?: (count: number) => void;
    onImportRequested?: () => void;
    onBackupRequested?: () => void;
    onAccountMutated?: () => void;
    onError?: (error: { message: string }) => void;
  };
};

type ProfilePageProps = {
  required: ProfilePageRequired;
  provided?: ProfilePageProvided;
};

export function ProfilePage({ required, provided = {} }: ProfilePageProps) {
  const navigate = useNavigate();
  const ports = useMemo(() => ({
    ledger: createLedgerGateway(required.context.core),
    preferences: required.context.core,
  }), [required.context.core]);
  const model = useAccountHubModel({
    ports,
    refreshSignal: required.config.refreshSignal,
    events: provided.events,
  });
  const {
    accounts,
    supportedCurrencies,
    defaultAccountId,
    createFormOpen,
    createName,
    createCurrency,
    createOpeningBalance,
    creating,
    controlsDisabled,
  } = model.state;
  const {
    submitCreateAccount,
    setDefaultAccount,
    clearDefaultAccount,
    openCreateForm,
    closeCreateForm,
    setCreateName,
    setCreateCurrency,
    setCreateOpeningBalance,
  } = model.commands;

  async function selectFavoriteAccount(accountId: string) {
    if (accountId) {
      await setDefaultAccount(accountId);
    } else {
      await clearDefaultAccount();
    }
    provided.events?.onAccountMutated?.();
  }

  return (
    <>
      {createFormOpen ? (
        <SheetView
          required={{
            config: {
              ariaLabel: 'Create account',
              title: 'Add account',
              closeLabel: 'Close add account sheet',
              panelClassName: 'import-sheet',
              contentClassName: 'import-sheet-content',
            },
            data: {
              body: (
                <form className="stack" onSubmit={submitCreateAccount} aria-busy={creating}>
                  <input
                    aria-label="Account name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Account name"
                    autoComplete="off"
                  />
                  <input
                    aria-label="Opening balance"
                    value={createOpeningBalance}
                    onChange={(event) => setCreateOpeningBalance(event.target.value)}
                    placeholder="Opening balance (optional)"
                    inputMode="decimal"
                  />
                  <label className="stack">
                    Currency
                    <select
                      aria-label="Currency"
                      value={createCurrency}
                      onChange={(event) => setCreateCurrency(event.target.value)}
                    >
                      {supportedCurrencies.map((currency) => (
                        <option key={currency} value={currency}>
                          {currency}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" disabled={creating}>
                    {creating ? 'Creating account...' : 'Create account'}
                  </button>
                </form>
              ),
            },
            state: { open: true },
            status: {},
          }}
          provided={{ commands: { close: closeCreateForm } }}
        />
      ) : null}
      <ProfilePageView
        required={{
          config: {},
          data: {
            accounts,
          },
          state: {
            favoriteAccountId: defaultAccountId ?? '',
          },
          status: {
            disabled: controlsDisabled,
          },
        }}
        provided={{
          commands: {
            selectFavoriteAccount: (accountId) => {
              void selectFavoriteAccount(accountId).catch((error: unknown) => {
                provided.events?.onError?.({ message: error instanceof Error ? error.message : 'Unknown error' });
              });
            },
            addAccount: openCreateForm,
            importBackup: provided.events?.onImportRequested ?? (() => undefined),
            exportBackup: provided.events?.onBackupRequested ?? (() => undefined),
            manageTaxonomy: () => navigate('/taxonomy'),
          },
        }}
      />
    </>
  );
}
