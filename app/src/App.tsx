import { Route, Routes } from 'react-router-dom';
import './App.css';
import { WorkspacePage, type WorkspacePagePort } from './workspace/application/WorkspacePage';
import { CoreAdapter } from './core/infrastructure/coreAdapter';
import { readImportFileAsBase64 } from './imports/infrastructure/readImportFileAsBase64';
import { MovementsSearchPage } from './movements/index';
import type { MovementsSearchPagePort } from './movements/application/movementsSearch.port';
import { TaxonomyPage, type TaxonomyPagePort } from './taxonomy/application/TaxonomyPage';

const defaultCore = new CoreAdapter();
const defaultImportFileReader = { readAsBase64: readImportFileAsBase64 };
const workspaceRoutes = ['/', '/home', '/accounts', '/analytics', '/movements', '/profile'];

export type AppPort = WorkspacePagePort & MovementsSearchPagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;
  const workspacePage = (
    <WorkspacePage required={{ core: resolvedCore, importFileReader: defaultImportFileReader }} />
  );

  return (
    <Routes>
      {workspaceRoutes.map((path) => (
        <Route key={path} path={path} element={workspacePage} />
      ))}
      <Route path="/movements/search" element={<MovementsSearchPage required={{ core: resolvedCore }} />} />
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
    </Routes>
  );
}
