import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, '..', '..');

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
});
