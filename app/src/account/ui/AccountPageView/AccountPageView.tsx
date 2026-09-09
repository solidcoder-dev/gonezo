import { StatusSection } from './StatusSection';
import type { AccountPageViewProps } from './accountPageView.contract';

export type { AccountPageViewProps } from './accountPageView.contract';

export function AccountPageView({ required, provided }: AccountPageViewProps) {
  return (
    <section className="gz-app-screen">
      {required.sections.pageHeader}

      <StatusSection
        required={{
          screen: required.screen,
        }}
        provided={provided}
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
