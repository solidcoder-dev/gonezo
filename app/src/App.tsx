import { Route, Routes } from 'react-router-dom';
import './App.css';
import type { AccountsCorePort } from './account/application/useAccountPageModel';
import { AccountPage } from './account/application/AccountPage';
import { CoreAdapter } from './shared/infrastructure/core/coreAdapter';

const defaultCore = new CoreAdapter();

export type AppRequired = {
  core?: AccountsCorePort;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;

  return (
    <div className="app-shell">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<AccountPage required={{ core: resolvedCore }} />} />
          <Route path="/accounts" element={<AccountPage required={{ core: resolvedCore }} />} />
        </Routes>
      </main>
    </div>
  );
}
