import type { ExpenseItem } from '../../domain/corePort';

type Props = {
  items: ExpenseItem[];
  hiddenCount: number;
  expanded: boolean;
  onViewAll: () => void;
};

export function RecentExpensesPreview({ items, hiddenCount, expanded, onViewAll }: Props) {
  return (
    <section className="stack section-gap">
      <h2>Recent expenses</h2>
      {items.length === 0 ? <p>No expenses yet.</p> : null}
      {items.length > 0 ? (
        <ul className="expense-list" aria-label="Recent expenses">
          {items.map((expense) => (
            <li key={expense.id} className="expense-item">
              <div className="expense-top-row">
                <strong>
                  {expense.amount} {expense.currency}
                </strong>
                <span>{expense.postedDate}</span>
              </div>
              <span>{expense.merchant || 'No merchant'}</span>
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
