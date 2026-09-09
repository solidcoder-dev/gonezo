import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  FeedbackNotice,
  FeedbackNoticeDurationPolicy,
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

function durationFor(policy: FeedbackNoticeDurationPolicy): number | null {
  if (policy === 'standard') return 5000;
  if (policy === 'warning') return 8000;
  return null;
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

  const expirationRef = useRef<{
    id: string;
    remainingMs: number;
    startedAtMs: number;
    timerId: number | null;
    pauseReasons: Set<string>;
  } | null>(null);

  const clearExpirationTimer = useCallback(() => {
    const expiration = expirationRef.current;
    if (!expiration || expiration.timerId === null) return;
    window.clearTimeout(expiration.timerId);
    expiration.timerId = null;
  }, []);

  const scheduleExpiration = useCallback((id: string, remainingMs: number) => {
    if (remainingMs <= 0) return;
    const expiration = expirationRef.current;
    if (!expiration || expiration.id !== id) return;
    expiration.remainingMs = remainingMs;
    expiration.startedAtMs = Date.now();
    expiration.timerId = window.setTimeout(() => {
      expirationRef.current = null;
      setNotices((current) => current.filter((notice) => notice.id !== id));
      if (latestNoticeIdRef.current === id) {
        latestNoticeIdRef.current = null;
      }
    }, remainingMs);
  }, []);

  const pauseNotice = useCallback((id: string, reason: string) => {
    const expiration = expirationRef.current;
    if (!expiration || expiration.id !== id || expiration.pauseReasons.has(reason)) return;
    expiration.pauseReasons.add(reason);
    if (expiration.timerId !== null) {
      expiration.remainingMs = Math.max(0, expiration.remainingMs - (Date.now() - expiration.startedAtMs));
      clearExpirationTimer();
    }
  }, [clearExpirationTimer]);

  const resumeNotice = useCallback((id: string, reason: string) => {
    const expiration = expirationRef.current;
    if (!expiration || expiration.id !== id || !expiration.pauseReasons.has(reason)) return;
    expiration.pauseReasons.delete(reason);
    if (expiration.pauseReasons.size === 0 && expiration.timerId === null) {
      if (expiration.remainingMs <= 0) {
        closeNotice(id);
        return;
      }
      scheduleExpiration(id, expiration.remainingMs);
    }
  }, [closeNotice, scheduleExpiration]);

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
  const currentNoticeId = currentNotice?.id;
  const currentNoticeDurationPolicy = currentNotice?.durationPolicy;

  useEffect(() => {
    clearExpirationTimer();
    expirationRef.current = null;
    const durationMs = currentNoticeDurationPolicy ? durationFor(currentNoticeDurationPolicy) : null;
    if (!currentNoticeId || durationMs === null) return undefined;

    expirationRef.current = {
      id: currentNoticeId,
      remainingMs: durationMs,
      startedAtMs: Date.now(),
      timerId: null,
      pauseReasons: new Set(),
    };
    scheduleExpiration(currentNoticeId, durationMs);
    return clearExpirationTimer;
  }, [clearExpirationTimer, currentNoticeDurationPolicy, currentNoticeId, scheduleExpiration]);

  useEffect(() => {
    if (!currentNoticeId || typeof document === 'undefined') return undefined;
    const updateBackgroundPause = () => {
      if (document.hidden) {
        pauseNotice(currentNoticeId, 'background');
      } else {
        resumeNotice(currentNoticeId, 'background');
      }
    };
    document.addEventListener('visibilitychange', updateBackgroundPause);
    updateBackgroundPause();
    return () => document.removeEventListener('visibilitychange', updateBackgroundPause);
  }, [currentNoticeId, pauseNotice, resumeNotice]);

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
      pauseNotice,
      resumeNotice,
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
