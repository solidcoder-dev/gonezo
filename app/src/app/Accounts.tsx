import { CoreAdapter } from '../data/coreAdapter';
import { AccountsPage } from './accounts/AccountsPage';
import type { AccountsCorePort } from './accounts/useAccountsPageModel';

const defaultCore = new CoreAdapter();

type Props = {
  core?: AccountsCorePort;
};

export function Accounts({ core }: Props) {
  return <AccountsPage core={core ?? defaultCore} />;
}
