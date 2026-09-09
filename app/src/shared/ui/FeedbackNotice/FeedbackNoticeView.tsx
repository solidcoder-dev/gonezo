import { useState } from 'react';
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const copyLabel = required.data.copyState === 'copied'
    ? 'Copied'
    : required.data.copyState === 'failed'
      ? 'Copy error'
      : 'Copy';

  function toggleDetails() {
    setDetailsOpen((open) => {
      const next = !open;
      provided.commands.detailsToggled?.(next);
      return next;
    });
  }

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
      {required.data.details ? (
        <button type="button" className="btn btn-sm btn-link" aria-expanded={detailsOpen} onClick={toggleDetails}>
          Details
        </button>
      ) : null}
      {provided.commands.copy ? (
        <button type="button" className="btn btn-sm btn-link" onClick={provided.commands.copy}>
          {copyLabel}
        </button>
      ) : null}
      {detailsOpen && required.data.details ? (
        <pre className="small text-break user-select-all w-100 mb-0">{required.data.details}</pre>
      ) : null}
      {required.data.copyState === 'failed' ? (
        <span role="status" className="user-select-all">Copy error</span>
      ) : null}
      <button type="button" className="btn btn-sm btn-link" onClick={provided.commands.dismiss}>
        Dismiss
      </button>
    </div>
  );
}
