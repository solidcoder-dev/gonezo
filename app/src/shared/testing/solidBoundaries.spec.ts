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
  it('keeps the shared core port composed from focused capability ports', () => {
    const corePort = readFileSync(resolve(srcDir, 'shared/domain/corePort.ts'), 'utf8');

    expect(corePort).toContain('export interface PreferencesCorePort');
    expect(corePort).toContain('export interface LedgerCorePort');
    expect(corePort).toContain('export interface TaxonomyCorePort');
    expect(corePort).toContain('export interface MobillsImportCorePort');
    expect(corePort).toContain('export interface MovementsBackupCorePort');
    expect(corePort).toContain('export interface RecurrenceCorePort');
    expect(corePort).toContain('export interface SchedulingCorePort');
    expect(corePort).toContain('export interface ExpectedCorePort');
    expect(corePort).toContain('export interface MovementsQueryCorePort');
    expect(corePort).toMatch(/export interface CorePort\s+extends\s+PreferencesCorePort,/);
    expect(corePort).toMatch(/MovementsQueryCorePort \{\}/);
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

  it('keeps native movement composition out of the platform adapter shell', () => {
    const coreAdapter = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapter.ts'), 'utf8');
    const nativeMovements = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterNativeMovements.ts'), 'utf8');

    expect(coreAdapter).toContain('getNativeMovementsMonthOverview(this, input)');
    expect(coreAdapter).toContain('searchNativeMovements(this, input)');
    expect(coreAdapter).toContain('listNativeScheduledMovements(this, input)');
    expect(coreAdapter).not.toContain('function filterScheduledMovementItems');
    expect(coreAdapter).not.toContain('function mapPostedTransactionToSearchItem');
    expect(coreAdapter.split('\n').length).toBeLessThanOrEqual(550);

    expect(nativeMovements).toContain('function filterScheduledMovementItems');
    expect(nativeMovements).toContain('function mapPostedTransactionToSearchItem');
  });

  it('keeps Mobills parsing out of the in-memory web adapter orchestration', () => {
    const coreAdapterWeb = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWeb.ts'), 'utf8');
    const parser = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebMobillsImportParser.ts'), 'utf8');

    expect(coreAdapterWeb).toContain("from './coreAdapterWebMobillsImportParser'");
    expect(coreAdapterWeb).not.toContain('private decodeBase64ToText');
    expect(coreAdapterWeb).not.toContain('private detectDelimiter');
    expect(coreAdapterWeb).not.toContain('private splitDelimited');
    expect(coreAdapterWeb).not.toContain('private parseMobillsDate');
    expect(coreAdapterWeb).not.toContain('private parseTransferDescriptor');

    expect(parser).toContain('export function decodeMobillsImportBase64');
    expect(parser).toContain('export function splitDelimitedLine');
    expect(parser).toContain('export function parseMobillsTransferDescriptor');
  });

  it('keeps web recurrence and movement query rules out of the in-memory adapter shell', () => {
    const coreAdapterWeb = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWeb.ts'), 'utf8');
    const recurrence = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebRecurrence.ts'), 'utf8');
    const movementQueries = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebMovementQueries.ts'), 'utf8');
    const ledgerQueries = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebLedgerQueries.ts'), 'utf8');

    expect(coreAdapterWeb).toContain("from './coreAdapterWebRecurrence'");
    expect(coreAdapterWeb).toContain("from './coreAdapterWebMovementQueries'");
    expect(coreAdapterWeb).toContain("from './coreAdapterWebLedgerQueries'");
    expect(coreAdapterWeb).not.toContain('private normalizeRecurrenceRule');
    expect(coreAdapterWeb).not.toContain('private firstDueAtForRule');
    expect(coreAdapterWeb).not.toContain('private filterScheduledMovements');
    expect(coreAdapterWeb).not.toContain('private filterExpectedMovements');
    expect(coreAdapterWeb).not.toContain('private mapExpectedMovementToSearchItem');
    expect(coreAdapterWeb).not.toContain('const fromDateEpoch = filters.fromDate');
    expect(coreAdapterWeb).not.toContain('const statusesFilter = filters.statuses');
    expect(coreAdapterWeb.split('\n').length).toBeLessThanOrEqual(2000);

    expect(recurrence).toContain('export function normalizeWebRecurrenceRule');
    expect(recurrence).toContain('export function firstDueAtForWebRecurrence');
    expect(movementQueries).toContain('export function filterScheduledMovements');
    expect(movementQueries).toContain('export function filterExpectedMovements');
    expect(movementQueries).toContain('export function mapScheduledMovementToSearchItem');
    expect(ledgerQueries).toContain('export function listWebLedgerTransactions');
  });

  it('keeps web adapter state and browser effects behind injected boundaries', () => {
    const coreAdapterWeb = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWeb.ts'), 'utf8');
    const state = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebState.ts'), 'utf8');
    const effects = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebEffects.ts'), 'utf8');
    const backup = readFileSync(resolve(srcDir, 'shared/infrastructure/core/coreAdapterWebBackup.ts'), 'utf8');

    expect(coreAdapterWeb).toContain("from './coreAdapterWebState'");
    expect(coreAdapterWeb).toContain("from './coreAdapterWebEffects'");
    expect(coreAdapterWeb).toContain("from './coreAdapterWebBackup'");
    expect(coreAdapterWeb).toContain('constructor(options: CoreAdapterWebOptions = {})');
    expect(coreAdapterWeb).toContain('this.state = options.state ?? defaultWebCoreState');
    expect(coreAdapterWeb).not.toContain('private async collectMovementsBackupExport');
    expect(coreAdapterWeb).not.toContain('private static ledgerAccounts');
    expect(coreAdapterWeb).not.toContain('private static ledgerTransactions');
    expect(coreAdapterWeb).not.toContain('private static taxonomyCategories');
    expect(coreAdapterWeb).not.toContain('private static recurringMovements');
    expect(coreAdapterWeb).not.toContain('private static expectedMovements');
    expect(coreAdapterWeb).not.toContain('crypto.randomUUID()');
    expect(coreAdapterWeb).not.toContain('new Date().toISOString()');
    expect(coreAdapterWeb).not.toContain('document.createElement');
    expect(coreAdapterWeb).not.toContain('URL.createObjectURL');

    expect(state).toContain('export type WebCoreState');
    expect(state).toContain('export function createWebCoreState');
    expect(state).toContain('export const defaultWebCoreState = createWebCoreState()');
    expect(effects).toContain('export type CoreAdapterWebDependencies');
    expect(effects).toContain('downloadJsonInBrowser');
    expect(effects).toContain('URL.createObjectURL');
    expect(backup).toContain('export async function collectWebMovementsBackupExport');
    expect(backup).toContain('export function webMovementsBackupFileName');
  });

  it('keeps transaction taxonomy selection logic out of the React model hook', () => {
    const hook = readFileSync(resolve(srcDir, 'transactions/application/useTransactionEntryModel.ts'), 'utf8');
    const selection = readFileSync(resolve(srcDir, 'transactions/application/transactionTaxonomySelection.ts'), 'utf8');
    const transferFx = readFileSync(resolve(srcDir, 'transactions/application/transactionTransferFx.ts'), 'utf8');

    expect(hook).toContain("from './transactionTaxonomySelection'");
    expect(hook).toContain('syncTransferFxFields');
    expect(hook).not.toContain('function findActiveCategoryByName');
    expect(hook).not.toContain('function mergeCategories');
    expect(hook).not.toContain('const knownByNormalizedName = new Map');
    expect(hook).not.toContain('calculateTransferDestinationAmount');
    expect(hook).not.toContain('calculateTransferFxRate');
    expect(hook).not.toContain('normalizePositiveFxRate');
    expect(hook.split('\n').length).toBeLessThanOrEqual(1100);

    expect(selection).toContain('export function findActiveCategoryByName');
    expect(selection).toContain('export function mergeCategories');
    expect(selection).toContain('export function parseTransactionTagInput');
    expect(selection).toContain('export function resolveKnownTagSelectionIds');
    expect(transferFx).toContain('export function syncTransferFxFields');
  });
});
