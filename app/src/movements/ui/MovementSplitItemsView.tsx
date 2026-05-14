import type { ViewProps } from '../../shared/ui/ViewProps';

export type MovementSplitItemView = {
  id: string;
  name: string;
  amount: string;
};

export type MovementSplitItemsViewProps = ViewProps<
  {
    label?: string;
    compact?: boolean;
  },
  {
    items: MovementSplitItemView[];
  },
  Record<string, never>,
  Record<string, never>,
  Record<string, never>
>;

export function MovementSplitItemsView({ required }: MovementSplitItemsViewProps) {
  const { items } = required.data;
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="stack detail-split-list">
      <span className="hint detail-meta-label">{required.config.label ?? 'Splits'}</span>
      <ul className={required.config.compact === false ? 'expense-list' : 'expense-list expense-list--compact'} aria-label="Split items">
        {items.map((item) => (
          <li key={item.id} className="expense-item expense-item--compact">
            <div className="inline-header">
              <strong>{item.name}</strong>
              <span>{item.amount}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
