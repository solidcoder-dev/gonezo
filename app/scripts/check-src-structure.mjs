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
  'imports',
  'index.css',
  'ledger',
  'main.tsx',
  'shared',
  'taxonomy',
]);

const EXPECTED_LAYER_DIRS = ['application', 'domain', 'infrastructure', 'ui'];
const EXPECTED_SHARED_DIRS = ['domain', 'infrastructure', 'testing', 'ui', 'utils'];
const EXPECTED_IMPORTS_DIRS = ['mobills'];

async function listNames(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return {
    files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
    dirs: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name),
  };
}

function fail(message) {
  console.error(`check:structure failed: ${message}`);
  process.exitCode = 1;
}

function assertContainsAll(actual, expected, prefix) {
  for (const name of expected) {
    if (!actual.includes(name)) {
      fail(`${prefix} is missing required entry "${name}"`);
    }
  }
}

async function checkTopLevel() {
  const { files, dirs } = await listNames(SRC_DIR);
  const actual = [...files, ...dirs];

  for (const name of actual) {
    if (!EXPECTED_TOP_LEVEL.has(name)) {
      fail(`src has unexpected top-level entry "${name}"`);
    }
  }

  for (const name of EXPECTED_TOP_LEVEL) {
    if (!actual.includes(name)) {
      fail(`src is missing required top-level entry "${name}"`);
    }
  }
}

async function checkDomainLayers(domainName) {
  const { dirs } = await listNames(resolve(SRC_DIR, domainName));
  assertContainsAll(dirs, EXPECTED_LAYER_DIRS, `src/${domainName}`);
}

async function checkShared() {
  const { dirs } = await listNames(resolve(SRC_DIR, 'shared'));
  assertContainsAll(dirs, EXPECTED_SHARED_DIRS, 'src/shared');
}

async function checkImports() {
  const importsPath = resolve(SRC_DIR, 'imports');
  const { dirs: importsDirs } = await listNames(importsPath);
  assertContainsAll(importsDirs, EXPECTED_IMPORTS_DIRS, 'src/imports');

  for (const dir of importsDirs) {
    if (!EXPECTED_IMPORTS_DIRS.includes(dir)) {
      fail(`src/imports has unexpected module "${dir}"`);
    }
  }

  const { dirs: mobillsDirs } = await listNames(resolve(importsPath, 'mobills'));
  assertContainsAll(mobillsDirs, EXPECTED_LAYER_DIRS, 'src/imports/mobills');
}

async function main() {
  await checkTopLevel();
  await checkDomainLayers('account');
  await checkDomainLayers('ledger');
  await checkDomainLayers('taxonomy');
  await checkImports();
  await checkShared();

  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }

  console.log('check:structure passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
