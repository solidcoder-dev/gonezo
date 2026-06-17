import { Route, Routes } from 'react-router-dom';
import './App.css';
import type { AccountWorkspacePort } from './account/application/accounts.port';
import { WorkspacePage } from './workspace/application/WorkspacePage';
import { CoreAdapter } from './core/infrastructure/coreAdapter';
import { MovementsSearchPage } from './movements/index';
import type { MovementsSearchPagePort } from './movements/application/movementsSearch.port';
import { TaxonomyPage, type TaxonomyPagePort } from './taxonomy/application/TaxonomyPage';

const defaultCore = new CoreAdapter();

export type AppPort = AccountWorkspacePort & MovementsSearchPagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;

  return (
    <Routes>
      <Route path="/" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/home" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/accounts" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/analytics" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/movements" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/profile" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/movements/search" element={<MovementsSearchPage required={{ core: resolvedCore }} />} />
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
    </Routes>
  );
}
