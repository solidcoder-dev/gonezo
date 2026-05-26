import { useState } from 'react';

export function useMonthlyMovementsFeedbackModel() {
  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);

  function clear() {
    setToastMessage('');
    setToastActionLabel('');
    setToastAction(null);
  }

  function show(message: string) {
    setToastMessage(message);
    setToastActionLabel('');
    setToastAction(null);
  }

  function showAction(message: string, actionLabel: string, action: () => void) {
    setToastMessage(message);
    setToastActionLabel(actionLabel);
    setToastAction(() => action);
  }

  function clearAction() {
    setToastActionLabel('');
    setToastAction(null);
  }

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
