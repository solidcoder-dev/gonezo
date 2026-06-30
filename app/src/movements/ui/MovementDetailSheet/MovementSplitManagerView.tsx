import type { ViewProps } from '../../../shared/ui/ViewProps';
import styles from '../../../shared/ui/SplitManager/SplitManager.module.css';

export type MovementSplitItemView = {
  id: string;
  name: string;
  amount: string;
  expected?: boolean;
  ignored?: boolean;
};

export type MovementSplitManagerViewProps = ViewProps<
  {
    label?: string;
    emptyLabel?: string;
    addLabel?: string;
    assignRemainingLabel?: string;
    splitPartsLabel?: string;
    expectedStatusLabel?: string;
    ignoredStatusLabel?: string;
  },
  {
    items: MovementSplitItemView[];
  },
  {
    remaining?: string;
    currencyCode?: string;
  },
  {
    disabled?: boolean;
  },
  {
    addSplit?: () => void;
    assignRemaining?: () => void;
    splitParts?: () => void;
    editSplit?: (itemId: string) => void;
    removeSplit?: (itemId: string) => void;
    toggleExpected?: (itemId: string) => void;
    toggleIgnored?: (itemId: string) => void;
  }
>;

function hasToolbarAction(commands: MovementSplitManagerViewProps['provided']['commands']): boolean {
  return Boolean(commands.addSplit || commands.assignRemaining || commands.splitParts);
}

function hasRowAction(commands: MovementSplitManagerViewProps['provided']['commands']): boolean {
  return Boolean(commands.editSplit || commands.removeSplit || commands.toggleExpected || commands.toggleIgnored);
}

function remainingText(remaining?: string, currencyCode?: string): string | undefined {
  if (!remaining) {
    return undefined;
  }
  return currencyCode ? `Remaining: ${remaining} ${currencyCode}` : `Remaining: ${remaining}`;
}

export function MovementSplitManagerView({ required, provided }: MovementSplitManagerViewProps) {
  const { config, data, state, status } = required;
  const { commands } = provided;
  const label = config.label ?? 'Items';
  const emptyLabel = config.emptyLabel ?? 'No items yet.';
  const addLabel = config.addLabel ?? 'Add item';
  const assignRemainingLabel = config.assignRemainingLabel ?? 'Assign remaining';
  const splitPartsLabel = config.splitPartsLabel ?? 'Break down by parts';
  const expectedStatusLabel = config.expectedStatusLabel ?? 'Expected repayment';
  const ignoredStatusLabel = config.ignoredStatusLabel ?? 'Ignored in analytics';
  const remaining = remainingText(state.remaining, state.currencyCode);
  const showToolbar = hasToolbarAction(commands);
  const showRowActions = hasRowAction(commands);

  if (data.items.length === 0 && !showToolbar) {
    return null;
  }

  return (
    <section className={styles.manager} aria-labelledby="movement-splits-heading">
      <div className={styles.toolbar}>
        <div className={styles.title}>
          <span id="movement-splits-heading" className="hint detail-meta-label">{label}</span>
          {remaining ? <span className={`hint ${styles.remaining}`}>{remaining}</span> : null}
        </div>
        {showToolbar ? (
          <div className={styles.toolbarActions}>
            {commands.assignRemaining ? (
              <button
                type="button"
                className={`text-button ${styles.actionButton}`}
                disabled={status.disabled}
                onClick={commands.assignRemaining}
              >
                {assignRemainingLabel}
              </button>
            ) : null}
            {commands.splitParts ? (
              <button
                type="button"
                className={`text-button ${styles.actionButton}`}
                disabled={status.disabled}
                onClick={commands.splitParts}
              >
                <i className="bi bi-diagram-3" aria-hidden />
                {splitPartsLabel}
              </button>
            ) : null}
            {commands.addSplit ? (
              <button
                type="button"
                className={`text-button ${styles.actionButton} ${styles.primaryAction}`}
                disabled={status.disabled}
                onClick={commands.addSplit}
              >
                <i className="bi bi-plus-lg" aria-hidden />
                {addLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {data.items.length > 0 ? (
        <ul className={styles.list} aria-label="Items">
          {data.items.map((item) => (
            <li key={item.id} className={styles.item}>
              <strong className={styles.itemName}>{item.name}</strong>
              <span className={styles.itemAmount}>{item.amount}</span>
              <span className={styles.itemStatus}>
                {item.expected ? (
                  <span className={`${styles.statusIcon} ${styles.expectedStatus}`} aria-label={expectedStatusLabel} title={expectedStatusLabel}>
                    <i className="bi bi-arrow-return-left" aria-hidden />
                  </span>
                ) : null}
                {item.ignored ? (
                  <span className={`${styles.statusIcon} ${styles.ignoredStatus}`} aria-label={ignoredStatusLabel} title={ignoredStatusLabel}>
                    <i className="bi bi-ban" aria-hidden />
                  </span>
                ) : null}
              </span>
              {showRowActions ? (
                <details className={styles.rowActions}>
                  <summary
                    className={`text-button icon-button ${styles.menuButton}`}
                    role="button"
                    aria-label={`Item actions for ${item.name}`}
                    aria-disabled={status.disabled}
                    onClick={(event) => {
                      if (status.disabled) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <i className="bi bi-three-dots" aria-hidden />
                  </summary>
                  <div className={styles.menu} role="menu">
                    {commands.editSplit ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={status.disabled}
                        aria-label={`Edit item ${item.name}`}
                        onClick={() => commands.editSplit?.(item.id)}
                      >
                        Edit
                      </button>
                    ) : null}
                    {commands.toggleExpected ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={status.disabled}
                        aria-label={`${item.expected ? 'Unmark' : 'Mark'} expected item ${item.name}`}
                        onClick={() => commands.toggleExpected?.(item.id)}
                      >
                        {item.expected ? 'Unmark expected' : 'Mark expected'}
                      </button>
                    ) : null}
                    {commands.toggleIgnored ? (
                      <button
                        type="button"
                        role="menuitem"
                        disabled={status.disabled}
                        aria-label={`${item.ignored ? 'Include' : 'Ignore'} item ${item.name} in analytics`}
                        onClick={() => commands.toggleIgnored?.(item.id)}
                      >
                        {item.ignored ? 'Include in analytics' : 'Ignore analytics'}
                      </button>
                    ) : null}
                    {commands.removeSplit ? (
                      <button
                        type="button"
                        role="menuitem"
                        className={styles.dangerMenuItem}
                        disabled={status.disabled}
                        aria-label={`Remove item ${item.name}`}
                        onClick={() => commands.removeSplit?.(item.id)}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={`hint ${styles.empty}`}>{emptyLabel}</p>
      )}
    </section>
  );
}
