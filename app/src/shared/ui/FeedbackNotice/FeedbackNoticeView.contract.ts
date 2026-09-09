import type { ViewProps } from '../ViewProps';
import type { FeedbackNoticeTone } from './feedbackNotice.types';

export type { FeedbackNoticeTone } from './feedbackNotice.types';

export type FeedbackNoticeViewProps = ViewProps<
  {
    tone: FeedbackNoticeTone;
  },
  {
    message: string;
    actionLabel?: string;
    count?: number;
  },
  Record<string, never>,
  Record<string, never>,
  {
    runAction: () => void;
    dismiss: () => void;
  }
>;
