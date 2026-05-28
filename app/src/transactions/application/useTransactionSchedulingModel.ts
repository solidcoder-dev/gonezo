import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type {
  SchedulingEndInput,
  SchedulingFrequency,
  SchedulingMonthlyPattern,
} from '../../scheduling/application/schedulingCore.port';
import type { TransactionFieldErrors } from './transactions.types';
import type { TransactionEntryPrefillRequest } from './TransactionEntryComponent.contract';

type TransactionSchedulingClock = {
  dayOfMonthFromDateInput(dateInput: string): string;
  weekDayIsoFromDateInput(dateInput: string): string;
};

type UseTransactionSchedulingModelInput = {
  clock: TransactionSchedulingClock;
  initialToday: string;
  setFieldErrors: Dispatch<SetStateAction<TransactionFieldErrors>>;
};

export function useTransactionSchedulingModel(input: UseTransactionSchedulingModelInput) {
  const { clock, initialToday, setFieldErrors } = input;
  const [schedulingMode, setSchedulingMode] = useState<'now' | 'scheduled'>('now');
  const [expectedMovement, setExpectedMovement] = useState(false);
  const [editedExpectedMovementId, setEditedExpectedMovementId] = useState('');
  const [editedScheduledMovementId, setEditedScheduledMovementId] = useState('');
  const [postExpectedMovementId, setPostExpectedMovementId] = useState('');
  const [schedulingKind, setSchedulingKind] = useState<'one_shot' | 'recurring'>('one_shot');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<SchedulingFrequency>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState('1');
  const [recurrenceWeeklyDay, setRecurrenceWeeklyDay] = useState(clock.weekDayIsoFromDateInput(initialToday));
  const [recurrenceMonthlyPattern, setRecurrenceMonthlyPattern] = useState<SchedulingMonthlyPattern>('day_of_month');
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(clock.dayOfMonthFromDateInput(initialToday));
  const [recurrenceMonthlyOrdinal, setRecurrenceMonthlyOrdinal] = useState('1');
  const [recurrenceMonthlyWeekday, setRecurrenceMonthlyWeekday] = useState(clock.weekDayIsoFromDateInput(initialToday));
  const [recurrenceEndKind, setRecurrenceEndKind] = useState<SchedulingEndInput['kind']>('never');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceEndCount, setRecurrenceEndCount] = useState('12');
  const recurrenceEnabled = schedulingMode === 'scheduled' && schedulingKind === 'recurring';

  function reset(today: string) {
    setSchedulingMode('now');
    setExpectedMovement(false);
    setEditedExpectedMovementId('');
    setEditedScheduledMovementId('');
    setPostExpectedMovementId('');
    setSchedulingKind('one_shot');
    setRecurrenceFrequency('monthly');
    setRecurrenceInterval('1');
    setRecurrenceWeeklyDay(clock.weekDayIsoFromDateInput(today));
    setRecurrenceMonthlyPattern('day_of_month');
    setRecurrenceDayOfMonth(clock.dayOfMonthFromDateInput(today));
    setRecurrenceMonthlyOrdinal('1');
    setRecurrenceMonthlyWeekday(clock.weekDayIsoFromDateInput(today));
    setRecurrenceEndKind('never');
    setRecurrenceEndDate('');
    setRecurrenceEndCount('12');
  }

  function prefill(prefillRequest: TransactionEntryPrefillRequest) {
    const isScheduledEdit = Boolean(prefillRequest.editedScheduledMovementId);
    const isExpectedEdit = Boolean(prefillRequest.editedExpectedMovementId);
    const isPostExpected = Boolean(prefillRequest.postExpectedMovementId);
    setSchedulingMode(prefillRequest.schedulingMode ?? (isScheduledEdit ? 'scheduled' : 'now'));
    setSchedulingKind(prefillRequest.schedulingKind ?? 'one_shot');
    if (prefillRequest.recurrenceFrequency) {
      setRecurrenceFrequency(prefillRequest.recurrenceFrequency);
    }
    if (prefillRequest.recurrenceInterval != null) {
      setRecurrenceInterval(prefillRequest.recurrenceInterval);
    }
    if (prefillRequest.recurrenceWeeklyDay != null) {
      setRecurrenceWeeklyDay(prefillRequest.recurrenceWeeklyDay);
    }
    if (prefillRequest.recurrenceMonthlyPattern) {
      setRecurrenceMonthlyPattern(prefillRequest.recurrenceMonthlyPattern);
    }
    if (prefillRequest.recurrenceDayOfMonth != null) {
      setRecurrenceDayOfMonth(prefillRequest.recurrenceDayOfMonth);
    }
    if (prefillRequest.recurrenceMonthlyOrdinal != null) {
      setRecurrenceMonthlyOrdinal(prefillRequest.recurrenceMonthlyOrdinal);
    }
    if (prefillRequest.recurrenceMonthlyWeekday != null) {
      setRecurrenceMonthlyWeekday(prefillRequest.recurrenceMonthlyWeekday);
    }
    if (prefillRequest.recurrenceEndKind) {
      setRecurrenceEndKind(prefillRequest.recurrenceEndKind);
    }
    if (prefillRequest.recurrenceEndDate != null) {
      setRecurrenceEndDate(prefillRequest.recurrenceEndDate);
    }
    if (prefillRequest.recurrenceEndCount != null) {
      setRecurrenceEndCount(prefillRequest.recurrenceEndCount);
    }
    setExpectedMovement(isExpectedEdit && !isPostExpected && !isScheduledEdit);
    setEditedExpectedMovementId(prefillRequest.postExpectedMovementId ? '' : (prefillRequest.editedExpectedMovementId ?? ''));
    setEditedScheduledMovementId(prefillRequest.editedScheduledMovementId ?? '');
    setPostExpectedMovementId(prefillRequest.postExpectedMovementId ?? '');
  }

  function syncDateFields(value: string) {
    if (!recurrenceEnabled) {
      return;
    }
    setRecurrenceWeeklyDay(clock.weekDayIsoFromDateInput(value));
    setRecurrenceMonthlyWeekday(clock.weekDayIsoFromDateInput(value));
    if (recurrenceMonthlyPattern === 'day_of_month') {
      setRecurrenceDayOfMonth(clock.dayOfMonthFromDateInput(value));
    }
  }

  function setSchedulingModeValue(value: 'now' | 'scheduled') {
    setSchedulingMode(value);
    setFieldErrors((previous) => ({
      ...previous,
      date: undefined,
      recurrenceInterval: undefined,
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
      expenseSplit: undefined,
    }));
  }

  function setSchedulingKindValue(value: 'one_shot' | 'recurring') {
    setSchedulingKind(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceInterval: undefined,
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
      expenseSplit: undefined,
    }));
  }

  function setRecurrenceFrequencyValue(value: SchedulingFrequency) {
    setRecurrenceFrequency(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceInterval: undefined,
    }));
  }

  function setRecurrenceIntervalValue(value: string) {
    setRecurrenceInterval(value.replace('-', ''));
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceInterval: undefined,
    }));
  }

  function setRecurrenceEndKindValue(value: SchedulingEndInput['kind']) {
    setRecurrenceEndKind(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceEndDate: undefined,
      recurrenceEndCount: undefined,
    }));
  }

  function setRecurrenceEndDateValue(value: string) {
    setRecurrenceEndDate(value);
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceEndDate: undefined,
    }));
  }

  function setRecurrenceEndCountValue(value: string) {
    setRecurrenceEndCount(value.replace('-', ''));
    setFieldErrors((previous) => ({
      ...previous,
      recurrenceEndCount: undefined,
    }));
  }

  function setExpectedMovementValue(value: boolean) {
    setExpectedMovement(value);
    setFieldErrors((previous) => ({
      ...previous,
      expectedConflict: undefined,
      date: undefined,
      expenseSplit: undefined,
    }));
  }

  return {
    state: {
      schedulingMode,
      expectedMovement,
      editedExpectedMovementId,
      editedScheduledMovementId,
      postExpectedMovementId,
      schedulingKind,
      recurrenceFrequency,
      recurrenceInterval,
      recurrenceWeeklyDay,
      recurrenceMonthlyPattern,
      recurrenceDayOfMonth,
      recurrenceMonthlyOrdinal,
      recurrenceMonthlyWeekday,
      recurrenceEndKind,
      recurrenceEndDate,
      recurrenceEndCount,
      recurrenceEnabled,
    },
    actions: {
      reset,
      prefill,
      syncDateFields,
      setSchedulingModeValue,
      setSchedulingKindValue,
      setRecurrenceFrequencyValue,
      setRecurrenceIntervalValue,
      setRecurrenceWeeklyDay,
      setRecurrenceMonthlyPattern,
      setRecurrenceDayOfMonth,
      setRecurrenceMonthlyOrdinal,
      setRecurrenceMonthlyWeekday,
      setRecurrenceEndKindValue,
      setRecurrenceEndDateValue,
      setRecurrenceEndCountValue,
      setExpectedMovement,
      setExpectedMovementValue,
    },
  };
}
