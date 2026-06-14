import { useEffect, useRef } from 'react';

export function useTransactionEntryOpenSignal(
  openSignal: number | undefined,
  enabled: boolean,
  accountId: string | null,
  open: () => void,
) {
  const lastHandledOpenSignalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (enabled && accountId && openSignal && lastHandledOpenSignalRef.current !== openSignal) {
      lastHandledOpenSignalRef.current = openSignal;
      open();
    }
  }, [accountId, enabled, open, openSignal]);
}
