import { formatCurrencyAmount, formatIsoDateTime } from '../../shared/utils/formatting';
import type { TransactionHistoryItemView } from '../domain/transactionView.types';

export type RecentTransactionsListViewRequired = {
  items: TransactionHistoryItemView[];
  hiddenCount: number;
  expanded: boolean;
  disabled: boolean;
  pendingVoidTransactionId?: string;
};

export type RecentTransactionsListViewProvided = {
  onViewAll: () => void;
  onVoid: (transactionId: string) => void;
};

export type RecentTransactionsListViewProps = {
  required: RecentTransactionsListViewRequired;
  provided: RecentTransactionsListViewProvided;
};

export function RecentTransactionsListView({ required, provided }: RecentTransactionsListViewProps) {
  const { items, hiddenCount, expanded, disabled, pendingVoidTransactionId } = required;
  const { onViewAll, onVoid } = provided;

  function txLabel(type: TransactionHistoryItemView['type']): string {
    if (type === 'income') return 'Income';
    if (type === 'expense') return 'Expense';
    if (type === 'transfer_in') return 'Transfer in';
    if (type === 'transfer_out') return 'Transfer out';
    return 'Transfer';
  }

  function txSign(type: TransactionHistoryItemView['type']): string {
    if (type === 'income' || type === 'transfer_in') return '+';
    if (type === 'expense' || type === 'transfer_out') return '-';
    return '';
  }

  function txBadgeClass(type: TransactionHistoryItemView['type']): string {
    return type === 'income' || type === 'transfer_in' ? 'tx-badge income' : 'tx-badge expense';
  }

  function txAmount(amount: string, currency: string): string {
    const numeric = Number(amount);
    if (Number.isNaN(numeric)) {
      return `${amount} ${currency}`;
    }
    return formatCurrencyAmount(Math.abs(numeric).toString(), currency);
  }

  return (
    <section className="stack section-gap transactions-section">
      <div className="inline-header">
        <h2>Recent transactions</h2>
        {hiddenCount > 0 && !expanded ? (
          <button type="button" className="text-button" onClick={onViewAll}>
            See all
          </button>
        ) : null}
      </div>
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
                    {txAmount(transaction.amount, transaction.currency)}
                  </strong>
                </div>
                <time dateTime={transaction.occurredAt}>{formatIsoDateTime(transaction.occurredAt)}</time>
              </div>
              <span>{transaction.merchant || transaction.description || 'No description'}</span>
              {transaction.category || (transaction.tags && transaction.tags.length > 0) ? (
                <div className="quick-row" aria-label="Transaction taxonomy">
                  {transaction.category ? (
                    <span className="chip active">{transaction.category.name}</span>
                  ) : null}
                  {(transaction.tags ?? []).map((tag) => (
                    <span key={tag.id} className="chip">
                      #{tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
              {transaction.categorizationStatus && transaction.categorizationStatus !== 'assigned' ? (
                <span className="hint">Category: {transaction.categorizationStatus}</span>
              ) : null}
              {transaction.taggingStatus && transaction.taggingStatus !== 'assigned' ? (
                <span className="hint">Tags: {transaction.taggingStatus}</span>
              ) : null}
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
      {hiddenCount > 0 && !expanded ? (
        <div className="inline-header">
          <p className="hint">+{hiddenCount} more transactions</p>
        </div>
      ) : null}
    </section>
  );
}
