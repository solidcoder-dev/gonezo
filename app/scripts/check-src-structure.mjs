import { readdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SRC_DIR = resolve(__dirname, '..', 'src');

const EXPECTED_TOP_LEVEL = new Set([
  'App.css',
  'App.tsx',
  'account',
  'analytics',
  'core',
  'expected',
  'experiments',
  'imports',
  'index.css',
  'ledger',
  'main.tsx',
  'movements',
  'scheduling',
  'sharing',
  'shared',
  'styles',
  'taxonomy',
  'transactions',
  'workspace',
]);

const EXPECTED_LAYER_DIRS = ['application', 'domain', 'infrastructure', 'ui'];
const EXPECTED_CONTEXT_DIRS = {
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
const EXPECTED_SHARED_DIRS = ['domain', 'testing', 'ui', 'utils'];
const EXPECTED_IMPORTS_INFRASTRUCTURE_DIRS = ['fixtures', 'providers'];
const EXPECTED_IMPORTS_PROVIDER_MODULES = ['mobills'];

async function listNames(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return {
    files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
    dirs: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  };
}

function collectMissingEntries(actual, expected, prefix) {
  const failures = [];
  for (const name of expected) {
    if (!actual.includes(name)) {
      failures.push(`${prefix} is missing required entry "${name}"`);
    }
  }
  return failures;
}

function collectUnexpectedEntries(actual, expected, prefix) {
  const allowed = new Set(expected);
  const failures = [];
  for (const name of actual) {
    if (!allowed.has(name)) {
      failures.push(`${prefix} has unexpected entry "${name}"`);
    }
  }
  return failures;
}

async function checkTopLevel(srcDir) {
  const { files, dirs } = await listNames(srcDir);
  const actual = [...files, ...dirs];
  const failures = [];

  for (const name of actual) {
    if (!EXPECTED_TOP_LEVEL.has(name)) {
      failures.push(`src has unexpected top-level entry "${name}"`);
    }
  }

  for (const name of EXPECTED_TOP_LEVEL) {
    if (!actual.includes(name)) {
      failures.push(`src is missing required top-level entry "${name}"`);
    }
  }

  return failures;
}

async function checkDomainLayers(srcDir, domainName) {
  const { dirs } = await listNames(resolve(srcDir, domainName));
  const expected = EXPECTED_CONTEXT_DIRS[domainName];
  return [
    ...collectMissingEntries(dirs, expected, `src/${domainName}`),
    ...collectUnexpectedEntries(dirs, expected, `src/${domainName}`),
  ];
}

async function checkShared(srcDir) {
  const { dirs } = await listNames(resolve(srcDir, 'shared'));
  return [
    ...collectMissingEntries(dirs, EXPECTED_SHARED_DIRS, 'src/shared'),
    ...collectUnexpectedEntries(dirs, EXPECTED_SHARED_DIRS, 'src/shared'),
  ];
}

async function checkImports(srcDir) {
  const failures = [];
  const importsPath = resolve(srcDir, 'imports');
  const { dirs: importsDirs } = await listNames(importsPath);
  failures.push(...collectMissingEntries(importsDirs, EXPECTED_LAYER_DIRS, 'src/imports'));
  failures.push(...collectUnexpectedEntries(importsDirs, EXPECTED_LAYER_DIRS, 'src/imports'));

  const importsInfrastructurePath = resolve(importsPath, 'infrastructure');
  const { dirs: infrastructureDirs } = await listNames(importsInfrastructurePath);
  failures.push(...collectMissingEntries(infrastructureDirs, EXPECTED_IMPORTS_INFRASTRUCTURE_DIRS, 'src/imports/infrastructure'));
  failures.push(...collectUnexpectedEntries(infrastructureDirs, EXPECTED_IMPORTS_INFRASTRUCTURE_DIRS, 'src/imports/infrastructure'));

  const providersPath = resolve(importsInfrastructurePath, 'providers');
  const { dirs: providerDirs } = await listNames(providersPath);
  failures.push(...collectMissingEntries(providerDirs, EXPECTED_IMPORTS_PROVIDER_MODULES, 'src/imports/infrastructure/providers'));
  failures.push(...collectUnexpectedEntries(providerDirs, EXPECTED_IMPORTS_PROVIDER_MODULES, 'src/imports/infrastructure/providers'));

  return failures;
}

export async function findStructureViolations(srcDir = SRC_DIR) {
  const violations = [
    ...(await checkTopLevel(srcDir)),
    ...(await Promise.all(Object.keys(EXPECTED_CONTEXT_DIRS).map((domainName) => checkDomainLayers(srcDir, domainName)))).flat(),
    ...(await checkImports(srcDir)),
    ...(await checkShared(srcDir)),
  ];

  return violations;
}

async function main() {
  const violations = await findStructureViolations();
  for (const violation of violations) {
    console.error(`check:structure failed: ${violation}`);
  }

  if (violations.length > 0) {
    process.exit(1);
  }

  console.log('check:structure passed');
}

if (process.argv[1] && resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
