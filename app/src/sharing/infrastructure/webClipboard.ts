import type { FeedbackNoticeWriter } from '../../shared/ui/FeedbackNotice/feedbackNotice.types';

export const writeText: FeedbackNoticeWriter = async (text) => {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API is unavailable.');
  }
  await navigator.clipboard.writeText(text);
};
