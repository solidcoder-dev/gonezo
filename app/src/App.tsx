import { Route, Routes } from 'react-router-dom';
import './App.css';
import type { AccountWorkspacePort } from './account/application/accountsCore.port';
import { WorkspacePage } from './workspace/application/WorkspacePage';
import { CoreAdapter } from './shared/infrastructure/core/coreAdapter';
import { MovementsSearchPage } from './movements';
import type { MovementsSearchPagePort } from './movements/application/movementsSearch.port';
import { TaxonomyPage, type TaxonomyPagePort } from './taxonomy/application/TaxonomyPage';

const defaultCore = new CoreAdapter();

export type AppCorePort = AccountWorkspacePort & MovementsSearchPagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppCorePort;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;

  return (
    <Routes>
      <Route path="/" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/accounts" element={<WorkspacePage required={{ core: resolvedCore }} />} />
      <Route path="/movements/search" element={<MovementsSearchPage required={{ core: resolvedCore }} />} />
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
    </Routes>
  );
}
