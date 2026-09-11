import { useEffect, useMemo } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
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
import { NotificationSettingsPageComponent } from './notifications/application/NotificationSettingsPageComponent';
import { LocalAmountVisibilityAdapter } from './core/infrastructure/LocalAmountVisibilityAdapter';
import { useAmountVisibilityModel } from './workspace/application/useAmountVisibilityModel';
import type { AmountVisibilityPort } from './workspace/application/amountVisibility.port';

const defaultCore = new CoreAdapter();
const defaultImportFileReader = { readAsBase64: readImportFileAsBase64 };
const defaultMovementVoiceEntryContext = createDefaultMovementVoiceEntryContext();
const defaultExperimentalFeatures = new LocalExperimentalFeaturesAdapter();
const defaultKeyboardVisibility = createKeyboardVisibilityCapability();
const defaultNotifications = createNotificationsAdapter();
const defaultAmountVisibility = new LocalAmountVisibilityAdapter();
const workspaceRoutes = ['/', '/home', '/accounts', '/analytics', '/analytics/category/:categoryId', '/analytics/forecast', '/movements', '/movements/new', '/movements/search', '/profile'];

export type AppPort = WorkspacePagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
  movementVoiceEntry?: Omit<MovementVoiceEntryContext, 'categorySource'>;
  experimentalFeatures?: ExperimentalFeaturesPort;
  notifications?: ReturnType<typeof createNotificationsAdapter>;
  amountVisibility?: AmountVisibilityPort;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;
  const resolvedExperimentalFeatures = required?.experimentalFeatures ?? defaultExperimentalFeatures;
  const resolvedNotifications = required?.notifications ?? defaultNotifications;
  const resolvedAmountVisibility = required?.amountVisibility ?? defaultAmountVisibility;
  const amountVisibility = useAmountVisibilityModel({ port: resolvedAmountVisibility });
  const notificationIntentRouter = <NotificationIntentRouter />;
  const voiceCategorySource = useMemo(() => ({
    taxonomyListCategories: (input?: { includeArchived?: boolean }) => resolvedCore.taxonomyListCategories(input),
  }), [resolvedCore]);
  const resolvedMovementVoiceEntry = useMemo(() => ({
    ...(required?.movementVoiceEntry ?? defaultMovementVoiceEntryContext),
    categorySource: voiceCategorySource,
  }), [required?.movementVoiceEntry, voiceCategorySource]);
  const workspacePage = useMemo(() => (
    <WorkspacePage required={{ core: resolvedCore, notifications: resolvedNotifications, importFileReader: defaultImportFileReader, voiceEntry: resolvedMovementVoiceEntry, experimentalFeatures: resolvedExperimentalFeatures, amountVisibility, writeText }} />
  ), [amountVisibility, resolvedCore, resolvedExperimentalFeatures, resolvedMovementVoiceEntry, resolvedNotifications]);

  return (
    <KeyboardVisibilityProvider capability={defaultKeyboardVisibility}>
      {notificationIntentRouter}
      <Routes>
      {workspaceRoutes.map((path) => (
        <Route key={path} path={path} element={workspacePage} />
      ))}
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
      <Route path="/notifications" element={<NotificationsPageComponent required={{ notifications: resolvedNotifications, core: resolvedCore }} />} />
      <Route path="/profile/notifications" element={<NotificationSettingsPageComponent required={{ notifications: resolvedNotifications, lifecycle: resolvedNotifications }} />} />
      {import.meta.env.DEV ? <Route path="/__gallery" element={<ComponentGalleryView />} /> : null}
      </Routes>
    </KeyboardVisibilityProvider>
  );
}

function NotificationIntentRouter() {
  const navigate = useNavigate();
  useEffect(() => {
    const openNotifications = () => { void navigate('/notifications'); };
    window.addEventListener('gonezoNotificationIntent', openNotifications);
    return () => window.removeEventListener('gonezoNotificationIntent', openNotifications);
  }, [navigate]);
  return null;
}
