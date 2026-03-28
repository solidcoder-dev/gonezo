import { AccountSection } from './sections/AccountSection';
import { ImportSection } from './sections/ImportSection';
import { ManageAccountSheetSection } from './sections/ManageAccountSheetSection';
import { StatusSection } from './sections/StatusSection';
import { TransactionsSection } from './sections/TransactionsSection';
import type { AccountPageViewProps } from './accountPageView.contract';

export type { AccountPageViewProps } from './accountPageView.contract';

export function AccountPageView({ state, actions }: AccountPageViewProps) {
  if (state.screen.loadPhase === 'loading') {
    return (
      <section className="card">
        <p>Loading accounts...</p>
      </section>
    );
  }

  return (
    <section className="card">
      <StatusSection screen={state.screen} toast={state.toast} toastActions={actions.toast} />

      <AccountSection
        account={state.account}
        isPostingTransaction={state.composer.isSubmitting}
        accountActions={actions.account}
        importsActions={actions.imports}
      />

      {state.account.accounts.length > 0 ? (
        <TransactionsSection
          account={state.account}
          composer={state.composer}
          transactions={state.transactions}
          composerActions={actions.composer}
          transactionActions={actions.transactions}
        />
      ) : null}

      <ManageAccountSheetSection account={state.account} accountActions={actions.account} />

      <ImportSection
        imports={state.imports}
        accountsCount={state.account.accounts.length}
        importActions={actions.imports}
      />
    </section>
  );
}
