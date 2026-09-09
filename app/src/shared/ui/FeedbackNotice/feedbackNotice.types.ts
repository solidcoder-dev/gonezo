export type FeedbackNoticeTone = 'success' | 'info' | 'warning' | 'error';

export type FeedbackNoticeDurationPolicy = 'standard' | 'warning' | 'until-closed' | 'until-updated';

export type FeedbackNoticeAction = Readonly<{
  label: string;
  run: () => void;
}>;

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
}>;

export type FeedbackNoticeInput = Omit<FeedbackNotice, 'id' | 'durationPolicy'> & {
  durationPolicy?: FeedbackNoticeDurationPolicy;
};

export type FeedbackNoticeUpdate = Partial<Omit<FeedbackNotice, 'id'>>;
