import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FeedbackNotice,
  FeedbackNoticeInput,
  FeedbackNoticeTone,
  FeedbackNoticeUpdate,
} from '../../shared/ui/FeedbackNotice/feedbackNotice.types';

export type WorkspaceToastTone = FeedbackNoticeTone;
export type WorkspaceToastAction = FeedbackNotice['action'];

let nextNoticeSequence = 0;

function nextNoticeId() {
  nextNoticeSequence += 1;
  return `workspace-notice-${nextNoticeSequence}`;
}

function defaultDurationPolicy(input: FeedbackNoticeInput): FeedbackNotice['durationPolicy'] {
  if (input.action || input.tone === 'error') return 'until-closed';
  if (input.tone === 'warning') return 'warning';
  return 'standard';
}

export function useWorkspaceToast() {
  const [notices, setNotices] = useState<FeedbackNotice[]>([]);
  const latestNoticeIdRef = useRef<string | null>(null);
  const currentNoticeRef = useRef<FeedbackNotice | null>(null);

  const showNotice = useCallback((input: FeedbackNoticeInput) => {
    const notice: FeedbackNotice = {
      ...input,
      id: nextNoticeId(),
      source: input.source || 'workspace',
      durationPolicy: input.durationPolicy ?? defaultDurationPolicy(input),
    };
    latestNoticeIdRef.current = notice.id;
    setNotices((current) => [...current, notice]);
    return notice.id;
  }, []);

  const showToast = useCallback((message: string) => showNotice({
    message,
    tone: 'success',
    source: 'workspace.toast',
  }), [showNotice]);

  const showInfo = useCallback((message: string, action?: WorkspaceToastAction) => showNotice({
    message,
    tone: 'info',
    source: 'workspace.info',
    action,
  }), [showNotice]);

  const showWarning = useCallback((message: string, action?: WorkspaceToastAction) => showNotice({
    message,
    tone: 'warning',
    source: 'workspace.warning',
    action,
  }), [showNotice]);

  const showError = useCallback((error: { message: string }) => showNotice({
    message: error.message,
    tone: 'error',
    source: 'workspace.error',
  }), [showNotice]);

  const closeNotice = useCallback((id: string) => {
    setNotices((current) => current.filter((notice) => notice.id !== id));
    if (latestNoticeIdRef.current === id) {
      latestNoticeIdRef.current = null;
    }
  }, []);

  const updateNotice = useCallback((id: string, update: FeedbackNoticeUpdate) => {
    setNotices((current) => current.map((notice) => (
      notice.id === id ? { ...notice, ...update, id: notice.id } : notice
    )));
  }, []);

  const clearToast = useCallback(() => {
    const id = latestNoticeIdRef.current;
    if (id) closeNotice(id);
  }, [closeNotice]);

  const runToastAction = useCallback(() => {
    currentNoticeRef.current?.action?.run();
  }, []);

  const currentNotice = notices[notices.length - 1] ?? null;
  useEffect(() => {
    currentNoticeRef.current = currentNotice;
  }, [currentNotice]);

  return {
    notices,
    toast: {
      message: currentNotice?.message ?? '',
      tone: currentNotice?.tone ?? 'success',
      actionLabel: currentNotice?.action?.label ?? '',
    },
    actions: {
      clearToast,
      closeNotice,
      showError,
      showInfo,
      showNotice,
      showToast,
      showWarning,
      updateNotice,
      runToastAction,
    },
  };
}
