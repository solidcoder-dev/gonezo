import { useCallback, useEffect, useRef, useState } from 'react';
import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import type { AmountVisibilityPort } from './amountVisibility.port';

export type AmountVisibilityModel = Readonly<{
  state: Readonly<{
    loading: boolean;
    saving: boolean;
    visibility: AmountVisibility;
    error: string | null;
  }>;
  commands: Readonly<{
    toggleAmountVisibility(): Promise<void>;
  }>;
}>;

export type UseAmountVisibilityModelInput = Readonly<{
  port: AmountVisibilityPort;
  events?: Readonly<{
    onError?: (error: { message: string }) => void;
  }>;
}>;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useAmountVisibilityModel({ port, events }: UseAmountVisibilityModelInput): AmountVisibilityModel {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibility, setVisibility] = useState<AmountVisibility>('hidden');
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const savingRef = useRef(false);
  const visibilityRef = useRef<AmountVisibility>('hidden');
  const eventsRef = useRef(events);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    void port.load().then((loaded) => {
      if (cancelled || requestIdRef.current !== requestId || !mountedRef.current) {
        return;
      }
      visibilityRef.current = loaded;
      setVisibility(loaded);
    }).catch((cause) => {
      if (cancelled || requestIdRef.current !== requestId || !mountedRef.current) {
        return;
      }
      const message = errorMessage(cause, 'Unable to load amount visibility.');
      visibilityRef.current = 'hidden';
      setVisibility('hidden');
      setError(message);
      eventsRef.current?.onError?.({ message });
    }).finally(() => {
      if (!cancelled && requestIdRef.current === requestId && mountedRef.current) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [port]);

  const toggleAmountVisibility = useCallback(async () => {
    if (loading || savingRef.current) {
      return;
    }

    const nextVisibility: AmountVisibility = visibilityRef.current === 'visible' ? 'hidden' : 'visible';
    savingRef.current = true;
    visibilityRef.current = nextVisibility;
    setSaving(true);
    setError(null);
    setVisibility(nextVisibility);

    try {
      await port.save(nextVisibility);
    } catch (cause) {
      if (mountedRef.current) {
        const message = errorMessage(cause, 'Unable to save amount visibility.');
        setError(message);
        eventsRef.current?.onError?.({ message });
      }
    } finally {
      savingRef.current = false;
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [loading, port]);

  return {
    state: { loading, saving, visibility, error },
    commands: { toggleAmountVisibility },
  };
}
