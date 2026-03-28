import { Route, Routes } from 'react-router-dom';
import './App.css';
import type { AccountsCorePort } from './account/application/useAccountPageModel';
import { AccountPage } from './account/application/AccountPage';
import { CoreAdapter } from './shared/infrastructure/core/coreAdapter';

const defaultCore = new CoreAdapter();

type Props = {
  core?: AccountsCorePort;
};

export function App({ core }: Props) {
  const resolvedCore = core ?? defaultCore;

  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<AccountPage core={resolvedCore} />} />
          <Route path="/accounts" element={<AccountPage core={resolvedCore} />} />
        </Routes>
      </main>
    </div>
  );
}
