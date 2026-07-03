import { useState } from 'react';

export function useWorkspaceToast() {
  const [toastMessage, setToastMessage] = useState('');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);

  function showToast(message: string) {
    setToastMessage(message);
    setToastActionLabel('');
    setToastAction(null);
  }

  function clearToast() {
    showToast('');
  }

  function showError(error: { message: string }) {
    showToast(error.message);
  }

  return {
    toast: {
      message: toastMessage,
      actionLabel: toastActionLabel,
    },
    actions: {
      clearToast,
      showError,
      showToast,
      runToastAction: () => toastAction?.(),
    },
  };
}
