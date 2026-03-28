import type { AccountPageActions, AccountPageState } from '../accountPageView.contract';

type Props = {
  screen: AccountPageState['screen'];
  toast: AccountPageState['toast'];
  toastActions: AccountPageActions['toast'];
};

export function StatusSection({ screen, toast, toastActions }: Props) {
  return (
    <>
      {screen.error ? (
        <div className="banner error" role="alert">
          {screen.error}
        </div>
      ) : null}
      {toast.message ? (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.actionLabel ? (
            <button type="button" className="text-button" onClick={toastActions.runAction}>
              {toast.actionLabel}
            </button>
          ) : null}
          <button type="button" className="text-button" onClick={toastActions.dismiss}>
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
