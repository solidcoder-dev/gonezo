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
import { SharingPeoplePage } from './sharing/application/SharingPeoplePage';
import { AuthenticationGate } from './authentication/application/AuthenticationGate';
import { createAuthenticationService } from './authentication/infrastructure/createAuthenticationService';
import type { AuthenticationUseCases } from './authentication/application/authentication.port';
import { Capacitor } from '@capacitor/core';
import { RequiredOnboardingGate } from './analyticsProfile/application/RequiredOnboardingGate';
import { AnalyticsProfileSettingsPage } from './analyticsProfile/application/AnalyticsProfileSettingsPage';
import { InMemoryAnalyticsProfileAdapter } from './analyticsProfile/infrastructure/InMemoryAnalyticsProfileAdapter';
import { NativeAnalyticsProfileAdapter } from './analyticsProfile/infrastructure/NativeAnalyticsProfileAdapter';
import type { AnalyticsProfilePort } from './analyticsProfile/application/analyticsProfile.port';
import { AnalyticsContributionConsentGate } from './macroAnalytics/application/AnalyticsContributionConsentGate';
import { InMemoryAnalyticsContributionConsentAdapter } from './macroAnalytics/infrastructure/InMemoryAnalyticsContributionConsentAdapter';
import { NativeAnalyticsContributionConsentAdapter } from './macroAnalytics/infrastructure/NativeAnalyticsContributionConsentAdapter';
import type { AnalyticsContributionConsentPort } from './macroAnalytics/application/analyticsContributionConsent.port';
import type { ConsentClock } from './macroAnalytics/application/analyticsContributionConsentUseCases';
import type { MacroAnalyticsOutboxPort } from './macroAnalytics/application/macroAnalyticsOutbox.port';
import { InMemoryContributionRebuildQueueAdapter, InMemoryMacroAnalyticsBackfillStateAdapter, InMemoryMacroAnalyticsOutboxAdapter } from './macroAnalytics/infrastructure/InMemoryMacroAnalyticsAdapters';
import { NativeMacroAnalyticsOutboxAdapter } from './macroAnalytics/infrastructure/NativeMacroAnalyticsAdapters';
import { NativeContributionRebuildQueueAdapter } from './macroAnalytics/infrastructure/NativeContributionRebuildQueueAdapter';
import { NativeMacroAnalyticsBackfillStateAdapter } from './macroAnalytics/infrastructure/NativeMacroAnalyticsBackfillStateAdapter';
import { withMacroAnalyticsConsentLifecycle } from './macroAnalytics/application/MacroAnalyticsConsentLifecycle';
import { withMacroAnalyticsProfileRebuild } from './macroAnalytics/infrastructure/AnalyticsProfileRebuildDecorator';

const systemConsentClock = () => new Date().toISOString();

const defaultCore = new CoreAdapter();
const defaultImportFileReader = { readAsBase64: readImportFileAsBase64 };
const defaultMovementVoiceEntryContext = createDefaultMovementVoiceEntryContext();
const defaultExperimentalFeatures = new LocalExperimentalFeaturesAdapter();
const defaultKeyboardVisibility = createKeyboardVisibilityCapability();
const defaultNotifications = createNotificationsAdapter();
const defaultAmountVisibility = new LocalAmountVisibilityAdapter();
const defaultAuthentication = createAuthenticationService();
const defaultAnalyticsProfile: AnalyticsProfilePort = Capacitor.isNativePlatform()
  ? new NativeAnalyticsProfileAdapter()
  : new InMemoryAnalyticsProfileAdapter();
const defaultContributionConsent: AnalyticsContributionConsentPort = Capacitor.isNativePlatform()
  ? new NativeAnalyticsContributionConsentAdapter()
  : new InMemoryAnalyticsContributionConsentAdapter();
const defaultMacroAnalyticsOutbox: MacroAnalyticsOutboxPort = Capacitor.isNativePlatform()
  ? new NativeMacroAnalyticsOutboxAdapter()
  : new InMemoryMacroAnalyticsOutboxAdapter();
const defaultContributionRebuildQueue = Capacitor.isNativePlatform()
  ? new NativeContributionRebuildQueueAdapter()
  : new InMemoryContributionRebuildQueueAdapter();
const defaultMacroAnalyticsBackfillState = Capacitor.isNativePlatform()
  ? new NativeMacroAnalyticsBackfillStateAdapter()
  : new InMemoryMacroAnalyticsBackfillStateAdapter();
