import type { ReactNode } from 'react';
import { ItemBreakdownSummaryView } from '../ItemBreakdownControls/ItemBreakdownSummaryView';
import { ItemBreakdownTriggerView } from '../ItemBreakdownControls/ItemBreakdownTriggerView';
import { MovementMoreTriggerView } from '../MovementMoreControls/MovementMoreTriggerView';
import type { ComposerMode } from './TransactionComposerView';
import styles from './TransactionComposerAmountAccessories.module.css';

type Props = {
  required: {
    state: {
      currencyCode?: string;
      expenseItemsCount: number;
      expenseSplitTotal: string;
      mode: ComposerMode;
      shareControl?: ReactNode;
      splitApplied: boolean;
    };
    status: {
      disabled: boolean;
    };
  };
  provided: {
    commands: {
      openMovementMore: () => void;
      openSplitEditor: () => void;
      removeSplit: () => void;
    };
  };
};

export function TransactionComposerAmountAccessories({ required, provided }: Props) {
  const { currencyCode, expenseItemsCount, expenseSplitTotal, mode, shareControl, splitApplied } = required.state;
  const { disabled } = required.status;
  const splitAvailable = mode === 'expense' || mode === 'income';
  const shareAvailable = mode === 'expense';
  const movementMoreAvailable = mode === 'expense' || mode === 'income';
  const splitControl = splitAvailable
    ? splitApplied
      ? (
        <ItemBreakdownSummaryView
          required={{
            config: {},
            data: {},
            state: {
              itemsCount: expenseItemsCount,
              total: expenseSplitTotal,
              currencyCode,
            },
            status: { disabled },
          }}
          provided={{
            commands: {
              edit: provided.commands.openSplitEditor,
              remove: provided.commands.removeSplit,
            },
          }}
        />
      )
      : (
        <ItemBreakdownTriggerView
          required={{
            config: {},
            data: {},
            state: {},
            status: { disabled },
          }}
          provided={{ commands: { open: provided.commands.openSplitEditor } }}
        />
      )
    : null;
  const visibleShareControl = shareAvailable ? shareControl : null;
  const movementMoreControl = movementMoreAvailable ? (
    <MovementMoreTriggerView
      required={{
        config: {},
        data: {},
        state: {},
        status: { disabled },
      }}
      provided={{ commands: { open: provided.commands.openMovementMore } }}
    />
  ) : null;

  if (!splitControl && !visibleShareControl && !movementMoreControl) {
    return null;
  }

  return (
    <section className={styles.root} aria-labelledby="composer-details-label">
      <div id="composer-details-label" className={styles.label}>Details</div>
      <div className={styles.rows}>
        {splitControl}
        {visibleShareControl}
        {movementMoreControl}
      </div>
    </section>
  );
}
