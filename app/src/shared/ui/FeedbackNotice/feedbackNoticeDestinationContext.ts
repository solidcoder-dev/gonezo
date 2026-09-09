import { createContext } from 'react';

export type FeedbackNoticeDestinationContextValue = {
  activeDestination: HTMLElement | null;
  registerDestination: (id: string, element: HTMLElement) => void;
  unregisterDestination: (id: string) => void;
};

export const FeedbackNoticeDestinationContext = createContext<FeedbackNoticeDestinationContextValue | null>(null);
