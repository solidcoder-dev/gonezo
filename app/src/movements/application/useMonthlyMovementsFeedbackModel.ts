import { useEffect, useRef, useState } from 'react';
import type { FeedbackNoticeInput, FeedbackNoticeUpdate } from '../../shared/ui/FeedbackNotice/feedbackNotice.types';

type MonthlyMovementsFeedbackInput = {
  onNotice?: (notice: FeedbackNoticeInput) => string;
  onNoticeUpdated?: (id: string, update: FeedbackNoticeUpdate) => void;
  onNoticeClosed?: (id: string) => void;
};

export function useMonthlyMovementsFeedbackModel(input: MonthlyMovementsFeedbackInput = {}) {
  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);
  const activeNoticeIdRef = useRef<string | null>(null);
  const onNoticeClosedRef = useRef(input.onNoticeClosed);

  useEffect(() => {
    onNoticeClosedRef.current = input.onNoticeClosed;
  }, [input.onNoticeClosed]);

  function publish(inputNotice: FeedbackNoticeInput) {
    const id = input.onNotice?.(inputNotice);
    activeNoticeIdRef.current = id ?? null;
  }

  function clear() {
    setToastMessage('');
    setToastActionLabel('');
    setToastAction(null);
    if (activeNoticeIdRef.current) {
      input.onNoticeClosed?.(activeNoticeIdRef.current);
      activeNoticeIdRef.current = null;
    }
  }

  function show(message: string) {
    setToastMessage(message);
    setToastActionLabel('');
    setToastAction(null);
    if (activeNoticeIdRef.current) {
      input.onNoticeUpdated?.(activeNoticeIdRef.current, {
        message,
        tone: 'success',
        action: undefined,
        durationPolicy: 'standard',
      });
      activeNoticeIdRef.current = null;
      return;
    }
    publish({ message, tone: 'success', source: 'movements.operation' });
  }

  function showAction(message: string, actionLabel: string, action: () => void) {
    setToastMessage(message);
    setToastActionLabel(actionLabel);
    setToastAction(() => action);
    publish({
      message,
      tone: 'success',
      source: 'movements.operation',
      action: { label: actionLabel, run: action },
      durationPolicy: 'until-updated',
      priority: 'immediate',
    });
  }

  function clearAction() {
    setToastActionLabel('');
    setToastAction(null);
    if (activeNoticeIdRef.current) {
      input.onNoticeUpdated?.(activeNoticeIdRef.current, { action: undefined });
    }
  }

  useEffect(() => () => {
    if (activeNoticeIdRef.current) onNoticeClosedRef.current?.(activeNoticeIdRef.current);
  }, []);

  return {
    state: {
      message: toastMessage,
      actionLabel: toastActionLabel,
    },
    actions: {
      clear,
      show,
      showAction,
      clearAction,
      runAction: () => toastAction?.(),
    },
  };
}
