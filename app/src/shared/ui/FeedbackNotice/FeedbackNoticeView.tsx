import type { FeedbackNoticeViewProps } from './FeedbackNoticeView.contract';

const toneClasses = {
  success: 'alert-success',
  info: 'alert-info',
  warning: 'alert-warning',
  error: 'alert-danger',
} as const;

export type { FeedbackNoticeViewProps } from './FeedbackNoticeView.contract';

export function FeedbackNoticeView({ required, provided }: FeedbackNoticeViewProps) {
  const isAssertive = required.config.tone === 'warning' || required.config.tone === 'error';

  return (
    <div
      className={`alert ${toneClasses[required.config.tone]} d-flex align-items-center flex-wrap gap-2 mt-3`}
      role={isAssertive ? 'alert' : 'status'}
      aria-live={isAssertive ? 'assertive' : 'polite'}
    >
      <span>
        {required.data.message}
        {required.data.count && required.data.count > 1 ? ` (${required.data.count})` : null}
      </span>
      {required.data.actionLabel ? (
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={provided.commands.runAction}>
          {required.data.actionLabel}
        </button>
      ) : null}
      <button type="button" className="btn btn-sm btn-link" onClick={provided.commands.dismiss}>
        Dismiss
      </button>
    </div>
  );
}
