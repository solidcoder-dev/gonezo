import { Route, Routes } from 'react-router-dom';
import './App.css';
import { WorkspacePage, type WorkspacePagePort } from './workspace/application/WorkspacePage';
import { CoreAdapter } from './core/infrastructure/coreAdapter';
import { createDefaultMovementVoiceEntryContext } from './core/infrastructure/audio/createDefaultMovementVoiceEntryContext';
import { readImportFileAsBase64 } from './imports/infrastructure/readImportFileAsBase64';
import { MovementsSearchPage } from './movements/index';
import type { MovementsSearchPagePort } from './movements/application/movementsSearch.port';
import { TaxonomyPage, type TaxonomyPagePort } from './taxonomy/application/TaxonomyPage';
import type { MovementVoiceEntryContext } from './transactions/application/MovementVoiceEntry/movementVoiceEntryContext';

const defaultCore = new CoreAdapter();
const defaultImportFileReader = { readAsBase64: readImportFileAsBase64 };
const defaultMovementVoiceEntryContext = createDefaultMovementVoiceEntryContext();
const workspaceRoutes = ['/', '/home', '/accounts', '/analytics', '/movements', '/profile'];

export type AppPort = WorkspacePagePort & MovementsSearchPagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
  movementVoiceEntry?: MovementVoiceEntryContext;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;
  const resolvedMovementVoiceEntry = required?.movementVoiceEntry ?? defaultMovementVoiceEntryContext;
  const workspacePage = (
    <WorkspacePage required={{ core: resolvedCore, importFileReader: defaultImportFileReader, voiceEntry: resolvedMovementVoiceEntry }} />
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
