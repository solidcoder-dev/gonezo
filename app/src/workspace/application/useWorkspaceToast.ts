import { useCallback, useState } from 'react';

export type WorkspaceToastTone =
  | 'success'
  | 'info'
  | 'warning'
  | 'error';

export type WorkspaceToastAction = Readonly<{
  label: string;
  run: () => void;
}>;

export function useWorkspaceToast() {
  const [toastMessage, setToastMessage] = useState('');
  const [toastTone, setToastTone] = useState<WorkspaceToastTone>('success');
  const [toastActionLabel, setToastActionLabel] = useState('');
  const [toastAction, setToastAction] = useState<(() => void) | null>(null);

  const showNotice = useCallback((input: {
    message: string;
    tone: WorkspaceToastTone;
    action?: WorkspaceToastAction;
  }) => {
    setToastMessage(input.message);
    setToastTone(input.tone);
    setToastActionLabel(input.action?.label ?? '');
    setToastAction(() => input.action?.run ?? null);
  }, []);

  const showToast = useCallback((message: string) => {
    showNotice({
      message,
      tone: 'success',
    });
  }, [showNotice]);

  const showInfo = useCallback((message: string, action?: WorkspaceToastAction) => {
    showNotice({
      message,
      tone: 'info',
      action,
    });
  }, [showNotice]);

  const showWarning = useCallback((message: string, action?: WorkspaceToastAction) => {
    showNotice({
      message,
      tone: 'warning',
      action,
    });
  }, [showNotice]);

  const showError = useCallback((error: { message: string }) => {
    showNotice({
      message: error.message,
      tone: 'error',
    });
  }, [showNotice]);

  const clearToast = useCallback(() => {
    setToastMessage('');
    setToastTone('success');
    setToastActionLabel('');
    setToastAction(null);
  }, []);

  const runToastAction = useCallback(() => {
    toastAction?.();
  }, [toastAction]);

  return {
    toast: {
      message: toastMessage,
      tone: toastTone,
      actionLabel: toastActionLabel,
    },
    actions: {
      clearToast,
      showError,
      showInfo,
      showNotice,
      showToast,
      showWarning,
      runToastAction,
    },
  };
}
