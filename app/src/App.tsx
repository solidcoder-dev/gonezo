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
import { ComponentGalleryView } from './shared/ui/ComponentGallery/ComponentGalleryView';
import { writeText } from './sharing/infrastructure/webClipboard';
import { createKeyboardVisibilityCapability } from './core/infrastructure/keyboardVisibility';
import { KeyboardVisibilityProvider } from './shared/ui/KeyboardVisibilityProvider';
import { createNotificationsAdapter } from './notifications/infrastructure/notificationsAdapter';
import { NotificationsPageComponent } from './notifications/application/NotificationsPageComponent';

const defaultCore = new CoreAdapter();
const defaultImportFileReader = { readAsBase64: readImportFileAsBase64 };
const defaultMovementVoiceEntryContext = createDefaultMovementVoiceEntryContext();
const defaultExperimentalFeatures = new LocalExperimentalFeaturesAdapter();
const defaultKeyboardVisibility = createKeyboardVisibilityCapability();
const defaultNotifications = createNotificationsAdapter();
const workspaceRoutes = ['/', '/home', '/accounts', '/analytics', '/movements', '/movements/new', '/movements/search', '/profile'];

export type AppPort = WorkspacePagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
  movementVoiceEntry?: Omit<MovementVoiceEntryContext, 'categorySource'>;
  experimentalFeatures?: ExperimentalFeaturesPort;
  notifications?: ReturnType<typeof createNotificationsAdapter>;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;
  const resolvedExperimentalFeatures = required?.experimentalFeatures ?? defaultExperimentalFeatures;
  const resolvedNotifications = required?.notifications ?? defaultNotifications;
  const voiceCategorySource = useMemo(() => ({
    taxonomyListCategories: (input?: { includeArchived?: boolean }) => resolvedCore.taxonomyListCategories(input),
  }), [resolvedCore]);
  const resolvedMovementVoiceEntry = useMemo(() => ({
    ...(required?.movementVoiceEntry ?? defaultMovementVoiceEntryContext),
    categorySource: voiceCategorySource,
  }), [required?.movementVoiceEntry, voiceCategorySource]);
  const workspacePage = useMemo(() => (
    <WorkspacePage required={{ core: resolvedCore, notifications: resolvedNotifications, importFileReader: defaultImportFileReader, voiceEntry: resolvedMovementVoiceEntry, experimentalFeatures: resolvedExperimentalFeatures, writeText }} />
  ), [resolvedCore, resolvedExperimentalFeatures, resolvedMovementVoiceEntry, resolvedNotifications]);

  return (
    <KeyboardVisibilityProvider capability={defaultKeyboardVisibility}>
      <Routes>
      {workspaceRoutes.map((path) => (
        <Route key={path} path={path} element={workspacePage} />
      ))}
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
      <Route path="/notifications" element={<NotificationsPageComponent required={{ notifications: resolvedNotifications }} />} />
      {import.meta.env.DEV ? <Route path="/__gallery" element={<ComponentGalleryView />} /> : null}
      </Routes>
    </KeyboardVisibilityProvider>
  );
}
