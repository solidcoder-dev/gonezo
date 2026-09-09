import { useState } from 'react';
import type { FeedbackNotice, FeedbackNoticeWriter } from './feedbackNotice.types';
import { FeedbackNoticeView } from './FeedbackNoticeView';
import styles from './FeedbackNoticePresenter.module.css';

type FeedbackNoticePresenterProps = {
  notices: readonly FeedbackNotice[];
  closeNotice: (id: string) => void;
  pauseNotice: (id: string, reason: string) => void;
  resumeNotice: (id: string, reason: string) => void;
  writeText?: FeedbackNoticeWriter;
};

function safeCopyText(notice: FeedbackNotice) {
  return [
    notice.message,
    notice.details?.code ? `Code: ${notice.details.code}` : null,
    notice.details?.operation ? `Operation: ${notice.details.operation}` : null,
  ].filter((value): value is string => value !== null).join('\n');
}

function safeDetailsText(notice: FeedbackNotice) {
  return [
    notice.details?.code ? `Code: ${notice.details.code}` : null,
    notice.details?.operation ? `Operation: ${notice.details.operation}` : null,
    ...(notice.details?.fields ?? []).map((field) => `${field.label}: ${field.value}`),
  ].filter((value): value is string => value !== null).join('\n');
}

export function FeedbackNoticePresenter({ notices, closeNotice, pauseNotice, resumeNotice, writeText }: FeedbackNoticePresenterProps) {
  const [copyState, setCopyState] = useState<{ id: string; state: 'copied' | 'failed' } | null>(null);
  const notice = notices[0];
  if (!notice) return null;
  const details = notice.details ? safeDetailsText(notice) : undefined;
  const currentCopyState = copyState?.id === notice.id ? copyState.state : 'idle';
  const copyAvailable = notice.tone === 'error' || Boolean(notice.details);

  async function copyNotice() {
    if (!writeText) {
      setCopyState({ id: notice.id, state: 'failed' });
      return;
    }
    try {
      await writeText(safeCopyText(notice));
      setCopyState({ id: notice.id, state: 'copied' });
    } catch {
      setCopyState({ id: notice.id, state: 'failed' });
    }
  }

  return (
    <div className={styles.container} aria-label="Workspace feedback">
      <div
        className={styles.notice}
        onMouseEnter={() => pauseNotice(notice.id, 'hover')}
        onMouseLeave={() => resumeNotice(notice.id, 'hover')}
        onFocusCapture={() => pauseNotice(notice.id, 'focus')}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            resumeNotice(notice.id, 'focus');
          }
        }}
        onTouchStart={() => pauseNotice(notice.id, 'touch')}
        onTouchEnd={() => resumeNotice(notice.id, 'touch')}
        onTouchCancel={() => resumeNotice(notice.id, 'touch')}
      >
        <FeedbackNoticeView
          required={{
            config: { tone: notice.tone },
            data: {
              message: notice.message,
              actionLabel: notice.action?.label,
              count: notice.count,
              details,
              copyState: copyAvailable ? currentCopyState : undefined,
            },
            state: {},
            status: {},
          }}
          provided={{
            commands: {
              runAction: () => notice.action?.run(),
              dismiss: () => closeNotice(notice.id),
              copy: copyAvailable ? () => { void copyNotice(); } : undefined,
              detailsToggled: (open) => {
                if (open) pauseNotice(notice.id, 'details');
                else resumeNotice(notice.id, 'details');
              },
            },
          }}
        />
      </div>
    </div>
  );
}
