import type { TransactionItem } from '../../domain/corePort';

export type RecentTransactionsProps = {
  items: TransactionItem[];
  hiddenCount: number;
  expanded: boolean;
  disabled: boolean;
  onViewAll: () => void;
  onEdit: (item: TransactionItem) => void;
  onDelete: (transactionId: string) => void;
};

export function RecentTransactions({
  items,
  hiddenCount,
  expanded,
  disabled,
  onViewAll,
  onEdit,
  onDelete,
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
                    {transaction.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                  <strong>
                    {transaction.type === 'income' ? '+' : '-'}
                    {transaction.amount} {transaction.currency}
                  </strong>
                </div>
                <span>{transaction.postedDate}</span>
              </div>
              <span>{transaction.merchant || 'No merchant/source'}</span>
              <div className="quick-row">
                <button type="button" className="text-button" disabled={disabled} onClick={() => onEdit(transaction)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-button"
                  disabled={disabled}
                  onClick={() => onDelete(transaction.id)}
                >
                  Delete
                </button>
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
