import type { FeedbackNotice } from './feedbackNotice.types';
import { FeedbackNoticeView } from './FeedbackNoticeView';
import styles from './FeedbackNoticePresenter.module.css';

type FeedbackNoticePresenterProps = {
  notices: readonly FeedbackNotice[];
  closeNotice: (id: string) => void;
};

export function FeedbackNoticePresenter({ notices, closeNotice }: FeedbackNoticePresenterProps) {
  const notice = notices[notices.length - 1];
  if (!notice) return null;

  return (
    <div className={styles.container} aria-label="Workspace feedback">
      <div className={styles.notice}>
        <FeedbackNoticeView
          required={{
            config: { tone: notice.tone },
            data: {
              message: notice.message,
              actionLabel: notice.action?.label,
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
