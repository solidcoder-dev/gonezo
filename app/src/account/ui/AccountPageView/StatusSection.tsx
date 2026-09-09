import type { AccountPageViewProvided, AccountPageViewRequired } from './accountPageView.contract';
import { FeedbackNoticeView } from '../../../shared/ui/FeedbackNotice/FeedbackNoticeView';

export type StatusSectionRequired = {
  screen: AccountPageViewRequired['screen'];
  toast: AccountPageViewRequired['toast'];
};

export type StatusSectionProvided = AccountPageViewProvided['toast'];

type Props = {
  required: StatusSectionRequired;
  provided: StatusSectionProvided;
};

export function StatusSection({ required, provided }: Props) {
  return (
    <>
      {required.screen.error ? (
        <div className="alert alert-danger mt-3" role="alert">
          {required.screen.error}
        </div>
      ) : null}
      {required.toast.message ? (
        <FeedbackNoticeView
          required={{
            config: { tone: required.toast.tone },
            data: {
              message: required.toast.message,
              actionLabel: required.toast.actionLabel || undefined,
            },
            state: {},
            status: {},
          }}
          provided={{ commands: provided.commands }}
        />
      ) : null}
    </>
  );
}
