import { AccountSection } from './sections/AccountSection';
import { ImportSection } from './sections/ImportSection';
import { ManageAccountSheetSection } from './sections/ManageAccountSheetSection';
import { StatusSection } from './sections/StatusSection';
import { TransactionsSection } from './sections/TransactionsSection';
import type { AccountPageViewProps } from './accountPageView.contract';

export type { AccountPageViewProps } from './accountPageView.contract';

export function AccountPageView({ required, provided }: AccountPageViewProps) {
  if (required.screen.loadPhase === 'loading') {
    return (
      <section className="card">
        <p>Loading accounts...</p>
      </section>
    );
  }

  return (
    <section className="card">
      <StatusSection
        required={{
          screen: required.screen,
          toast: required.toast,
        }}
        provided={provided.toast}
      />

      <AccountSection
        required={{
          account: required.account,
          isPostingTransaction: required.composer.isSubmitting,
        }}
        provided={{
          account: provided.account,
          imports: provided.imports,
        }}
      />

      {required.account.accounts.length > 0 ? (
        <TransactionsSection
          required={{
            account: required.account,
            composer: required.composer,
            transactions: required.transactions,
          }}
          provided={{
            composer: provided.composer,
            transactions: provided.transactions,
          }}
        />
      ) : null}

      <ManageAccountSheetSection
        required={{ account: required.account }}
        provided={{ account: provided.account }}
      />

      <ImportSection
        required={{
          imports: required.imports,
          accountsCount: required.account.accounts.length,
        }}
        provided={{ imports: provided.imports }}
      />
    </section>
  );
}
