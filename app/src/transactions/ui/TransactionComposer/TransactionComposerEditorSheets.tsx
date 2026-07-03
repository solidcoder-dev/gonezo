import type { ReactNode } from 'react';
import { SheetView } from '../../../shared/ui/SheetView';
import type {
  RecurrenceEndView as RecurrenceEndInput,
  RecurrenceFrequencyView as RecurrenceFrequency,
  RecurrenceMonthlyPatternView as RecurrenceMonthlyPattern,
} from '../../../shared/domain/schedulingView.types';
import { ItemBreakdownEditorView } from '../ItemBreakdownEditor/ItemBreakdownEditorView';
import { MovementMoreSheetView } from '../MovementMoreControls/MovementMoreSheetView';
import { RecurrenceEditorView } from '../RecurrenceEditor/RecurrenceEditorView';
import type { ComposerExpenseItem } from './TransactionComposerView';

type TransactionComposerEditorSheetsProps = {
  required: {
    amount: string;
    currencyCode?: string;
    date: string;
    disabled: boolean;
    editingExpenseItemId: string;
    expenseItemAmount: string;
    expenseItemAmountError?: string;
    expenseItemName: string;
    expenseItemNameError?: string;
    expenseItemOptions: ComposerExpenseItem[];
    expenseItems: ComposerExpenseItem[];
    expenseSplitError?: string;
    expenseSplitRemaining: string;
    expenseSplitTotal: string;
    movementIgnored: boolean;
    movementMoreOpen: boolean;
    nextScheduledOccurrenceDate?: string;
    recurrenceDayOfMonth: string;
    recurrenceEndCount: string;
    recurrenceEndCountError?: string;
    recurrenceEndDate: string;
    recurrenceEndDateError?: string;
    recurrenceEndKind: RecurrenceEndInput['kind'];
    recurrenceFrequency: RecurrenceFrequency;
    recurrenceInterval: string;
    recurrenceIntervalError?: string;
    recurrenceMonthlyOrdinal: string;
    recurrenceMonthlyPattern: RecurrenceMonthlyPattern;
    recurrenceMonthlyWeekday: string;
    recurrenceWeeklyDay: string;
    scheduleEditorOpen: boolean;
    scheduleEditorTitle: string;
    shareEditorBody?: ReactNode;
    shareEditorOpen: boolean;
    shareEnabled: boolean;
    splitDraftMode: 'items' | 'parts';
    splitEditorOpen: boolean;
  };
  provided: {
    applyRecurringSchedule: () => void;
    applySplit: () => void;
    closeRecurringScheduleEditor: () => void;
    closeShareEditor: () => void;
    closeSplitEditor: () => void;
    closeMovementMore: () => void;
    setExpenseItemAmount: (value: string) => void;
    setExpenseItemName: (value: string) => void;
    setMovementIgnored: (value: boolean) => void;
    setRecurrenceDayOfMonth: (value: string) => void;
    setRecurrenceEndCount: (value: string) => void;
    setRecurrenceEndDate: (value: string) => void;
    setRecurrenceEndKind: (value: RecurrenceEndInput['kind']) => void;
    setRecurrenceFrequency: (value: RecurrenceFrequency) => void;
    setRecurrenceInterval: (value: string) => void;
    setRecurrenceMonthlyOrdinal: (value: string) => void;
    setRecurrenceMonthlyPattern: (value: RecurrenceMonthlyPattern) => void;
    setRecurrenceMonthlyWeekday: (value: string) => void;
    setRecurrenceWeeklyDay: (value: string) => void;
    startExpenseItem: () => void;
    cancelExpenseItem: () => void;
    addExpenseItem: () => boolean;
    editExpenseItem: (itemId: string) => void;
    removeExpenseItem: (itemId: string) => void;
    splitByParts: (amount: string, parts: string, addedPersonName?: string) => void;
    splitByWeightedParts: (amount: string, parts: Array<{ id?: string; name: string; parts: number }>) => void;
    selectSplitMode: (mode: 'items' | 'parts') => void;
    toggleExpenseDetailed: () => void;
  };
};

