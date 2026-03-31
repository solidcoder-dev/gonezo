import { StatusSection } from './sections/StatusSection';
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

      {required.sections.accounts}
      {required.sections.transactionEntry}
      {required.sections.recentTransactions}
      {required.sections.transactionsImport}
    </section>
  );
}
