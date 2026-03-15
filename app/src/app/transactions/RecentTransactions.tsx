import type { LedgerTransactionListItem } from '../../domain/corePort';

export type RecentTransactionsProps = {
  items: LedgerTransactionListItem[];
  hiddenCount: number;
  expanded: boolean;
  disabled: boolean;
  onViewAll: () => void;
  onVoid: (transactionId: string) => void;
};

export function RecentTransactions({
  items,
  hiddenCount,
  expanded,
  disabled,
  onViewAll,
  onVoid,
}: RecentTransactionsProps) {
  return (
    <section className="stack section-gap">
      <h2>Recent transactions</h2>
      {items.length === 0 ? <p>No transactions yet.</p> : null}
      {items.length > 0 ? (
        <ul className="expense-list" aria-label="Recent transactions">
          {items.map((transaction) => (
            <li key={transaction.id} className="expense-item">
              <div className="expense-top-row">
                <div className="tx-head">
                  <span className={transaction.type === 'income' ? 'tx-badge income' : 'tx-badge expense'}>
                    {transaction.type === 'income' ? 'Income' : transaction.type === 'expense' ? 'Expense' : 'Transfer'}
                  </span>
                  <strong>
                    {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                    {transaction.amount} {transaction.currency}
                  </strong>
                </div>
                <span>{transaction.occurredAt}</span>
              </div>
              <span>{transaction.merchant || transaction.description || 'No description'}</span>
              {transaction.status !== 'posted' ? <span className="hint">Status: {transaction.status}</span> : null}
              <div className="quick-row">
                {transaction.status === 'posted' ? (
                  <button type="button" className="text-button" disabled={disabled} onClick={() => onVoid(transaction.id)}>
                    Void
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {hiddenCount > 0 ? (
        <div className="inline-header">
          <p className="hint">+{hiddenCount} more transactions</p>
          {!expanded ? (
            <button type="button" className="text-button" onClick={onViewAll}>
              View all
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
