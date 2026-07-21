import { useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';
import { WorkspacePage, type WorkspacePagePort } from './workspace/application/WorkspacePage';
import { CoreAdapter } from './core/infrastructure/coreAdapter';
import { createDefaultMovementVoiceEntryContext } from './core/infrastructure/audio/createDefaultMovementVoiceEntryContext';
import { readImportFileAsBase64 } from './imports/infrastructure/readImportFileAsBase64';
import { TaxonomyPage, type TaxonomyPagePort } from './taxonomy/application/TaxonomyPage';
import type { MovementVoiceEntryContext } from './transactions/application/MovementVoiceEntry/movementVoiceEntryContext';
import { LocalExperimentalFeaturesAdapter } from './experiments/infrastructure/LocalExperimentalFeaturesAdapter';
import type { ExperimentalFeaturesPort } from './experiments/application/experimentalFeatures.port';

const defaultCore = new CoreAdapter();
const defaultImportFileReader = { readAsBase64: readImportFileAsBase64 };
const defaultMovementVoiceEntryContext = createDefaultMovementVoiceEntryContext();
const defaultExperimentalFeatures = new LocalExperimentalFeaturesAdapter();
const workspaceRoutes = ['/', '/home', '/accounts', '/analytics', '/movements', '/movements/search', '/profile'];

export type AppPort = WorkspacePagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
  movementVoiceEntry?: Omit<MovementVoiceEntryContext, 'categorySource'>;
  experimentalFeatures?: ExperimentalFeaturesPort;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;
  const resolvedExperimentalFeatures = required?.experimentalFeatures ?? defaultExperimentalFeatures;
  const voiceCategorySource = useMemo(() => ({
    taxonomyListCategories: (input?: { includeArchived?: boolean }) => resolvedCore.taxonomyListCategories(input),
  }), [resolvedCore]);
  const resolvedMovementVoiceEntry = useMemo(() => ({
    ...(required?.movementVoiceEntry ?? defaultMovementVoiceEntryContext),
    categorySource: voiceCategorySource,
  }), [required?.movementVoiceEntry, voiceCategorySource]);
  const workspacePage = useMemo(() => (
    <WorkspacePage required={{ core: resolvedCore, importFileReader: defaultImportFileReader, voiceEntry: resolvedMovementVoiceEntry, experimentalFeatures: resolvedExperimentalFeatures }} />
  ), [resolvedCore, resolvedExperimentalFeatures, resolvedMovementVoiceEntry]);

  return (
    <Routes>
      {workspaceRoutes.map((path) => (
        <Route key={path} path={path} element={workspacePage} />
      ))}
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
    </Routes>
  );
}
