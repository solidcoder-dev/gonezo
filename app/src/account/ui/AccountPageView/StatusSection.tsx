import type { AccountPageViewProvided, AccountPageViewRequired } from './accountPageView.contract';

export type StatusSectionRequired = {
  screen: AccountPageViewRequired['screen'];
};

export type StatusSectionProvided = AccountPageViewProvided;

type Props = {
  required: StatusSectionRequired;
  provided: StatusSectionProvided;
};

export function StatusSection({ required }: Props) {
  return (
    <>
      {required.screen.error ? (
        <div className="alert alert-danger mt-3" role="alert">
          {required.screen.error}
        </div>
      ) : null}
    </>
  );
}
