import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// @ts-expect-error The script is an executable module, not part of the TypeScript program.
import { findStructureViolations } from '../../../scripts/check-src-structure.mjs';

const topLevelFiles = ['App.css', 'App.tsx', 'index.css', 'main.tsx'];
const contextLayerMap: Record<string, string[]> = {
  account: ['application', 'infrastructure', 'ui'],
  analytics: ['application', 'infrastructure', 'ui'],
  core: ['application', 'infrastructure'],
  expected: ['application', 'infrastructure'],
  experiments: ['application', 'infrastructure'],
  ledger: ['application', 'infrastructure', 'ui'],
  movements: ['application', 'infrastructure', 'ui'],
  scheduling: ['application', 'infrastructure'],
  sharing: ['application', 'domain', 'infrastructure', 'ui'],
  taxonomy: ['application', 'domain', 'infrastructure'],
  transactions: ['application', 'domain', 'ui'],
  workspace: ['application', 'ui'],
};

const sharedLayers = ['domain', 'testing', 'ui', 'utils'];
const importsLayers = ['application', 'domain', 'infrastructure', 'ui'];

let tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  tempRoots = [];
});

function makeDir(root: string, relativePath: string) {
  mkdirSync(resolve(root, relativePath), { recursive: true });
}

function makeValidStructure() {
  const root = mkdtempSync(join(tmpdir(), 'gonezo-src-structure-'));
  tempRoots.push(root);
  const srcRoot = resolve(root, 'src');
  mkdirSync(srcRoot, { recursive: true });

  for (const file of topLevelFiles) {
    writeFileSync(resolve(srcRoot, file), '');
  }

  makeDir(srcRoot, 'styles');

  for (const [context, layers] of Object.entries(contextLayerMap)) {
    for (const layer of layers) {
      makeDir(srcRoot, `${context}/${layer}`);
    }
  }

  for (const layer of sharedLayers) {
    makeDir(srcRoot, `shared/${layer}`);
  }

  for (const layer of importsLayers) {
    makeDir(srcRoot, `imports/${layer}`);
  }
  makeDir(srcRoot, 'imports/infrastructure/providers/mobills');

  return srcRoot;
}

describe('check-src-structure', () => {
  it('rejects an unknown top-level context', async () => {
    const srcRoot = makeValidStructure();
    makeDir(srcRoot, 'unknown/application');

    const violations = await findStructureViolations(srcRoot);

    expect(violations).toContain('src has unexpected top-level entry "unknown"');
  });

  it('rejects a layer that is not authorized for a context', async () => {
    const srcRoot = makeValidStructure();
    makeDir(srcRoot, 'ledger/domain');

    const violations = await findStructureViolations(srcRoot);

    expect(violations).toContain('src/ledger has unexpected entry "domain"');
  });

  it('rejects a missing required folder', async () => {
    const srcRoot = makeValidStructure();
    rmSync(resolve(srcRoot, 'shared/ui'), { recursive: true, force: true });

    const violations = await findStructureViolations(srcRoot);

    expect(violations).toContain('src/shared is missing required entry "ui"');
  });

  it('rejects an architectural folder placed in the wrong location', async () => {
    const srcRoot = makeValidStructure();
    rmSync(resolve(srcRoot, 'shared/ui'), { recursive: true, force: true });
    makeDir(srcRoot, 'ui');

    const violations = await findStructureViolations(srcRoot);

    expect(violations).toContain('src has unexpected top-level entry "ui"');
    expect(violations).toContain('src/shared is missing required entry "ui"');
  });
});
