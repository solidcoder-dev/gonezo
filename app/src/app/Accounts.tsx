import { CoreAdapter } from '../data/coreAdapter';
import { AccountPageView } from '../account/ui/AccountPageView';
import type { AccountsCorePort } from '../account/application/useAccountPageOrchestrator';

const defaultCore = new CoreAdapter();

type Props = {
  core?: AccountsCorePort;
};

export function Accounts({ core }: Props) {
  return <AccountPageView core={core ?? defaultCore} />;
}
