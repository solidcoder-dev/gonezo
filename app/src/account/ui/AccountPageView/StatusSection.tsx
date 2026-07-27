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
  const toastAlertClass = {
    success: 'alert-success',
    info: 'alert-info',
    warning: 'alert-warning',
    error: 'alert-danger',
  }[required.toast.tone];

  return (
    <>
      {required.screen.error ? (
        <div className="alert alert-danger mt-3" role="alert">
          {required.screen.error}
        </div>
      ) : null}
      {required.toast.message ? (
        <div
          className={`alert ${toastAlertClass} d-flex align-items-center flex-wrap gap-2 mt-3`}
          role={required.toast.tone === 'success' || required.toast.tone === 'info' ? 'status' : 'alert'}
          aria-live={required.toast.tone === 'success' || required.toast.tone === 'info' ? 'polite' : 'assertive'}
        >
          <span>{required.toast.message}</span>
          {required.toast.actionLabel ? (
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={provided.commands.runAction}>
              {required.toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="btn btn-sm btn-link" onClick={provided.commands.dismiss}>
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
