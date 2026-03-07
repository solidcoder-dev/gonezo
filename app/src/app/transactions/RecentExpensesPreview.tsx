import type { ExpenseItem } from '../../domain/corePort';

type Props = {
  items: ExpenseItem[];
  hiddenCount: number;
};

export function RecentExpensesPreview({ items, hiddenCount }: Props) {
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
      {hiddenCount > 0 ? <p className="hint">+{hiddenCount} more transactions</p> : null}
    </section>
  );
}
