import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { TransactionsImportFileReaderPort } from '../../imports/application/transactionsImportFileReader.port';
import { MovementDockNavigationComponent, TransactionEntryComponent } from '../../transactions/index';
import { ExperimentalMovementDockNavigationComponent } from '../../transactions/application/ExperimentalMovementDockNavigationComponent';
import { MonthlyMovementsComponent } from '../../movements/index';
import { MovementsSearchPage } from '../../movements/index';
import type { MovementsSearchPagePort } from '../../movements/application/movementsSearch.port';
import { AccountPageView } from '../../account/ui/AccountPageView/AccountPageView';
import { TransactionsImportComponent } from '../../account/ui/capabilities/TransactionsImport/TransactionsImportComponent';
import { ApplicationBackupRestoreComponent } from '../../imports/application/ApplicationBackupRestoreComponent';
import type { ApplicationBackupPort, MovementsBackupPort } from '../../imports/application/imports.port';
import type { AccountPageViewRequired } from '../../account/ui/AccountPageView/accountPageView.contract';
import type { LoadPhase } from '../../account/application/accountPage.types';
import type { AccountWorkspacePort } from '../../account/application/accounts.port';
import type { AnalyticsPort } from '../../analytics/application/analytics.port';
import type { MovementReuseSuggestionsPort, MovementReuseTemplatePort } from '../../movements/application/movementReuseSuggestions.port';
import { ProfilePage } from './ProfilePage';
import { NetWorthSummaryComponent } from './NetWorthSummaryComponent';
import { CurrencyAccountsSheetComponent } from '../../account/application/CurrencyAccountsSheet/CurrencyAccountsSheetComponent';
import { ManageAccountSheetComponent } from '../../account/application/ManageAccountSheet/ManageAccountSheetComponent';
import { PendingExpectedOverviewComponent, type PendingExpectedOverviewPort } from './PendingExpectedOverviewComponent';
import { AnalyticsPageComponent } from '../../analytics/application/AnalyticsPageComponent';
import { AnalyticsForecastPageComponent } from '../../analytics/application/AnalyticsForecastPageComponent';
import { AnalyticsCategoryDetailComponent } from '../../analytics/application/AnalyticsCategoryDetailComponent';
import { parseAnalyticsContext, serializeAnalyticsContext } from '../../analytics/application/analyticsContext';
import { buildMovementSearchHref } from '../../movements/application/movementsSearchRoutePreset';
import { HomeRecentMovementsComponent, type HomeRecentMovementsPort } from './HomeRecentMovementsComponent';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader/WorkspacePageHeader';
import { useWorkspaceRefreshSignals } from './useWorkspaceRefreshSignals';
import { useWorkspaceImportCoordinator } from './useWorkspaceImportCoordinator';
import { useWorkspaceToast } from './useWorkspaceToast';
import { useMovementComposerCoordinator } from './useMovementComposerCoordinator';
import { resolveWorkspaceRoutePage } from './workspaceNavigation';
import { useWorkspaceAccountEvents } from './useWorkspaceAccountEvents';
import type { MovementVoiceEntryContext } from '../../transactions/application/MovementVoiceEntry/movementVoiceEntryContext';
import { useExperimentalFeaturesModel } from '../../experiments/application/useExperimentalFeaturesModel';
import type { ExperimentalFeaturesPort } from '../../experiments/application/experimentalFeatures.port';
import { FeedbackNoticePresenter } from '../../shared/ui/FeedbackNotice/FeedbackNoticePresenter';
import type { FeedbackNoticeWriter } from '../../shared/ui/FeedbackNotice/feedbackNotice.types';
import { FeedbackNoticeDestinationProvider } from '../../shared/ui/FeedbackNotice/FeedbackNoticeDestination';
import type { NotificationsPort } from '../../notifications/application/notifications.port';
import type { AmountVisibilityModel } from './useAmountVisibilityModel';

export type WorkspacePageRequired = {
  core: WorkspacePagePort;
  importFileReader: TransactionsImportFileReaderPort;
  voiceEntry: MovementVoiceEntryContext;
  experimentalFeatures: ExperimentalFeaturesPort;
  notifications: NotificationsPort;
  amountVisibility?: AmountVisibilityModel;
  writeText?: FeedbackNoticeWriter;
};