export function TransactionComposerEditorSheets({ required, provided }: TransactionComposerEditorSheetsProps) {
  return (
    <>
      <SheetView
        required={{
          config: {
            ariaLabel: required.scheduleEditorTitle,
            panelClassName: 'composer-sheet composer-schedule-sheet',
          },
          data: {
            body: (
              <RecurrenceEditorView
                required={{
                  config: { title: required.scheduleEditorTitle },
                  data: {},
                  state: {
                    frequency: required.recurrenceFrequency,
                    interval: required.recurrenceInterval,
                    weeklyDay: required.recurrenceWeeklyDay,
                    monthlyPattern: required.recurrenceMonthlyPattern,
                    dayOfMonth: required.recurrenceDayOfMonth,
                    monthlyOrdinal: required.recurrenceMonthlyOrdinal,
                    monthlyWeekday: required.recurrenceMonthlyWeekday,
                    endKind: required.recurrenceEndKind,
                    endDate: required.recurrenceEndDate,
                    endCount: required.recurrenceEndCount,
                    nextOccurrenceDate: required.nextScheduledOccurrenceDate ?? required.date,
                  },
                  status: {
                    intervalError: required.recurrenceIntervalError,
                    endDateError: required.recurrenceEndDateError,
                    endCountError: required.recurrenceEndCountError,
                  },
                }}
                provided={{
                  commands: {
                    closeEditor: provided.closeRecurringScheduleEditor,
                    applySchedule: provided.applyRecurringSchedule,
                    setFrequency: provided.setRecurrenceFrequency,
                    setInterval: provided.setRecurrenceInterval,
                    setWeeklyDay: provided.setRecurrenceWeeklyDay,
                    setMonthlyPattern: provided.setRecurrenceMonthlyPattern,
                    setDayOfMonth: provided.setRecurrenceDayOfMonth,
                    setMonthlyOrdinal: provided.setRecurrenceMonthlyOrdinal,
                    setMonthlyWeekday: provided.setRecurrenceMonthlyWeekday,
                    setEndKind: provided.setRecurrenceEndKind,
                    setEndDate: provided.setRecurrenceEndDate,
                    setEndCount: provided.setRecurrenceEndCount,
                  },
                }}
              />
            ),
          },
          state: { open: required.scheduleEditorOpen },
          status: { disabled: required.disabled },
        }}
        provided={{ commands: { close: provided.closeRecurringScheduleEditor } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'Items',
            title: 'Items',
            closeLabel: 'Close items',
            panelClassName: 'composer-sheet composer-items-sheet',
            contentClassName: 'composer-items-content',
          },
          data: {
            body: (
              <div className="stack composer-items-editor">
                <ItemBreakdownEditorView
                  required={{
                    config: {},
                    data: { items: required.expenseItems, itemOptions: required.expenseItemOptions },
                    state: {
                      enabled: true,
                      itemName: required.expenseItemName,
                      itemAmount: required.expenseItemAmount,
                      editingItemId: required.editingExpenseItemId,
                      splitMode: required.splitDraftMode,
                      splitTotal: required.expenseSplitTotal,
                      splitBaseAmount: required.amount,
                      splitRemaining: required.expenseSplitRemaining,
                      currencyCode: required.currencyCode,
                      itemNameError: required.expenseItemNameError,
                      itemAmountError: required.expenseItemAmountError,
                      splitError: required.expenseSplitError,
                    },
                    status: { disabled: required.disabled, hideToggle: true },
                  }}
                  provided={{
                    commands: {
                      toggleEnabled: provided.toggleExpenseDetailed,
                      changeItemName: provided.setExpenseItemName,
                      changeItemAmount: provided.setExpenseItemAmount,
                      startItem: provided.startExpenseItem,
                      cancelItem: provided.cancelExpenseItem,
                      addItem: provided.addExpenseItem,
                      editItem: provided.editExpenseItem,
                      removeItem: provided.removeExpenseItem,
                      splitByParts: provided.splitByParts,
                      splitByWeightedParts: provided.splitByWeightedParts,
                      selectMode: provided.selectSplitMode,
                    },
                  }}
                />
                <button
                  type="button"
                  className="primary-button composer-items-apply"
                  onClick={provided.applySplit}
                  disabled={required.disabled}
                >
                  Apply items
                </button>
              </div>
            ),
          },
          state: { open: required.splitEditorOpen },
          status: { disabled: required.disabled },
        }}
        provided={{ commands: { close: provided.closeSplitEditor } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'Share expense',
            title: 'Share expense',
            closeLabel: 'Close share expense',
            panelClassName: 'composer-sheet composer-share-sheet',
            contentClassName: 'composer-share-content',
          },
          data: {
            body: required.shareEditorBody,
          },
          state: { open: required.shareEnabled && required.shareEditorOpen },
          status: { disabled: required.disabled },
        }}
        provided={{ commands: { close: provided.closeShareEditor } }}
      />
      <SheetView
        required={{
          config: {
            ariaLabel: 'More',
            title: 'More',
            closeLabel: 'Close more',
            panelClassName: 'composer-sheet composer-more-sheet',
          },
          data: {
            body: (
              <MovementMoreSheetView
                required={{
                  config: {},
                  data: {},
                  state: { ignored: required.movementIgnored },
                  status: { disabled: required.disabled },
                }}
                provided={{
                  commands: {
                    setIgnored: provided.setMovementIgnored,
                    done: provided.closeMovementMore,
                  },
                }}
              />
            ),
          },
          state: { open: required.movementMoreOpen },
          status: { disabled: required.disabled },
        }}
        provided={{ commands: { close: provided.closeMovementMore } }}
      />
    </>
  );
}
