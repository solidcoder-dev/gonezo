import { useEffect, useRef } from 'react';

export function useTransactionEntryOpenSignal(
  openSignal: number | undefined,
  enabled: boolean,
  accountId: string | null,
  open: () => void,
) {
  const lastHandledOpenSignalRef = useRef<number | undefined>(undefined);
  const lastSeenOpenSignalRef = useRef(openSignal);
  const wasReadyRef = useRef(Boolean(enabled && accountId));
  const initializedRef = useRef(false);

  useEffect(() => {
    const ready = enabled && Boolean(accountId);

    if (!ready) {
      lastSeenOpenSignalRef.current = openSignal;
      wasReadyRef.current = false;
      initializedRef.current = true;
      return;
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      wasReadyRef.current = true;
      lastSeenOpenSignalRef.current = openSignal;
      if (openSignal) {
        lastHandledOpenSignalRef.current = openSignal;
        open();
      }
      return;
    }

    if (!wasReadyRef.current) {
      wasReadyRef.current = true;
      lastSeenOpenSignalRef.current = openSignal;
      return;
    }

    if (openSignal && lastSeenOpenSignalRef.current !== openSignal) {
      lastSeenOpenSignalRef.current = openSignal;
      lastHandledOpenSignalRef.current = openSignal;
      open();
    }
  }, [accountId, enabled, open, openSignal]);
}
