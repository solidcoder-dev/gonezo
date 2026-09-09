import type { ViewProps } from '../ViewProps';

export type FeedbackNoticeTone = 'success' | 'info' | 'warning' | 'error';

export type FeedbackNoticeViewProps = ViewProps<
  {
    tone: FeedbackNoticeTone;
  },
  {
    message: string;
    actionLabel?: string;
  },
  Record<string, never>,
  Record<string, never>,
  {
    runAction: () => void;
    dismiss: () => void;
  }
>;
