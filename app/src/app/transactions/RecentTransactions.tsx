import type { LedgerTransactionListItem } from '../../domain/corePort';

export type RecentTransactionsProps = {
  items: LedgerTransactionListItem[];
  hiddenCount: number;
  expanded: boolean;
  disabled: boolean;
  pendingVoidTransactionId?: string;
  onViewAll: () => void;
  onVoid: (transactionId: string) => void;
};

export function RecentTransactions({
  items,
  hiddenCount,
  expanded,
  disabled,
  pendingVoidTransactionId,
  onViewAll,
  onVoid,
}: RecentTransactionsProps) {
  function txLabel(type: LedgerTransactionListItem['type']): string {
    if (type === 'income') return 'Income';
    if (type === 'expense') return 'Expense';
    if (type === 'transfer_in') return 'Transfer in';
    if (type === 'transfer_out') return 'Transfer out';
    return 'Transfer';
  }

  function txSign(type: LedgerTransactionListItem['type']): string {
    if (type === 'income' || type === 'transfer_in') return '+';
    if (type === 'expense' || type === 'transfer_out') return '-';
    return '';
  }

  function txBadgeClass(type: LedgerTransactionListItem['type']): string {
    return type === 'income' || type === 'transfer_in' ? 'tx-badge income' : 'tx-badge expense';
  }

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
                  <span className={txBadgeClass(transaction.type)}>
                    {txLabel(transaction.type)}
                  </span>
                  <strong>
                    {txSign(transaction.type)}
                    {transaction.amount} {transaction.currency}
                  </strong>
                </div>
                <span>{transaction.occurredAt}</span>
              </div>
              <span>{transaction.merchant || transaction.description || 'No description'}</span>
              {transaction.status !== 'posted' ? <span className="hint">Status: {transaction.status}</span> : null}
              <div className="quick-row">
                {transaction.status === 'posted' ? (
                  <button
                    type="button"
                    className="text-button"
                    disabled={disabled || pendingVoidTransactionId === transaction.id}
                    onClick={() => onVoid(transaction.id)}
                  >
                    {pendingVoidTransactionId === transaction.id ? 'Pending void…' : 'Void'}
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