export type WorkspacePagePort = AccountWorkspacePort & MovementsBackupPort & ApplicationBackupPort & AnalyticsPort & HomeRecentMovementsPort & PendingExpectedOverviewPort & MovementsSearchPagePort & MovementReuseSuggestionsPort & MovementReuseTemplatePort;

type WorkspacePageProps = {
  required: WorkspacePageRequired;
};

type MovementEntryNavigationState = {
  returnTo: string;
};

function readMovementEntryReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('returnTo' in state)) {
    return null;
  }
  const returnTo = state.returnTo;
  return typeof returnTo === 'string' && returnTo.startsWith('/') && returnTo !== '/movements/new'
    ? returnTo
    : null;
}

export function WorkspacePage({ required: pageRequired }: WorkspacePageProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [screenLoadPhase, setScreenLoadPhase] = useState<LoadPhase>('loading');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [favoriteAccountId, setFavoriteAccountId] = useState<string | null>(null);
  const [accountsSheetCurrency, setAccountsSheetCurrency] = useState<string | null>(null);
  const [managedAccountId, setManagedAccountId] = useState<string | null>(null);
  const [accountsCount, setAccountsCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const workspaceToast = useWorkspaceToast();
  const { closeNotice, pauseNotice, resumeNotice, showError, showInfo, showNotice, showToast, showWarning, updateNotice } = workspaceToast.actions;
  const amountVisibility = pageRequired.amountVisibility;
  const experimentalFeatures = useExperimentalFeaturesModel({
    port: pageRequired.experimentalFeatures,
    events: {
      onError: showError,
    },
  });
  const workspaceRefresh = useWorkspaceRefreshSignals();
  const { refresh } = workspaceRefresh;
  const {
    accountHubRefreshSignal,
    analyticsRefreshSignal,
    expectedMovementsRefreshSignal,
    movementQuickActionRefreshSignal,
    netWorthRefreshSignal,
    recentTransactionsRefreshSignal,
  } = workspaceRefresh.signals;

  useEffect(() => {
    if (amountVisibility?.state.error) {
      showError({ message: amountVisibility.state.error });
    }
  }, [amountVisibility?.state.error, showError]);
  const importCoordinator = useWorkspaceImportCoordinator({
    core: pageRequired.core,
    movementsImport: pageRequired.core,
    applicationBackup: pageRequired.core,
    fileReader: pageRequired.importFileReader,
    refresh,
    showToast,
  });
  const { importSheetOpen, importSubmitPhase, restoreSheetOpen } = importCoordinator.state;
  const {
    closeImportSheet,
    closeRestoreSheet,
    openImportSheet,
    openRestoreSheet,
    requestApplicationBackup,
    requestApplicationBackupRestore,
    submitTransactionsImport,
  } = importCoordinator.actions;
  const movementComposer = useMovementComposerCoordinator({ selectedAccountId });
  const {
    movementAccountContext,
    movementEntryOpenSignal,
    movementEntryType,
    transactionEntryAccountId,
    transactionEntryPrefill,
  } = movementComposer.state;
  const {
    changeMovementComposerAccount,
    clearMovementEntryAccount,
    createMovementForAccount,
    createMovementForDraft,
    editExpectedMovement,
    postExpectedMovement,
    duplicateMovement,
    resetTransactionEntryPrefill,
  } = movementComposer.actions;
  const currentPage = resolveWorkspaceRoutePage(location.pathname);
  const [voiceWorkflowBusy, setVoiceWorkflowBusy] = useState(false);
  const {
    handleAccountDeleted,
    handleAccountMutated,
    handleProfileAccountMutated,
    handleSelectedAccountChanged,
  } = useWorkspaceAccountEvents({
    selectedAccountId,
    setAccountsCount,
    setSelectedAccountId,
    refresh,
  });
  const openNotifications = () => { void navigate('/notifications'); };

  useEffect(() => {
    let active = true;
    const refreshUnreadCount = () => {
      void pageRequired.notifications.notificationsCountUnread().then((count) => { if (active) setUnreadCount(count); }).catch(() => { if (active) setUnreadCount(null); });
    };
    refreshUnreadCount();
    let remove: (() => void) | undefined;
    void pageRequired.notifications.addChangeListener(refreshUnreadCount).then((cleanup) => { remove = cleanup; });
    return () => { active = false; remove?.(); };
  }, [pageRequired.notifications]);

  useEffect(() => {
    const preferencesGet = pageRequired.core.preferencesGet;
    if (typeof preferencesGet !== 'function') {
      return undefined;
    }
    let active = true;
    void preferencesGet.call(pageRequired.core).then((preferences) => {
      if (active) setFavoriteAccountId(preferences.defaultAccountId ?? null);
    });
    return () => { active = false; };
  }, [pageRequired.core]);

  function navigateToMovementEntry() {
    const state: MovementEntryNavigationState = {
      returnTo: `${location.pathname}${location.search}`,
    };
    void navigate('/movements/new', { state });
  }

  function handleCreateMovement(movement: Parameters<typeof createMovementForAccount>[0]) {
    createMovementForAccount(movement);
    navigateToMovementEntry();
  }

  function handleCreateMovementFromDraft(movement: Parameters<typeof createMovementForDraft>[0]) {
    createMovementForDraft(movement);
    navigateToMovementEntry();
  }

  function handleDuplicateMovement(movement: Parameters<typeof duplicateMovement>[0]) {
    duplicateMovement(movement);
    navigateToMovementEntry();
  }

  function handleEditExpectedMovement(...args: Parameters<typeof editExpectedMovement>) {
    editExpectedMovement(...args);
    navigateToMovementEntry();
  }

  function handlePostExpectedMovement(...args: Parameters<typeof postExpectedMovement>) {
    postExpectedMovement(...args);
    navigateToMovementEntry();
  }

  function closeMovementEntry() {
    clearMovementEntryAccount();
    const returnTo = readMovementEntryReturnTo(location.state);
    if (returnTo) {
      void navigate(returnTo);
      return;
    }
    void navigate('/movements');
  }

  useEffect(() => {
    if (currentPage === 'movementNew' && !transactionEntryAccountId) {
      void navigate('/movements');
    }
  }, [currentPage, navigate, screenLoadPhase, transactionEntryAccountId]);

  const transactionEntry = currentPage === 'movementNew' && transactionEntryAccountId
    ? (
        <TransactionEntryComponent
          required={{
            context: {
              accountId: transactionEntryAccountId,
              core: pageRequired.core,
            },
            config: {
              enabled: Boolean(transactionEntryAccountId),
              prefillRequest: transactionEntryPrefill,
              openSignal: movementEntryOpenSignal || (currentPage === 'movementNew' ? 1 : undefined),
              initialMode: movementEntryType,
              movementAccountContext,
              favoriteAccountId,
            },
          }}
          provided={{
            events: {
              onRecorded: () => {
                refresh('recentTransactions', 'accountSummary', 'netWorth', 'expectedMovements', 'analytics');
                resetTransactionEntryPrefill();
                clearMovementEntryAccount();
              },
              onClosed: closeMovementEntry,
              onAccountChanged: changeMovementComposerAccount,
              onOperationError: showError,
            },
          }}
        />
      )
    : null;

  const voiceMovementExperimentEnabled = experimentalFeatures.state.features.voiceMovementEntryEnabled;
  const voiceMovementExperimentActive = !experimentalFeatures.state.loading
    && voiceMovementExperimentEnabled
    && pageRequired.voiceEntry.enabled;
  const dockNavigation = voiceMovementExperimentActive
      ? (
          <ExperimentalMovementDockNavigationComponent
            required={{
              context: {
                core: pageRequired.core,
                voiceEntry: pageRequired.voiceEntry,
              },
              config: {
                enabled: voiceMovementExperimentActive,
                refreshSignal: movementQuickActionRefreshSignal,
              },
            }}
            provided={{
              events: {
                onCreateMovementRequested: handleCreateMovement,
                onMovementEntryDraftReady: ({ account, draft }) => {
                  handleCreateMovementFromDraft({ account, draft });
                },
                onNotice: (notice) => {
                  if (notice.tone === 'info') {
                    showInfo(notice.message, notice.action);
                    return;
                  }

                  if (notice.tone === 'warning') {
                    showWarning(notice.message, notice.action);
                    return;
                  }

                  if (notice.tone === 'error') {
                    showError({ message: notice.message });
                    return;
                  }

                  showToast(notice.message);
                },
                onError: (notice) => {
                  if (notice.tone === 'warning') {
                    showWarning(notice.message, notice.action);
                    return;
                  }

                  showError({ message: notice.message });
                },
                onBusyChanged: setVoiceWorkflowBusy,
              },
            }}
          />
        )
      : (
          <MovementDockNavigationComponent
            required={{
              context: {
                core: pageRequired.core,
              },
              config: {
                enabled: true,
                refreshSignal: movementQuickActionRefreshSignal,
              },
            }}
            provided={{
              events: {
                onCreateMovementRequested: handleCreateMovement,
                onError: (notice) => {
                  showError({ message: notice.message });
                },
              },
            }}
          />
        );

  const profilePage = currentPage === 'profile' ? (
    <ProfilePage
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          refreshSignal: accountHubRefreshSignal,
          voiceEntryAvailable: pageRequired.voiceEntry.enabled,
          voiceWorkflowBusy,
          voiceMovementExperimentEnabled,
          voiceMovementExperimentLoading: experimentalFeatures.state.loading,
          voiceMovementExperimentSaving: experimentalFeatures.state.saving,
        },
      }}
      provided={{
        events: {
          onLoadPhaseChanged: setScreenLoadPhase,
          onSelectedAccountChanged: handleSelectedAccountChanged,
          onAccountsCountChanged: setAccountsCount,
          onImportRequested: openRestoreSheet,
          onMovementsImportRequested: openImportSheet,
          onBackupRequested: () => {
            void requestApplicationBackup().catch((err) => {
              showError(err instanceof Error ? err : { message: 'Unknown error' });
            });
          },
          onAccountMutated: handleProfileAccountMutated,
          onError: showError,
          onSetVoiceMovementExperimentEnabled: (enabled) => {
            void experimentalFeatures.commands.setVoiceMovementEntryEnabled(enabled);
          },
        },
      }}
    />
  ) : null;

  const movementsPage = (
    <MonthlyMovementsComponent
      required={{
        context: {
          accountId: null,
          scope: 'all',
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: recentTransactionsRefreshSignal,
          amountVisibility: amountVisibility?.state.visibility,
        },
      }}
      provided={{
        events: {
          onVoided: () => {
            refresh('accountSummary', 'netWorth', 'recentTransactions', 'analytics');
          },
          onPostExpectedMovement: handlePostExpectedMovement,
          onEditExpectedMovement: handleEditExpectedMovement,
          onDuplicateMovement: handleDuplicateMovement,
          onNotice: showNotice,
          onNoticeUpdated: updateNotice,
          onNoticeClosed: closeNotice,
        },
      }}
    />
  );

  const movementsSearchPage = currentPage === 'movementsSearch' ? (
    <MovementsSearchPage
      required={{
        core: pageRequired.core,
        refreshSignal: recentTransactionsRefreshSignal,
        amountVisibility: amountVisibility?.state.visibility,
      }}
      provided={{
        events: {
          onPostExpectedMovement: handlePostExpectedMovement,
          onEditExpectedMovement: handleEditExpectedMovement,
          onDuplicateMovement: handleDuplicateMovement,
          onOperationError: showError,
        },
      }}
    />
  ) : null;

  const analyticsContext = parseAnalyticsContext(location.search);
  const analyticsPage = (
    <AnalyticsPageComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: analyticsRefreshSignal,
          amountVisibility: amountVisibility?.state.visibility,
          initialFilters: analyticsContext,
        },
      }}
      provided={{
        events: {
          onError: showError,
          onCategorySelected: (selectedCategoryId) => {
            const suffix = serializeAnalyticsContext(analyticsContext);
            void navigate(`/analytics/category/${encodeURIComponent(selectedCategoryId)}${suffix ? `?${suffix}` : ''}`);
          },
          onMerchantSelected: (merchant) => {
            const href = buildMovementSearchHref({ source: 'posted', type: 'expense', merchant });
            void navigate(withAnalyticsContext(href, analyticsContext));
          },
          onHighlightSelected: (item) => {
            const type = item.tone === 'income' ? 'income' : 'expense';
            const href = buildMovementSearchHref({ source: 'posted', type });
            void navigate(withAnalyticsContext(href, analyticsContext));
          },
          onForecastSelected: () => {
            const suffix = serializeAnalyticsContext(analyticsContext);
            void navigate(`/analytics/forecast${suffix ? `?${suffix}` : ''}`);
          },
        },
      }}
    />
  );

  const analyticsCurrency = analyticsContext.currency;
  const categoryId = location.pathname.startsWith('/analytics/category/')
    ? decodeURIComponent(location.pathname.slice('/analytics/category/'.length))
    : '';
  const analyticsSecondaryPage = currentPage === 'analyticsForecast'
    ? <AnalyticsForecastPageComponent core={pageRequired.core} currency={analyticsCurrency} filters={analyticsContext} refreshSignal={analyticsRefreshSignal} amountVisibility={amountVisibility?.state.visibility} onError={showError} />
    : currentPage === 'analyticsCategory'
      ? <AnalyticsCategoryDetailComponent core={pageRequired.core} categoryId={categoryId} currency={analyticsCurrency} filters={analyticsContext} refreshSignal={analyticsRefreshSignal} amountVisibility={amountVisibility?.state.visibility} onError={showError} />
      : null;

  const pageHeader = currentPage === 'home'
    ? (
        <WorkspacePageHeader
          required={{
            title: 'Gonezo',
            variant: 'product',
            unreadCount,
            amountVisibility: amountVisibility && {
              visibility: amountVisibility.state.visibility,
              loading: amountVisibility.state.loading,
              saving: amountVisibility.state.saving,
            },
          }}
          provided={{
            commands: {
              toggleAmountVisibility: () => { void amountVisibility?.commands.toggleAmountVisibility(); },
              openNotifications,
            },
          }}
        />
      )
    : currentPage === 'analytics' || currentPage === 'analyticsForecast' || currentPage === 'analyticsCategory'
      ? (
          <WorkspacePageHeader
            required={{
            title: currentPage === 'analyticsForecast' ? 'Forecast' : currentPage === 'analyticsCategory' ? 'Category detail' : 'Analytics',
            unreadCount,
            amountVisibility: amountVisibility && {
              visibility: amountVisibility.state.visibility,
              loading: amountVisibility.state.loading,
              saving: amountVisibility.state.saving,
            },
            searchAction: currentPage === 'analytics' ? (
              <Link className="gz-icon-button" to="/movements/search" aria-label="Search movements">
                <i className="bi bi-search" aria-hidden />
              </Link>
            ) : (
              <Link className="gz-icon-button" to={`/analytics${serializeAnalyticsContext(analyticsContext) ? `?${serializeAnalyticsContext(analyticsContext)}` : ''}`} aria-label="Back to Analytics">
                <i className="bi bi-arrow-left" aria-hidden />
              </Link>
            ),
            }}
            provided={{
              commands: {
                toggleAmountVisibility: () => { void amountVisibility?.commands.toggleAmountVisibility(); },
                openNotifications,
              },
            }}
          />
        )
      : currentPage === 'movements'
        ? (
            <WorkspacePageHeader
              required={{
                title: 'Movements',
                unreadCount,
                amountVisibility: amountVisibility && {
                  visibility: amountVisibility.state.visibility,
                  loading: amountVisibility.state.loading,
                  saving: amountVisibility.state.saving,
                },
                searchAction: (
                  <Link className="gz-icon-button" to="/movements/search" aria-label="Search movements">
                    <i className="bi bi-search" aria-hidden />
                  </Link>
                ),
              }}
              provided={{
                commands: {
                  toggleAmountVisibility: () => { void amountVisibility?.commands.toggleAmountVisibility(); },
                  openNotifications,
                },
              }}
            />
          )
          : currentPage === 'profile'
          ? (
              <WorkspacePageHeader
                required={{
                title: 'Profile',
                unreadCount,
                amountVisibility: amountVisibility && {
                  visibility: amountVisibility.state.visibility,
                  loading: amountVisibility.state.loading,
                  saving: amountVisibility.state.saving,
                },
                }}
                provided={{
                  commands: {
                    toggleAmountVisibility: () => { void amountVisibility?.commands.toggleAmountVisibility(); },
                    openNotifications,
                  },
                }}
              />
            )
          : null;

  const netWorthSummary = currentPage === 'home' ? (
    <NetWorthSummaryComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: netWorthRefreshSignal,
          amountVisibility: amountVisibility?.state.visibility,
        },
      }}
      provided={{
        events: {
          onError: showError,
          onViewAccountsRequested: (currency) => {
            setAccountsSheetCurrency(currency);
          },
        },
      }}
    />
  ) : null;

  const currencyAccountsSheet = currentPage === 'home' ? (
    <CurrencyAccountsSheetComponent
      required={{
        context: { core: pageRequired.core },
        config: {
          open: accountsSheetCurrency !== null,
          currency: accountsSheetCurrency,
          refreshSignal: netWorthRefreshSignal,
          amountVisibility: amountVisibility?.state.visibility,
        },
      }}
      provided={{
        events: {
          onClose: () => setAccountsSheetCurrency(null),
          onAccountSelected: (accountId) => {
            setSelectedAccountId(accountId);
            setAccountsSheetCurrency(null);
          },
          onManageAccountRequested: (accountId) => {
            setAccountsSheetCurrency(null);
            setManagedAccountId(accountId);
          },
          onError: showError,
        },
      }}
    />
  ) : null;

  const manageAccountSheet = currentPage === 'home' ? (
    <ManageAccountSheetComponent
      required={{
        context: { core: pageRequired.core, accountId: managedAccountId },
        config: { open: managedAccountId !== null, refreshSignal: accountHubRefreshSignal },
      }}
      provided={{
        events: {
          onClose: () => setManagedAccountId(null),
          onAccountMutated: () => {
            setManagedAccountId(null);
            handleAccountMutated();
          },
          onAccountDeleted: () => {
            setManagedAccountId(null);
            if (managedAccountId) handleAccountDeleted(managedAccountId);
          },
          onError: showError,
        },
      }}
    />
  ) : null;

  const homeExpectedMovements = currentPage === 'home' ? (
    <PendingExpectedOverviewComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: expectedMovementsRefreshSignal,
          amountVisibility: amountVisibility?.state.visibility,
        },
      }}
      provided={{
        events: {
          onError: showError,
          onExpenseSelected: () => { void navigate('/movements/search?source=expected&type=expense'); },
          onIncomeSelected: () => { void navigate('/movements/search?source=expected&type=income'); },
        },
      }}
    />
  ) : null;

  const homeRecentMovements = currentPage === 'home' ? (
    <HomeRecentMovementsComponent
      required={{
        context: {
          core: pageRequired.core,
        },
        config: {
          enabled: true,
          refreshSignal: recentTransactionsRefreshSignal,
          amountVisibility: amountVisibility?.state.visibility,
        },
      }}
      provided={{
        events: {
          onSeeAll: () => {
            void navigate('/movements');
          },
          onError: showError,
        },
      }}
    />
  ) : null;

  const required: AccountPageViewRequired = {
    screen: {
      loadPhase: screenLoadPhase,
      error: '',
    },
    sections: {
      pageHeader,
      netWorthSummary,
      accountHub: null,
      accountSummary: currentPage === 'home'
          ? (
            <>
              {currencyAccountsSheet}
              {manageAccountSheet}
              {homeExpectedMovements}
              {homeRecentMovements}
            </>
          )
          : currentPage === 'analytics'
            ? analyticsPage
            : currentPage === 'analyticsForecast' || currentPage === 'analyticsCategory'
              ? analyticsSecondaryPage
            : currentPage === 'movementsSearch'
              ? movementsSearchPage
            : currentPage === 'profile'
            ? profilePage
            : null,
      transactionEntry: (
        <>
          {transactionEntry}
          {currentPage === 'movementsSearch' || currentPage === 'movementNew' ? null : dockNavigation}
        </>
      ),
      recentTransactions: currentPage === 'movements' ? movementsPage : null,
      transactionsImport: (
        <>
          <TransactionsImportComponent
            required={{
              context: { fileReader: pageRequired.importFileReader },
              state: { accountsCount, isOpen: importSheetOpen },
              status: { loadPhase: screenLoadPhase, submitPhase: importSubmitPhase },
            }}
            provided={{
              commands: { open: openImportSheet, close: closeImportSheet, submit: submitTransactionsImport },
              events: { onImportFailed: (message) => showError({ message }) },
            }}
          />
          <ApplicationBackupRestoreComponent
            required={{ isOpen: restoreSheetOpen }}
            provided={{ close: closeRestoreSheet, restore: requestApplicationBackupRestore, onError: showError }}
          />
        </>
      ),
    },
  };

  return (
    <FeedbackNoticeDestinationProvider>
      <AccountPageView required={required} provided={{}} />
      <FeedbackNoticePresenter
        notices={workspaceToast.notices}
        closeNotice={closeNotice}
        pauseNotice={pauseNotice}
        resumeNotice={resumeNotice}
        writeText={pageRequired.writeText}
      />
    </FeedbackNoticeDestinationProvider>
  );
}

function withAnalyticsContext(href: string, context: ReturnType<typeof parseAnalyticsContext>): string {
  const serialized = serializeAnalyticsContext(context);
  return serialized ? `${href}&${serialized}` : href;
}
