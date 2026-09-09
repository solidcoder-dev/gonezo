import { useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { FeedbackNoticeDestinationContext } from './feedbackNoticeDestinationContext';

export function FeedbackNoticeDestinationProvider({ children }: { children: ReactNode }) {
  const [destinations, setDestinations] = useState<Record<string, HTMLElement>>({});
  const registerDestination = useCallback((id: string, element: HTMLElement) => {
    setDestinations((current) => ({ ...current, [id]: element }));
  }, []);
  const unregisterDestination = useCallback((id: string) => {
    setDestinations((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);
  const activeDestination = Object.values(destinations).at(-1) ?? null;
  const value = useMemo(() => ({ activeDestination, registerDestination, unregisterDestination }), [activeDestination, registerDestination, unregisterDestination]);

  return <FeedbackNoticeDestinationContext.Provider value={value}>{children}</FeedbackNoticeDestinationContext.Provider>;
}

export function FeedbackNoticeDestination() {
  const context = useContext(FeedbackNoticeDestinationContext);
  const id = useId();
  const [element, setElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!context || !element) return undefined;
    context.registerDestination(id, element);
    return () => context.unregisterDestination(id);
  }, [context, element, id]);

  return <div ref={setElement} data-feedback-notice-destination />;
}
