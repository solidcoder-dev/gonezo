import type { AccountPageViewProvided, AccountPageViewRequired } from './accountPageView.contract';

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
        <div className="banner error" role="alert">
          {required.screen.error}
        </div>
      ) : null}
      {required.toast.message ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{required.toast.message}</span>
          {required.toast.actionLabel ? (
            <button type="button" className="text-button" onClick={provided.commands.runAction}>
              {required.toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={provided.commands.dismiss}>
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
