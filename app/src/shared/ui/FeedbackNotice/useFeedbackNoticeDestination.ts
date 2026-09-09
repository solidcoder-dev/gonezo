import { useContext } from 'react';
import { FeedbackNoticeDestinationContext } from './feedbackNoticeDestinationContext';

export function useFeedbackNoticeDestination() {
  return useContext(FeedbackNoticeDestinationContext)?.activeDestination ?? null;
}
