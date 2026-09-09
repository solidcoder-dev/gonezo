export type FeedbackNoticeTone = 'success' | 'info' | 'warning' | 'error';

export type FeedbackNoticeDurationPolicy = 'standard' | 'warning' | 'until-closed' | 'until-updated';

export type FeedbackNoticeAction = Readonly<{
  label: string;
  run: () => void;
}>;

export type FeedbackNoticeWriter = (text: string) => Promise<void>;

export type FeedbackNoticeDetails = Readonly<{
  code?: string;
  operation?: string;
  fields?: readonly Readonly<{
    label: string;
    value: string;
  }>[];
}>;

export type FeedbackNotice = Readonly<{
  id: string;
  tone: FeedbackNoticeTone;
  message: string;
  source: string;
  deduplicationKey?: string;
  details?: FeedbackNoticeDetails;
  action?: FeedbackNoticeAction;
  durationPolicy: FeedbackNoticeDurationPolicy;
  count?: number;
  priority?: 'normal' | 'immediate';
}>;

export type FeedbackNoticeInput = Omit<FeedbackNotice, 'id' | 'durationPolicy' | 'count'> & {
  durationPolicy?: FeedbackNoticeDurationPolicy;
};

export type FeedbackNoticeUpdate = Partial<Omit<FeedbackNotice, 'id'>>;