const defaultLifecycleContributionConsent = withMacroAnalyticsConsentLifecycle(defaultContributionConsent, {
  backfillState: defaultMacroAnalyticsBackfillState,
  rebuildQueue: defaultContributionRebuildQueue,
  outbox: defaultMacroAnalyticsOutbox,
});
const defaultLifecycleAnalyticsProfile = withMacroAnalyticsProfileRebuild(defaultAnalyticsProfile, defaultMacroAnalyticsBackfillState);
const workspaceRoutes = ['/', '/home', '/accounts', '/analytics', '/analytics/category/:categoryId', '/analytics/forecast', '/movements', '/movements/new', '/movements/search', '/movements/:source/:movementId/edit/:feature', '/profile'];

export type AppPort = WorkspacePagePort & TaxonomyPagePort;

export type AppRequired = {
  core?: AppPort;
  movementVoiceEntry?: Omit<MovementVoiceEntryContext, 'categorySource'>;
  experimentalFeatures?: ExperimentalFeaturesPort;
  notifications?: ReturnType<typeof createNotificationsAdapter>;
  amountVisibility?: AmountVisibilityPort;
  authentication?: AuthenticationUseCases;
  analyticsProfile?: AnalyticsProfilePort;
  contributionConsent?: AnalyticsContributionConsentPort;
  macroAnalyticsOutbox?: MacroAnalyticsOutboxPort;
  contributionConsentClock?: ConsentClock;
};

type AppProps = {
  required?: AppRequired;
};

export function App({ required }: AppProps) {
  const resolvedCore = required?.core ?? defaultCore;
  const resolvedExperimentalFeatures = required?.experimentalFeatures ?? defaultExperimentalFeatures;
  const resolvedNotifications = required?.notifications ?? defaultNotifications;
  const resolvedAmountVisibility = required?.amountVisibility ?? defaultAmountVisibility;
  const resolvedAuthentication = required?.authentication ?? defaultAuthentication;
  const resolvedAnalyticsProfile = required?.analyticsProfile ?? defaultLifecycleAnalyticsProfile;
  const resolvedContributionConsent = required?.contributionConsent ?? defaultLifecycleContributionConsent;
  const resolvedMacroAnalyticsOutbox = required?.macroAnalyticsOutbox ?? defaultMacroAnalyticsOutbox;
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
    <WorkspacePage required={{ core: resolvedCore, notifications: resolvedNotifications, importFileReader: defaultImportFileReader, voiceEntry: resolvedMovementVoiceEntry, experimentalFeatures: resolvedExperimentalFeatures, amountVisibility, writeText, authentication: resolvedAuthentication, analyticsProfile: resolvedAnalyticsProfile, contributionConsent: resolvedContributionConsent, contributionConsentClock: required?.contributionConsentClock ?? systemConsentClock, macroAnalyticsOutbox: resolvedMacroAnalyticsOutbox }} />
  ), [amountVisibility, required?.contributionConsentClock, resolvedAnalyticsProfile, resolvedAuthentication, resolvedContributionConsent, resolvedCore, resolvedExperimentalFeatures, resolvedMovementVoiceEntry, resolvedNotifications, resolvedMacroAnalyticsOutbox]);

  return (
    <AuthenticationGate required={{ authentication: resolvedAuthentication }}>
    <RequiredOnboardingGate port={resolvedAnalyticsProfile}>
    <AnalyticsContributionConsentGate port={resolvedContributionConsent} clock={required?.contributionConsentClock ?? systemConsentClock}>
    <KeyboardVisibilityProvider capability={defaultKeyboardVisibility}>
      {notificationIntentRouter}
      <Routes>
      {workspaceRoutes.map((path) => (
        <Route key={path} path={path} element={workspacePage} />
      ))}
      <Route path="/taxonomy" element={<TaxonomyPage required={{ core: resolvedCore }} />} />
      <Route path="/notifications" element={<NotificationsPageComponent required={{ notifications: resolvedNotifications, core: resolvedCore }} />} />
      <Route path="/profile/notifications" element={<NotificationSettingsPageComponent required={{ notifications: resolvedNotifications, lifecycle: resolvedNotifications }} />} />
      <Route path="/profile/sharing-people" element={<SharingPeoplePage required={{ core: resolvedCore }} />} />
      <Route path="/profile/analytics-profile" element={<AnalyticsProfileSettingsPage port={resolvedAnalyticsProfile} />} />
      {import.meta.env.DEV ? <Route path="/__gallery" element={<ComponentGalleryView />} /> : null}
      </Routes>
    </KeyboardVisibilityProvider>
    </AnalyticsContributionConsentGate>
    </RequiredOnboardingGate>
    </AuthenticationGate>
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
