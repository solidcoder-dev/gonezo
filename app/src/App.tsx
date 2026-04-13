import { Route, Routes } from 'react-router-dom';
import './App.css';
import type { AccountsCorePort } from './account/application/useAccountPageModel';
import { AccountPage } from './account/application/AccountPage';
import { CoreAdapter } from './shared/infrastructure/core/coreAdapter';
import { MovementsSearchPage } from './movements';

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
    <Routes>
      <Route path="/" element={<AccountPage required={{ core: resolvedCore }} />} />
      <Route path="/accounts" element={<AccountPage required={{ core: resolvedCore }} />} />
      <Route path="/movements/search" element={<MovementsSearchPage required={{ core: resolvedCore }} />} />
    </Routes>
  );
}
