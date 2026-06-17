import { StatusSection } from './StatusSection';
import type { AccountPageViewProps } from './accountPageView.contract';

export type { AccountPageViewProps } from './accountPageView.contract';

export function AccountPageView({ required, provided }: AccountPageViewProps) {
  return (
    <section className="app-screen">
      <StatusSection
        required={{
          screen: required.screen,
          toast: required.toast,
        }}
        provided={provided.toast}
      />

      {required.sections.netWorthSummary}
      {required.sections.accountHub}
      {required.sections.accountSummary}
      {required.sections.transactionEntry}
      {required.sections.recentTransactions}
      {required.sections.transactionsImport}
    </section>
  );
}
