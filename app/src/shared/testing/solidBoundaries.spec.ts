import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, '..', '..');
const appDir = resolve(srcDir, '..');

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      return listSourceFiles(fullPath);
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : [];
  });
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/');
}

describe('SOLID frontend boundaries', () => {
  it('keeps domain modules independent from application, UI, infrastructure, and React', () => {
    const violations: string[] = [];
    const forbiddenLayerImportPattern = /from\s+['"][^'"]*\/(?:application|ui|infrastructure)(?:\/[^'"]*)?['"]/;
    const reactImportPattern = /from\s+['"]react['"]/;

    for (const file of listSourceFiles(srcDir)) {
      const normalized = normalizePath(file);
      if (!normalized.includes('/domain/')) {
        continue;
      }

      const source = readFileSync(file, 'utf8');
      if (forbiddenLayerImportPattern.test(source)) {
        violations.push(`${normalized}: domain imports an outer layer`);
      }
      if (reactImportPattern.test(source)) {
        violations.push(`${normalized}: domain imports React`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps feature UI modules from importing another feature UI layer', () => {
    const violations: string[] = [];
    const crossFeatureUiImportPattern = /from\s+['"](?:\.\.\/)+([^/'"]+)\/ui(?:\/[^'"]*)?['"]/g;

    for (const file of listSourceFiles(srcDir)) {
      const normalized = normalizePath(file);
      const matchContext = normalized.match(/\/src\/([^/]+)\/ui\//);
      if (!matchContext) {
        continue;
      }

      const currentContext = matchContext[1];
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(crossFeatureUiImportPattern)) {
        const importedContext = match[1];
        if (importedContext !== currentContext && importedContext !== 'shared') {
          violations.push(`${normalized}: imports ${importedContext}/ui`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps multi-file component clusters colocated in component folders', () => {
    const expectedClusterFiles = [
      'account/application/AccountHub/AccountHubComponent.tsx',
      'account/application/AccountHub/AccountHubComponent.contract.ts',
      'account/application/AccountHub/useAccountHubModel.ts',
      'account/application/AccountHub/useAccountHubModel.spec.tsx',
      'account/application/AccountSummary/AccountSummaryComponent.tsx',
      'account/application/AccountSummary/AccountSummaryComponent.contract.ts',
      'account/application/AccountSummary/useAccountSummaryModel.ts',
      'account/application/AccountSummary/useAccountSummaryModel.spec.tsx',
      'movements/ui/MonthlyMovements/MonthlyMovementsView.tsx',
      'movements/ui/MonthlyMovements/MonthlyMovementsView.contract.ts',
      'movements/ui/MonthlyMovements/monthlyMovementPresentation.tsx',
      'movements/ui/MovementsSearch/MovementsSearchResults.tsx',
      'movements/ui/MovementsSearch/MovementsSearchFilters.tsx',
      'transactions/ui/TransactionComposer/TransactionComposerView.tsx',
      'transactions/ui/TransactionComposer/TransactionEntryView.tsx',
      'transactions/ui/TransactionComposer/TransactionEntryView.contract.ts',
      'transactions/ui/ItemBreakdownEditor/ItemBreakdownEditorView.tsx',
      'transactions/ui/ItemBreakdownEditor/ItemBreakdownEditorView.spec.tsx',
    ];

    for (const relativePath of expectedClusterFiles) {
      expect(readFileSync(resolve(srcDir, relativePath), 'utf8')).toBeTruthy();
    }
  });

  it('keeps item breakdown component styles out of the global app stylesheet', () => {
    const appCss = readFileSync(resolve(srcDir, 'App.css'), 'utf8');
    const forbiddenItemBreakdownSelector = /\.(?:item-breakdown-|composer-items-|composer-expense-items)/;

    expect(appCss).not.toMatch(forbiddenItemBreakdownSelector);
    expect(readFileSync(resolve(srcDir, 'shared/ui/SplitManager/SplitManager.module.css'), 'utf8')).toBeTruthy();
    expect(readFileSync(resolve(srcDir, 'transactions/ui/ItemBreakdownEditor/ItemBreakdownEditorView.module.css'), 'utf8')).toBeTruthy();
  });

  it('keeps shared visual foundations out of the feature stylesheet', () => {
    const appCss = readFileSync(resolve(srcDir, 'App.css'), 'utf8');
    const forbiddenSharedSelector =
      /^\.(?:sheet-(?:backdrop|panel)|card|nested-card|stack|chip-row|chip|segmented(?:-2)?|segment|quick-row|inline-header|text-button|icon-button|inline-checkbox|item-editor|visually-hidden|hint|field-error|primary-cta)(?:[.{,: ])/m;

    expect(appCss).not.toMatch(forbiddenSharedSelector);
    expect(readFileSync(resolve(srcDir, 'shared/ui/SheetView.module.css'), 'utf8')).toBeTruthy();
    expect(readFileSync(resolve(srcDir, 'shared/ui/primitives.css'), 'utf8')).toBeTruthy();
  });

  it('keeps the app stylesheet limited to the root screen shell', () => {
    const appCss = readFileSync(resolve(srcDir, 'App.css'), 'utf8');
    const selectors = [...appCss.matchAll(/\.([a-z][a-z0-9-]*)/g)].map((match) => match[1]);

    expect([...new Set(selectors)]).toEqual(['app-screen']);
  });

  it('keeps chart vendor imports behind the shared chart adapter', () => {
    const violations: string[] = [];

    for (const file of listSourceFiles(srcDir)) {
      const normalized = normalizePath(file);
      if (normalized.endsWith('/src/shared/testing/solidBoundaries.spec.ts')) {
        continue;
      }
      const source = readFileSync(file, 'utf8');
      if (!source.includes("from 'recharts'") && !source.includes('from "recharts"')) {
        continue;
      }
      if (!normalized.includes('/src/shared/ui/Chart/')) {
        violations.push(`${normalized}: imports recharts outside shared chart adapter`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps the shared core port composed from focused capability ports', () => {
    const corePort = readFileSync(resolve(srcDir, 'core/application/corePort.ts'), 'utf8');
    const ledgerPort = readFileSync(resolve(srcDir, 'ledger/application/ledger.port.ts'), 'utf8');
    const taxonomyPort = readFileSync(resolve(srcDir, 'taxonomy/application/taxonomy.port.ts'), 'utf8');
    const schedulingPort = readFileSync(resolve(srcDir, 'scheduling/application/scheduling.port.ts'), 'utf8');
    const expectedPort = readFileSync(resolve(srcDir, 'expected/application/expected.port.ts'), 'utf8');
    const movementsPort = readFileSync(resolve(srcDir, 'movements/application/movements.port.ts'), 'utf8');
    const analyticsPort = readFileSync(resolve(srcDir, 'analytics/application/analytics.port.ts'), 'utf8');
    const sharingPort = readFileSync(resolve(srcDir, 'sharing/application/sharing.port.ts'), 'utf8');

    expect(corePort).toContain("from '../../analytics/application/analytics.port'");
    expect(corePort).toContain("from '../../account/application/preferences.port'");
    expect(corePort).toContain("from '../../ledger/application/ledger.port'");
    expect(corePort).toContain("from '../../taxonomy/application/taxonomy.port'");
    expect(corePort).toContain("from '../../imports/application/imports.port'");
    expect(corePort).toContain("from '../../scheduling/application/scheduling.port'");
    expect(corePort).toContain("from '../../expected/application/expected.port'");
    expect(corePort).toContain("from '../../movements/application/movements.port'");
    expect(corePort).toContain("from '../../sharing/application/sharing.port'");
    expect(corePort).toMatch(/export interface CorePort\s+extends\s+PreferencesPort,/);
    expect(corePort).toMatch(/MovementsQueryPort,\s+AnalyticsPort,\s+SharingPort \{\}/);
    expect(ledgerPort).toContain('LedgerPort');
    expect(taxonomyPort).toContain('TaxonomyPort');
    expect(schedulingPort).toContain('SchedulingPort');
    expect(expectedPort).toContain('ExpectedPort');
    expect(movementsPort).toContain('MovementsQueryPort');
    expect(analyticsPort).toContain('AnalyticsPort');
    expect(sharingPort).toContain('SharingPort');
  });

  it('keeps gateway adapters and browser effects out of application hooks and ports', () => {
    const violations: string[] = [];
    const gatewayImportPattern = /from\s+['"][^'"]*\/infrastructure\/[^'"]*Gateway['"]/;
    const createGatewayPattern = /create[A-Z]\w*Gateway/;
    const forbiddenBrowserEffects = [
      'window.confirm',
      'window.setTimeout',
      'window.clearTimeout',
      'globalThis.setTimeout',
      'globalThis.clearTimeout',
    ];

    for (const file of listSourceFiles(srcDir)) {
      const normalized = normalizePath(file);
      const source = readFileSync(file, 'utf8');
      const isApplicationFile = normalized.includes('/application/');
      const isBoundaryComponent = normalized.endsWith('Component.tsx');
      const isApplicationHook = /\/application\/use[A-Z][^/]*\.(ts|tsx)$/.test(normalized);

      if (isApplicationFile && !isBoundaryComponent && gatewayImportPattern.test(source)) {
        violations.push(`${normalized}: imports a gateway adapter/port from infrastructure`);
      }

      if (isApplicationHook && createGatewayPattern.test(source)) {
        violations.push(`${normalized}: creates gateway adapters inside a hook`);
      }

      if (isApplicationHook) {
        for (const effect of forbiddenBrowserEffects) {
          if (source.includes(effect)) {
            violations.push(`${normalized}: uses ${effect} directly`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps bounded-context infrastructure from depending on another context infrastructure', () => {
    const violations: string[] = [];
    const contexts = new Set(['account', 'expected', 'imports', 'ledger', 'movements', 'scheduling', 'taxonomy']);
    const crossContextInfrastructureImportPattern =
      /from\s+['"](?:\.\.\/)+(account|expected|imports|ledger|movements|scheduling|taxonomy)\/infrastructure(?:\/[^'"]*)?['"]/g;

    for (const file of listSourceFiles(srcDir)) {
      const normalized = normalizePath(file);
      if (normalized.endsWith('.spec.ts') || normalized.endsWith('.spec.tsx')) {
        continue;
      }
      const matchContext = normalized.match(/\/src\/([^/]+)\/infrastructure\//);
      if (!matchContext || !contexts.has(matchContext[1])) {
        continue;
      }

      const currentContext = matchContext[1];
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(crossContextInfrastructureImportPattern)) {
        const importedContext = match[1];
        if (importedContext !== currentContext) {
          violations.push(`${normalized}: imports ${importedContext}/infrastructure`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps native Capacitor plugin responsibilities in focused collaborators', () => {
    const androidPluginDir = resolve(appDir, 'android/app/src/main/java/com/gonezo/multiplatform/plugins');
    const corePlugin = readFileSync(join(androidPluginDir, 'CorePlugin.java'), 'utf8');
    const mobillsImport = readFileSync(join(androidPluginDir, 'MobillsImportHandler.java'), 'utf8');
    const backup = readFileSync(join(androidPluginDir, 'MovementsBackupHandler.java'), 'utf8');
    const preferences = readFileSync(join(androidPluginDir, 'PreferencesPluginHandler.java'), 'utf8');
    const ledger = readFileSync(join(androidPluginDir, 'LedgerPluginHandler.java'), 'utf8');
    const ledgerTransactions = readFileSync(join(androidPluginDir, 'LedgerTransactionsQueryHandler.java'), 'utf8');
    const taxonomy = readFileSync(join(androidPluginDir, 'TaxonomyPluginHandler.java'), 'utf8');
    const recurrence = readFileSync(join(androidPluginDir, 'RecurringPluginHandler.java'), 'utf8');
    const expected = readFileSync(join(androidPluginDir, 'ExpectedPluginHandler.java'), 'utf8');
    const tagging = readFileSync(join(androidPluginDir, 'TransactionTaggingBridge.java'), 'utf8');

    expect(corePlugin).toContain('new MobillsImportHandler(getContext()).importBase64');
    expect(corePlugin).toContain('new MovementsBackupHandler(getContext()).exportBackup');
    expect(corePlugin).toContain('new PreferencesPluginHandler(getContext()).preferencesGet');
    expect(corePlugin).toContain('new LedgerPluginHandler(getContext()).ledgerListTransactions');
    expect(corePlugin).toContain('new TaxonomyPluginHandler(getContext()).orchestrationListTransactionTaxonomy');
    expect(corePlugin).toContain('new RecurringPluginHandler(getContext()).recurrenceListRecurringMovements');
    expect(corePlugin).toContain('new ExpectedPluginHandler(getContext()).expectedListMovements');
    expect(corePlugin).not.toMatch(/Android(?:Ledger|Taxonomy|Recurring|Expected|Preferences|MovementsBackup)Core/);
    expect(corePlugin).not.toContain('Base64.getDecoder');
    expect(corePlugin).not.toContain('private JSObject importMobillsText');
    expect(corePlugin).not.toContain('private String writeBackupFile');
    expect(corePlugin).not.toContain('MediaStore');
    expect(corePlugin.split('\n').length).toBeLessThanOrEqual(260);

    expect(mobillsImport).toContain('final class MobillsImportHandler');
    expect(backup).toContain('final class MovementsBackupHandler');
    expect(backup).toContain('JSObject importBase64');
    expect(preferences).toContain('final class PreferencesPluginHandler');
    expect(ledger).toContain('final class LedgerPluginHandler');
    expect(ledger).toContain('new LedgerTransactionsQueryHandler(context).ledgerListTransactions(call)');
    expect(ledger).not.toContain('private JSObject toTransactionJson');
    expect(ledger).not.toContain('AndroidTaxonomyCore');
    expect(ledgerTransactions).toContain('final class LedgerTransactionsQueryHandler');
    expect(ledgerTransactions).toContain('private JSObject toTransactionJson');
    expect(taxonomy).toContain('final class TaxonomyPluginHandler');
    expect(taxonomy).toContain('TransactionTaggingBridge.applyTagsToTransaction');
    expect(recurrence).toContain('final class RecurringPluginHandler');
    expect(recurrence).toContain('private JSObject toRecurringMovementJson');
    expect(expected).toContain('final class ExpectedPluginHandler');
    expect(expected).toContain('private JSObject toExpectedMovementJson');
    expect(tagging).toContain('final class TransactionTaggingBridge');
  });

  it('keeps Android Capacitor commands explicit from the app package', () => {
    const packageJson = JSON.parse(readFileSync(resolve(appDir, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['android:sync']).toBe('npm run build && cap sync android');
    expect(packageJson.scripts['android:open']).toBe('cap open android');
    expect(readFileSync(resolve(appDir, 'android/settings.gradle'), 'utf8')).toContain(':app');
  });

  it('keeps native movement composition out of the platform adapter shell', () => {
    const coreAdapter = readFileSync(resolve(srcDir, 'core/infrastructure/coreAdapter.ts'), 'utf8');
    const nativeMovements = readFileSync(resolve(srcDir, 'movements/infrastructure/nativeMovements.ts'), 'utf8');

    expect(coreAdapter).toContain('getNativeMovementsMonthOverview(this, input)');
    expect(coreAdapter).toContain('searchNativeMovements(this, input)');
    expect(coreAdapter).toContain('listNativeScheduledMovements(this, input)');
    expect(coreAdapter).not.toContain('function filterScheduledMovementItems');
    expect(coreAdapter).not.toContain('function mapPostedTransactionToSearchItem');
    expect(coreAdapter).toContain("from '../../analytics/infrastructure/analyticsQueries'");
    expect(coreAdapter).not.toContain('function buildSpendingOverview');
    expect(coreAdapter.split('\n').length).toBeLessThanOrEqual(630);

    expect(nativeMovements).toContain('function filterScheduledMovementItems');
    expect(nativeMovements).toContain('function mapPostedTransactionToSearchItem');
  });

  it('keeps Mobills parsing out of the in-memory web adapter orchestration', () => {
    const coreAdapterWeb = readFileSync(resolve(srcDir, 'core/infrastructure/coreAdapterWeb.ts'), 'utf8');
    const workflow = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsImportWorkflow.ts'), 'utf8');
    const rows = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsImportRows.ts'), 'utf8');
    const rowImporter = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsRowImporter.ts'), 'utf8');
    const duplicateTracker = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsDuplicateTracker.ts'), 'utf8');
    const policy = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsImportPolicy.ts'), 'utf8');
    const parser = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsImportParser.ts'), 'utf8');

    expect(coreAdapterWeb).toContain("from '../../imports/infrastructure/providers/mobills/webMobillsImportWorkflow'");
    expect(coreAdapterWeb).not.toContain("from './webMobillsImportParser'");
    expect(coreAdapterWeb).not.toContain('decodeMobillsImportBase64');
    expect(coreAdapterWeb).not.toContain('splitDelimitedLine');
    expect(coreAdapterWeb).not.toContain('parseMobillsTransferDescriptor');
    expect(coreAdapterWeb).not.toContain('private decodeBase64ToText');
    expect(coreAdapterWeb).not.toContain('private detectDelimiter');
    expect(coreAdapterWeb).not.toContain('private splitDelimited');
    expect(coreAdapterWeb).not.toContain('private parseMobillsDate');
    expect(coreAdapterWeb).not.toContain('private parseTransferDescriptor');
    expect(coreAdapterWeb).not.toContain('for (let index = 1; index < lines.length');

    expect(workflow).toContain("from './webMobillsImportRows'");
    expect(workflow).toContain("from './webMobillsImportPolicy'");
    expect(workflow).toContain("from './webMobillsDuplicateTracker'");
    expect(workflow).toContain("from './webMobillsRowImporter'");
    expect(workflow).not.toContain("from './webMobillsImportParser'");
    expect(workflow).not.toContain('splitDelimitedLine');
    expect(workflow).not.toContain('parseMobillsTransferDescriptor');
    expect(workflow).not.toContain('recordTransfer({');
    expect(workflow).not.toContain('categorizeTransaction({');
    expect(workflow).toContain('export class WebMobillsImportWorkflow');
    expect(rows).toContain("from './webMobillsImportParser'");
    expect(rows).toContain('export function readWebMobillsImportRows');
    expect(rowImporter).toContain('export class WebMobillsRowImporter');
    expect(duplicateTracker).toContain('export class WebMobillsDuplicateTracker');
    expect(policy).toContain('export function normalizeWebMobillsImportPolicy');
    expect(parser).toContain('export function decodeMobillsImportBase64');
    expect(parser).toContain('export function splitDelimitedLine');
    expect(parser).toContain('export function parseMobillsTransferDescriptor');
  });

  it('keeps web recurrence and movement query rules out of the in-memory adapter shell', () => {
    const coreAdapterWeb = readFileSync(resolve(srcDir, 'core/infrastructure/coreAdapterWeb.ts'), 'utf8');
    const recurrence = readFileSync(resolve(srcDir, 'scheduling/infrastructure/webRecurrence.ts'), 'utf8');
    const expectedFilters = readFileSync(resolve(srcDir, 'expected/application/expectedMovementFilters.ts'), 'utf8');
    const scheduledFilters = readFileSync(resolve(srcDir, 'scheduling/application/scheduledMovementFilters.ts'), 'utf8');
    const movementQueries = readFileSync(resolve(srcDir, 'movements/infrastructure/webMovementQueries.ts'), 'utf8');
    const ledgerQueries = readFileSync(resolve(srcDir, 'ledger/infrastructure/webLedgerQueries.ts'), 'utf8');
    const ledgerService = readFileSync(resolve(srcDir, 'ledger/infrastructure/webLedgerService.ts'), 'utf8');
    const ledgerAccountService = readFileSync(resolve(srcDir, 'ledger/infrastructure/webLedgerAccountService.ts'), 'utf8');
    const ledgerTransactionService = readFileSync(resolve(srcDir, 'ledger/infrastructure/webLedgerTransactionService.ts'), 'utf8');
    const ledgerTransferService = readFileSync(resolve(srcDir, 'ledger/infrastructure/webLedgerTransferService.ts'), 'utf8');
    const ledgerGuards = readFileSync(resolve(srcDir, 'ledger/infrastructure/webLedgerGuards.ts'), 'utf8');
    const schedulingService = readFileSync(resolve(srcDir, 'scheduling/infrastructure/webSchedulingService.ts'), 'utf8');
    const movementsService = readFileSync(resolve(srcDir, 'movements/infrastructure/webMovementsService.ts'), 'utf8');
    const movementsOverviewService = readFileSync(resolve(srcDir, 'movements/infrastructure/webMovementsOverviewService.ts'), 'utf8');
    const movementsSearchService = readFileSync(resolve(srcDir, 'movements/infrastructure/webMovementsSearchService.ts'), 'utf8');
    const movementsFacetsService = readFileSync(resolve(srcDir, 'movements/infrastructure/webMovementsFacetsService.ts'), 'utf8');
    const scheduledListService = readFileSync(resolve(srcDir, 'movements/infrastructure/webScheduledMovementsListService.ts'), 'utf8');
    const pagination = readFileSync(resolve(srcDir, 'movements/infrastructure/webPagination.ts'), 'utf8');

    expect(coreAdapterWeb).toContain("from '../../ledger/infrastructure/webLedgerService'");
    expect(coreAdapterWeb).toContain("from '../../scheduling/infrastructure/webSchedulingService'");
    expect(coreAdapterWeb).toContain("from '../../movements/infrastructure/webMovementsService'");
    expect(coreAdapterWeb).not.toContain("from './webRecurrence'");
    expect(coreAdapterWeb).not.toContain("from './webMovementQueries'");
    expect(coreAdapterWeb).not.toContain("from './webLedgerQueries'");
    expect(coreAdapterWeb).not.toContain('private normalizeRecurrenceRule');
    expect(coreAdapterWeb).not.toContain('private firstDueAtForRule');
    expect(coreAdapterWeb).not.toContain('private filterScheduledMovements');
    expect(coreAdapterWeb).not.toContain('private filterExpectedMovements');
    expect(coreAdapterWeb).not.toContain('private mapExpectedMovementToSearchItem');
    expect(coreAdapterWeb).not.toContain('filterExpectedMovements');
    expect(coreAdapterWeb).not.toContain('filterScheduledMovements');
    expect(coreAdapterWeb).not.toContain('normalizeWebRecurrenceRule');
    expect(coreAdapterWeb).not.toContain('listWebLedgerTransactions');
    expect(coreAdapterWeb).not.toContain('const fromDateEpoch = filters.fromDate');
    expect(coreAdapterWeb).not.toContain('const statusesFilter = filters.statuses');
    expect(coreAdapterWeb).toContain("from '../../analytics/infrastructure/analyticsQueries'");
    expect(coreAdapterWeb).not.toContain('function buildSpendingOverview');
    expect(coreAdapterWeb.split('\n').length).toBeLessThanOrEqual(515);

    expect(recurrence).toContain('export function normalizeWebRecurrenceRule');
    expect(recurrence).toContain('export function firstDueAtForWebRecurrence');
    expect(expectedFilters).toContain('export function filterExpectedMovements');
    expect(scheduledFilters).toContain('export function filterScheduledMovements');
    expect(movementQueries).not.toContain('export function filterScheduledMovements');
    expect(movementQueries).not.toContain('export function filterExpectedMovements');
    expect(movementQueries).toContain('export function mapScheduledMovementToSearchItem');
    expect(ledgerQueries).toContain('export function listWebLedgerTransactions');
    expect(ledgerService).toContain("from './webLedgerAccountService'");
    expect(ledgerService).toContain("from './webLedgerTransactionService'");
    expect(ledgerService).toContain("from './webLedgerTransferService'");
    expect(ledgerService).not.toContain("from './webLedgerQueries'");
    expect(ledgerService).not.toContain('private netForAccount');
    expect(ledgerService).not.toContain('const resolvedExchangeRate');
    expect(ledgerService).not.toContain('Same-currency transfer must keep equal source and destination amounts');
    expect(ledgerService.split('\n').length).toBeLessThanOrEqual(180);
    expect(ledgerAccountService).toContain('export class WebLedgerAccountService');
    expect(ledgerAccountService).toContain('calculateWebAccountNet');
    expect(ledgerTransactionService).toContain('export class WebLedgerTransactionService');
    expect(ledgerTransactionService).toContain("from './webLedgerQueries'");
    expect(ledgerTransferService).toContain('export class WebLedgerTransferService');
    expect(ledgerTransferService).toContain('const resolvedExchangeRate');
    expect(ledgerGuards).toContain('export function getWebLedgerAccountOrThrow');
    expect(ledgerGuards).toContain('export function ensureWebAccountCanPost');
    expect(schedulingService).toContain("from './webRecurrence'");
    expect(schedulingService).not.toContain('listScheduledPage');
    expect(movementsService).toContain("from './webMovementsOverviewService'");
    expect(movementsService).toContain("from './webMovementsSearchService'");
    expect(movementsService).toContain("from './webMovementsFacetsService'");
    expect(movementsService).toContain("from './webScheduledMovementsListService'");
    expect(movementsService).not.toContain("from './webMovementQueries'");
    expect(movementsService).not.toContain('while (hasMorePosted)');
    expect(movementsService).not.toContain('mapPostedTransactionToSearchItem');
    expect(movementsService).not.toContain('Math.ceil(totalElements /');
    expect(movementsService.split('\n').length).toBeLessThanOrEqual(120);
    expect(movementsOverviewService).toContain('export class WebMovementsOverviewService');
    expect(movementsOverviewService).toContain('pagination: input.postedPagination ?? input.executedPagination');
    expect(movementsOverviewService).not.toContain('while (hasMorePosted)');
    expect(movementsSearchService).toContain('export class WebMovementsSearchService');
    expect(movementsSearchService).toContain('mapPostedTransactionToSearchItem');
    expect(movementsFacetsService).toContain('export class WebMovementsFacetsService');
    expect(movementsFacetsService).toContain('getMovementsSearchFacets');
    expect(scheduledListService).toContain('export class WebScheduledMovementsListService');
    expect(scheduledListService).toContain('filterScheduledMovements');
    expect(pagination).toContain('export function normalizeWebPagination');
    expect(pagination).toContain('export function paginateWebItems');
  });

  it('keeps web adapter state and browser effects behind injected boundaries', () => {
    const coreAdapterWeb = readFileSync(resolve(srcDir, 'core/infrastructure/coreAdapterWeb.ts'), 'utf8');
    const state = readFileSync(resolve(srcDir, 'core/infrastructure/webAppState.ts'), 'utf8');
    const effects = readFileSync(resolve(srcDir, 'core/infrastructure/webRuntimeDependencies.ts'), 'utf8');
    const backup = readFileSync(resolve(srcDir, 'imports/infrastructure/webBackup.ts'), 'utf8');

    expect(coreAdapterWeb).toContain("from './webAppState'");
    expect(coreAdapterWeb).toContain("from './webRuntimeDependencies'");
    expect(coreAdapterWeb).toContain("from '../../imports/infrastructure/webBackup'");
    expect(coreAdapterWeb).toContain("from '../../ledger/infrastructure/webLedgerService'");
    expect(coreAdapterWeb).toContain("from '../../taxonomy/infrastructure/webTaxonomyService'");
    expect(coreAdapterWeb).toContain("from '../../expected/infrastructure/webExpectedService'");
    expect(coreAdapterWeb).toContain('constructor(options: CoreAdapterWebOptions = {})');
    expect(coreAdapterWeb).toContain('this.state = options.state ?? defaultWebAppState');
    expect(coreAdapterWeb).not.toContain('private async collectMovementsBackupExport');
    expect(coreAdapterWeb).not.toContain('private nowIso()');
    expect(coreAdapterWeb).not.toContain('private nextId()');
    expect(coreAdapterWeb).not.toContain('private static ledgerAccounts');
    expect(coreAdapterWeb).not.toContain('private static ledgerTransactions');
    expect(coreAdapterWeb).not.toContain('private static taxonomyCategories');
    expect(coreAdapterWeb).not.toContain('private static recurringMovements');
    expect(coreAdapterWeb).not.toContain('private static expectedMovements');
    expect(coreAdapterWeb).not.toContain('crypto.randomUUID()');
    expect(coreAdapterWeb).not.toContain('new Date().toISOString()');
    expect(coreAdapterWeb).not.toContain('document.createElement');
    expect(coreAdapterWeb).not.toContain('URL.createObjectURL');

    expect(state).toContain('export type WebAppState');
    expect(state).toContain('export function createWebAppState');
    expect(state).toContain('export const defaultWebAppState = createWebAppState()');
    expect(effects).toContain('export type WebRuntimeDependencies');
    expect(effects).toContain('downloadJsonInBrowser');
    expect(effects).toContain('URL.createObjectURL');
    expect(backup).toContain('export async function collectWebMovementsBackupExport');
    expect(backup).toContain('export function webMovementsBackupFileName');
  });

  it('keeps web taxonomy orchestration split behind focused ports', () => {
    const taxonomyService = readFileSync(resolve(srcDir, 'taxonomy/infrastructure/webTaxonomyService.ts'), 'utf8');
    const categories = readFileSync(resolve(srcDir, 'taxonomy/infrastructure/webCategoryRepository.ts'), 'utf8');
    const tags = readFileSync(resolve(srcDir, 'taxonomy/infrastructure/webTagRepository.ts'), 'utf8');
    const transactionTaxonomy = readFileSync(
      resolve(srcDir, 'taxonomy/infrastructure/webTransactionTaxonomyService.ts'),
      'utf8',
    );
    const names = readFileSync(resolve(srcDir, 'taxonomy/infrastructure/webTaxonomyNames.ts'), 'utf8');
    const rowImporter = readFileSync(resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsRowImporter.ts'), 'utf8');
    const importWorkflow = readFileSync(
      resolve(srcDir, 'imports/infrastructure/providers/mobills/webMobillsImportWorkflow.ts'),
      'utf8',
    );
    const movementsService = readFileSync(resolve(srcDir, 'movements/infrastructure/webMovementsService.ts'), 'utf8');
    const movementsSearch = readFileSync(
      resolve(srcDir, 'movements/infrastructure/webMovementsSearchService.ts'),
      'utf8',
    );
    const movementsFacets = readFileSync(
      resolve(srcDir, 'movements/infrastructure/webMovementsFacetsService.ts'),
      'utf8',
    );

    expect(taxonomyService).toContain('new WebCategoryRepository');
    expect(taxonomyService).toContain('new WebTagRepository');
    expect(taxonomyService).toContain('new WebTransactionTaxonomyService');
    expect(taxonomyService).not.toContain('export type WebMobillsTaxonomyPort');
    expect(taxonomyService).not.toContain('export type WebMovementsTaxonomyPort');
    expect(taxonomyService).not.toContain('export type WebSearchFacetsTaxonomyPort');
    expect(taxonomyService).not.toContain('this.state.taxonomyCategories.find');
    expect(taxonomyService).not.toContain('this.state.taxonomyTags.find');
    expect(taxonomyService).not.toContain('uniqueByNormalizedName');
    expect(taxonomyService).not.toContain('transactionOrThrow');
    expect(taxonomyService.split('\n').length).toBeLessThanOrEqual(150);

    expect(categories).toContain('export class WebCategoryRepository');
    expect(categories).toContain('export type WebCategoryLookupPort');
    expect(categories).toContain('export type WebCategoryImportPort');
    expect(categories).toContain('findActiveCategoryByName');
    expect(categories).toContain('createCategory');
    expect(categories).toContain('renameCategory');
    expect(categories).not.toContain('applyTransactionTags');

    expect(tags).toContain('export class WebTagRepository');
    expect(tags).toContain('export type WebTagAssignmentPort');
    expect(tags).toContain('assignActiveTagNames');
    expect(tags).toContain('renameTag');
    expect(tags).not.toContain('categorizeTransaction');

    expect(transactionTaxonomy).toContain('export class WebTransactionTaxonomyService');
    expect(transactionTaxonomy).toContain('export type WebTransactionTaxonomyPort');
    expect(transactionTaxonomy).toContain('transactionOrThrow');
    expect(transactionTaxonomy).toContain('categorizeTransaction');
    expect(transactionTaxonomy).toContain('applyTransactionTags');
    expect(transactionTaxonomy).toContain('listTransactionTaxonomy');
    expect(transactionTaxonomy).not.toContain('createCategory');
    expect(transactionTaxonomy).not.toContain('renameTag');

    expect(names).toContain('export function normalizeWebTaxonomyCategoryName');
    expect(names).toContain('export function normalizeWebTaxonomyTagName');
    expect(names).toContain('export function uniqueWebTaxonomyTagNames');

    expect(rowImporter).toContain('MobillsTaxonomyPort');
    expect(importWorkflow).toContain('MobillsTaxonomyPort');
    expect(movementsService).toContain('MovementsTaxonomyReader');
    expect(movementsSearch).toContain('MovementsTaxonomyReader');
    expect(movementsFacets).toContain('MovementsTaxonomyReader');
    for (const consumer of [rowImporter, importWorkflow, movementsService, movementsSearch, movementsFacets]) {
      expect(consumer).not.toContain('type { WebTaxonomyService');
      expect(consumer).not.toContain('taxonomy: WebTaxonomyService');
      expect(consumer).not.toContain('readonly taxonomy: WebTaxonomyService');
    }
  });

  it('keeps monthly movements model responsibilities split by collaborator hooks', () => {
    const hook = readFileSync(resolve(srcDir, 'movements/application/useMonthlyMovementsModel.ts'), 'utf8');
    const navigation = readFileSync(resolve(srcDir, 'movements/application/useMonthlyMovementNavigationModel.ts'), 'utf8');
    const overview = readFileSync(resolve(srcDir, 'movements/application/useMonthlyMovementsOverviewModel.ts'), 'utf8');
    const taxonomy = readFileSync(resolve(srcDir, 'movements/application/useMonthlyMovementsTaxonomyModel.ts'), 'utf8');
    const mutations = readFileSync(resolve(srcDir, 'movements/application/useMonthlyMovementMutationsModel.ts'), 'utf8');
    const feedback = readFileSync(resolve(srcDir, 'movements/application/useMonthlyMovementsFeedbackModel.ts'), 'utf8');
    const calendar = readFileSync(resolve(srcDir, 'movements/application/monthlyMovementCalendar.ts'), 'utf8');

    expect(hook).toContain("from './useMonthlyMovementNavigationModel'");
    expect(hook).toContain("from './useMonthlyMovementsOverviewModel'");
    expect(hook).toContain("from './useMonthlyMovementsTaxonomyModel'");
    expect(hook).toContain("from './useMonthlyMovementMutationsModel'");
    expect(hook).toContain("from './useMonthlyMovementsFeedbackModel'");
    expect(hook).not.toContain("from './monthlyMovementProjection'");
    expect(hook).not.toContain('filterProjectedScheduledMovements');
    expect(hook).not.toContain('mapTransactionHistoryList');
    expect(hook).not.toContain('useLedgerTransactions');
    expect(hook).not.toContain('useCategorySuggestions');
    expect(hook).not.toContain('pendingVoidTimerRef');
    expect(hook).not.toContain('function monthStart');
    expect(hook.split('\n').length).toBeLessThanOrEqual(300);

    expect(navigation).toContain("from './monthlyMovementCalendar'");
    expect(navigation).toContain('goToPreviousMonth');
    expect(overview).toContain("from './monthlyMovementProjection'");
    expect(overview).toContain('filterProjectedScheduledMovements');
    expect(taxonomy).toContain('mapTransactionHistoryList');
    expect(taxonomy).toContain('useTransactionClassification');
    expect(mutations).toContain('useLedgerTransactions');
    expect(mutations).toContain('pendingVoidTimerRef');
    expect(feedback).toContain('showAction');
    expect(calendar).toContain('export function monthStart');
  });

  it('keeps movements search model responsibilities split by focused collaborators', () => {
    const hook = readFileSync(resolve(srcDir, 'movements/application/useMovementsSearchModel.ts'), 'utf8');
    const filters = readFileSync(resolve(srcDir, 'movements/application/movementsSearchFilters.ts'), 'utf8');
    const results = readFileSync(resolve(srcDir, 'movements/application/movementsSearchResults.ts'), 'utf8');
    const queryRunner = readFileSync(resolve(srcDir, 'movements/application/movementsSearchQueryRunner.ts'), 'utf8');
    const filtersModel = readFileSync(resolve(srcDir, 'movements/application/useMovementsSearchFiltersModel.ts'), 'utf8');
    const facetsModel = readFileSync(resolve(srcDir, 'movements/application/useMovementsSearchFacetsModel.ts'), 'utf8');

    expect(hook).toContain("from './useMovementsSearchFiltersModel'");
    expect(hook).toContain("from './useMovementsSearchFacetsModel'");
    expect(hook).toContain("from './movementsSearchQueryRunner'");
    expect(hook).toContain("from './movementsSearchResults'");
    expect(hook).not.toContain('core.movementsSearch');
    expect(hook).not.toContain('core.movementsGetSearchFacets');
    expect(hook).not.toContain('buildMovementsSearchFilters');
    expect(hook).not.toContain('compareMovementsSearchItems');
    expect(hook).not.toContain('normalizeMovementSearchIdentifierList');
    expect(hook).not.toContain('Math.ceil(totalElements /');
    expect(hook.split('\n').length).toBeLessThanOrEqual(240);

    expect(filters).toContain('export function buildMovementsSearchFilters');
    expect(filters).toContain('export function mergeMovementsSearchFilterPatch');
    expect(filters).toContain('export function buildPostedTaxonomyCandidateFilters');
    expect(results).toContain('export function aggregateMovementsSearchResults');
    expect(results).toContain('export function getMovementsSearchAccountScope');
    expect(queryRunner).toContain('export const movementsSearchQueryStrategies');
    expect(queryRunner).toContain('export async function runMovementsSearchQuery');
    expect(queryRunner).toContain('input.core.movementsSearch');
    expect(filtersModel).toContain('export function useMovementsSearchFiltersModel');
    expect(filtersModel).toContain('mergeMovementsSearchFilterPatch');
    expect(facetsModel).toContain('export function useMovementsSearchFacetsModel');
    expect(facetsModel).toContain('core.movementsGetSearchFacets');
  });

  it('keeps transaction taxonomy selection logic out of the React model hook', () => {
    const hook = readFileSync(resolve(srcDir, 'transactions/application/useTransactionEntryModel.ts'), 'utf8');
    const selection = readFileSync(resolve(srcDir, 'transactions/application/transactionTaxonomySelection.ts'), 'utf8');
    const transferFx = readFileSync(resolve(srcDir, 'transactions/domain/transferFx.ts'), 'utf8');
    const transferModel = readFileSync(resolve(srcDir, 'transactions/application/useTransactionTransferFxModel.ts'), 'utf8');
    const splitModel = readFileSync(resolve(srcDir, 'transactions/application/useExpenseSplitEditorModel.ts'), 'utf8');
    const schedulingModel = readFileSync(resolve(srcDir, 'transactions/application/useTransactionSchedulingModel.ts'), 'utf8');
    const taxonomyModel = readFileSync(resolve(srcDir, 'transactions/application/useTransactionTaxonomyModel.ts'), 'utf8');

    expect(hook).toContain("from './useTransactionTransferFxModel'");
    expect(hook).toContain("from './useExpenseSplitEditorModel'");
    expect(hook).toContain("from './useTransactionSchedulingModel'");
    expect(hook).toContain("from './useTransactionTaxonomyModel'");
    expect(hook).not.toContain("from './transactionTaxonomySelection'");
    expect(hook).not.toContain("from '../domain/expenseSplit'");
    expect(hook).not.toContain("from '../domain/transferFx'");
    expect(hook).not.toContain('syncTransferFxFields');
    expect(hook).not.toContain('function findActiveCategoryByName');
    expect(hook).not.toContain('function mergeCategories');
    expect(hook).not.toContain('function setTransferFxRateValue');
    expect(hook).not.toContain('function addExpenseItem');
    expect(hook).not.toContain('function resolveCategorySelection');
    expect(hook).not.toContain('parseTransactionTagInput');
    expect(hook).not.toContain('const knownByNormalizedName = new Map');
    expect(hook).not.toContain('calculateTransferDestinationAmount');
    expect(hook).not.toContain('calculateTransferFxRate');
    expect(hook).not.toContain('normalizePositiveFxRate');
    expect(hook.split('\n').length).toBeLessThanOrEqual(665);

    expect(selection).toContain('export function findActiveCategoryByName');
    expect(selection).toContain('export function mergeCategories');
    expect(selection).toContain('export function parseTransactionTagInput');
    expect(selection).toContain('export function resolveKnownTagSelectionIds');
    expect(transferFx).toContain('export function syncTransferFxFields');
    expect(transferModel).toContain("from '../domain/transferFx'");
    expect(transferModel).toContain('function setTransferFxRateValue');
    expect(splitModel).toContain("from '../domain/expenseSplit'");
    expect(splitModel).toContain('function addExpenseItem');
    expect(schedulingModel).toContain('function setSchedulingModeValue');
    expect(taxonomyModel).toContain("from './transactionTaxonomySelection'");
    expect(taxonomyModel).toContain('async function resolveCategorySelection');
  });
});
