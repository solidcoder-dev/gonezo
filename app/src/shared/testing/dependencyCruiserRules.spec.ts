import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const appDir = resolve(import.meta.dirname, '..', '..', '..');
const depCruiseBinary = resolve(appDir, 'node_modules', '.bin', 'depcruise');
const repoConfigPath = resolve(appDir, '.dependency-cruiser.cjs');

let tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) {
    rmSync(root, { recursive: true, force: true });
  }
  tempRoots = [];
});

function makeTempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'gonezo-depcruise-'));
  tempRoots.push(root);
  mkdirSync(resolve(root, 'src'), { recursive: true });
  mkdirSync(resolve(root, 'node_modules/react'), { recursive: true });
  writeFileSync(resolve(root, 'node_modules/react/package.json'), JSON.stringify({
    name: 'react',
    main: 'index.js',
  }, null, 2));
  writeFileSync(resolve(root, 'node_modules/react/index.js'), 'module.exports = {};\n');
  writeFileSync(resolve(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'NodeNext',
      strict: true,
      baseUrl: '.',
    },
    include: ['src/**/*'],
  }, null, 2));
  return root;
}

function writeFixtureFile(root: string, relativePath: string, content: string) {
  const filePath = resolve(root, relativePath);
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  writeFileSync(filePath, content);
}

function runDependencyCruiser(root: string, configPath: string) {
  const outputPath = resolve(root, 'depcruise-report.json');
  try {
    execFileSync(depCruiseBinary, ['src', '--config', configPath, '--output-type', 'json', '--output-to', outputPath], {
      cwd: root,
      encoding: 'utf8',
    });
  } catch (error) {
    if (!existsSync(outputPath)) {
      throw error;
    }
  }
  return JSON.parse(readFileSync(outputPath, 'utf8')) as {
    summary: { error: number };
    modules: Array<{
      source: string;
      dependencies: Array<{
        resolved?: string;
        valid: boolean;
        rule?: { name?: string };
        couldNotResolve?: boolean;
      }>;
    }>;
  };
}

function collectInvalidDependencies(report: ReturnType<typeof runDependencyCruiser>) {
  return report.modules.flatMap((module) =>
    module.dependencies
      .filter((dependency) => dependency.valid === false)
      .map((dependency) => ({
        from: basename(module.source),
        to: dependency.resolved ? basename(dependency.resolved) : undefined,
        couldNotResolve: dependency.couldNotResolve ?? false,
      })));
}

