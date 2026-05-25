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
    const tagging = readFileSync(join(androidPluginDir, 'TransactionTaggingBridge.java'), 'utf8');

    expect(corePlugin).toContain('new MobillsImportHandler(getContext()).importBase64');
    expect(corePlugin).toContain('new MovementsBackupHandler(getContext()).exportBackup');
    expect(corePlugin).toContain('TransactionTaggingBridge.applyTagsToTransaction');
    expect(corePlugin).not.toContain('private JSObject importMobillsText');
    expect(corePlugin).not.toContain('private String writeBackupFile');
    expect(corePlugin).not.toContain('MediaStore');
    expect(corePlugin.split('\n').length).toBeLessThanOrEqual(1400);

    expect(mobillsImport).toContain('final class MobillsImportHandler');
    expect(backup).toContain('final class MovementsBackupHandler');
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
});
