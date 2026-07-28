import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sourcePath = resolve(root, 'src/styles/theme-colors.json');
const targetPath = resolve(root, 'src/styles/_theme-colors.generated.scss');

const themeColors = JSON.parse(await readFile(sourcePath, 'utf8'));
const lines = [
  '// Generated from src/styles/theme-colors.json. Do not edit by hand.',
  ...Object.entries(themeColors).map(([name, value]) => `$${name}: ${value};`),
  '',
].join('\n');

await writeFile(targetPath, `${lines}\n`);
