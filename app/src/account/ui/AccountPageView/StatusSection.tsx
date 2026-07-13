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
  const toastClassName = `toast toast--${required.toast.tone}`;

  return (
    <>
      {required.screen.error ? (
        <div className="banner error" role="alert">
          {required.screen.error}
        </div>
      ) : null}
      {required.toast.message ? (
        <div
          className={toastClassName}
          role={required.toast.tone === 'success' || required.toast.tone === 'info' ? 'status' : 'alert'}
          aria-live={required.toast.tone === 'success' || required.toast.tone === 'info' ? 'polite' : 'assertive'}
        >
          <span>{required.toast.message}</span>
          {required.toast.actionLabel ? (
            <button type="button" className="toast-action" onClick={provided.commands.runAction}>
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