describe('dependency-cruiser rules', () => {
  it('shows that pathNot does not interpolate $1 for context scoping', () => {
    const root = makeTempRoot();

    writeFixtureFile(root, 'src/account/application/AccountPage.ts', "import { accountView } from '../ui/AccountView';\nexport const page = accountView;\n");
    writeFixtureFile(root, 'src/account/ui/AccountView.ts', 'export const accountView = 1;\n');
    writeFixtureFile(root, 'src/ledger/ui/LedgerView.ts', 'export const ledgerView = 1;\n');
    writeFixtureFile(root, 'src/ledger/application/LedgerPage.ts', [
      "import { accountView } from '../../account/ui/AccountView';",
      "import { ledgerView } from '../ui/LedgerView';",
      'export const page = accountView + ledgerView;',
      '',
    ].join('\n'));

    writeFixtureFile(root, '.dependency-cruiser.cjs', [
      'module.exports = {',
      '  forbidden: [{',
      "    name: 'same-context-isolation',",
      '    from: { path: "^src/(account|ledger)/" },',
      '    to: { path: "^src/(account|ledger)/", pathNot: "^src/$1/" },',
      '  }],',
      '  options: { tsConfig: { fileName: "./tsconfig.json" } },',
      '};',
      '',
    ].join('\n'));

    const report = runDependencyCruiser(root, resolve(root, '.dependency-cruiser.cjs'));
    const invalidDependencies = collectInvalidDependencies(report);

    expect(invalidDependencies).toEqual([
      expect.objectContaining({
        from: 'LedgerPage.ts',
        to: 'AccountView.ts',
        couldNotResolve: false,
      }),
    ]);
  });

  it('enforces the repository dependency contract on valid and invalid fixtures', { timeout: 10000 }, () => {
    const root = makeTempRoot();

    writeFixtureFile(root, 'src/ledger/ui/LedgerView.ts', 'export const ledgerView = 1;\n');
    writeFixtureFile(root, 'src/ledger/application/ledgerGateway.ts', 'export const ledgerGateway = 1;\n');
    writeFixtureFile(root, 'src/ledger/application/useLedgerTransactions.ts', 'export const useLedgerTransactions = 1;\n');
    writeFixtureFile(root, 'src/ledger/application/private/deepThing.ts', 'export const deepThing = 1;\n');
    writeFixtureFile(root, 'src/ledger/application/LedgerPage.ts', [
      "import { ledgerGateway } from './ledgerGateway';",
      'export const page = ledgerGateway;',
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/workspace/application/WorkspacePage.ts', [
      "import { useLedgerTransactions } from '../../ledger/application/useLedgerTransactions';",
      "import { deepThing } from '../../ledger/application/private/deepThing';",
      "import { ledgerGateway } from '../../ledger/application/ledgerGateway';",
      'export const page = ledgerGateway + useLedgerTransactions + deepThing;',
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/shared/ui/SharedView.ts', [
      "import { ledgerGateway } from '../../ledger/application/ledgerGateway';",
      'export const sharedView = ledgerGateway;',
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/ledger/domain/DomainThing.ts', [
      "import React from 'react';",
      "import { ledgerView } from '../ui/LedgerView';",
      'export const domainThing = React && ledgerView;',
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/ledger/application/cycleA.ts', [
      "import { cycleB } from './cycleB';",
      'export const cycleA = cycleB;',
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/ledger/application/cycleB.ts', [
      "import { cycleA } from './cycleA';",
      'export const cycleB = cycleA;',
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/workspace/application/Broken.ts', "import { missing } from './missing';\nexport const broken = missing;\n");

    const report = runDependencyCruiser(root, repoConfigPath);
    const invalidDependencies = collectInvalidDependencies(report);

    expect(report.summary.error).toBeGreaterThan(0);
    expect(invalidDependencies).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: 'WorkspacePage.ts',
        to: 'deepThing.ts',
      }),
      expect.objectContaining({
        from: 'SharedView.ts',
        to: 'ledgerGateway.ts',
      }),
      expect.objectContaining({
        from: 'DomainThing.ts',
        to: 'LedgerView.ts',
      }),
      expect.objectContaining({
        from: 'DomainThing.ts',
        to: 'index.js',
      }),
      expect.objectContaining({
        from: 'Broken.ts',
        to: 'missing',
        couldNotResolve: true,
      }),
      expect.objectContaining({
        from: 'cycleA.ts',
        to: 'cycleB.ts',
      }),
    ]));

    expect(invalidDependencies).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          from: 'LedgerPage.ts',
          to: 'LedgerView.ts',
          rule: expect.any(String),
        }),
        expect.objectContaining({
          from: 'WorkspacePage.ts',
          to: 'useLedgerTransactions.ts',
          rule: expect.any(String),
        }),
      ]),
    );
  });

  it('blocks deep cross-context imports when only the public API is allowed', () => {
    const root = makeTempRoot();

    writeFixtureFile(root, 'src/account/index.ts', [
      "export { accountView } from './public/AccountView';",
      '',
    ].join('\n'));
    writeFixtureFile(root, 'src/account/public/AccountView.ts', 'export const accountView = 1;\n');
    writeFixtureFile(root, 'src/account/application/AccountPage.ts', 'export const accountPage = 1;\n');
    writeFixtureFile(root, 'src/workspace/application/WorkspacePage.ts', [
      "import { accountView } from '../../account/index';",
      "import { accountView as accountPublicView } from '../../account/public/AccountView';",
      "import { accountPage } from '../../account/application/AccountPage';",
      'export const page = accountView + accountPublicView + accountPage;',
      '',
    ].join('\n'));

    writeFixtureFile(root, '.dependency-cruiser.cjs', [
      'module.exports = {',
      '  forbidden: [{',
      "    name: 'no-deep-cross-context-imports',",
      '    from: { path: "^src/workspace/" },',
      "    to: { path: '^src/account/', pathNot: '^src/account/(?:index\\\\.ts|public/)' },",
      '  }],',
      '  options: { tsConfig: { fileName: "./tsconfig.json" } },',
      '};',
      '',
    ].join('\n'));

    const report = runDependencyCruiser(root, resolve(root, '.dependency-cruiser.cjs'));
    const invalidDependencies = collectInvalidDependencies(report);

    expect(invalidDependencies).toEqual([
      expect.objectContaining({
        from: 'WorkspacePage.ts',
        to: 'AccountPage.ts',
      }),
    ]);
    expect(invalidDependencies).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          from: 'WorkspacePage.ts',
          to: 'AccountView.ts',
        }),
      ]),
    );
  });
});
