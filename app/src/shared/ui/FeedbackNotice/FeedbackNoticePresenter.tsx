import type { FeedbackNotice } from './feedbackNotice.types';
import { FeedbackNoticeView } from './FeedbackNoticeView';
import styles from './FeedbackNoticePresenter.module.css';

type FeedbackNoticePresenterProps = {
  notices: readonly FeedbackNotice[];
  closeNotice: (id: string) => void;
  pauseNotice: (id: string, reason: string) => void;
  resumeNotice: (id: string, reason: string) => void;
};

export function FeedbackNoticePresenter({ notices, closeNotice, pauseNotice, resumeNotice }: FeedbackNoticePresenterProps) {
  const notice = notices[notices.length - 1];
  if (!notice) return null;

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
            },
            state: {},
            status: {},
          }}
          provided={{
            commands: {
              runAction: () => notice.action?.run(),
              dismiss: () => closeNotice(notice.id),
            },
          }}
        />
      </div>
    </div>
  );
}
