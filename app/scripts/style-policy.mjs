import { extname, relative, resolve } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

export const LEGACY_PRIMITIVES = Object.freeze({
  'text-button': 'gz-text-button',
  'icon-button': 'gz-icon-button',
  'section-gap': 'gz-section-gap',
  hint: 'gz-hint',
  'chip-row': 'gz-chip-row',
  'composer-more-options': 'gz-composer-more-options',
});
export const PROHIBITED_GLOBAL_CLASSES = Object.freeze([
  ...Object.keys(LEGACY_PRIMITIVES),
  'inline-header', 'toast', 'stack', 'card',
]);
const SOURCE_EXTENSIONS = new Set(['.css', '.scss', '.ts', '.tsx', '.jsx', '.js']);
const legacyPrimitivePattern = new RegExp(`(?:^|[^A-Za-z0-9_-])(${Object.keys(LEGACY_PRIMITIVES).map((name) => name.replaceAll('-', '\\-')).join('|')})(?=$|[^A-Za-z0-9_-])`, 'g');

function lineAndColumn(source, index) {
  const before = source.slice(0, index);
  return {
    line: before.split('\n').length,
    column: index - before.lastIndexOf('\n'),
  };
}

/** Finds legacy primitive names in actual class-like strings and CSS selectors.
 * Scanning strings also covers clsx/classnames, arrays, conditional objects and
 * template strings without treating object properties such as `config.hint` as classes.
 */
export function findLegacyPrimitiveUsages(source, fileName = '') {
  const matches = [];
  const scan = (value, offset) => {
    for (const match of value.matchAll(legacyPrimitivePattern)) {
      const name = match[1];
      const index = offset + match.index + (match[0].length - name.length);
      const position = lineAndColumn(source, index);
      matches.push({ name, replacement: LEGACY_PRIMITIVES[name], index, ...position });
    }
  };

  const stringPattern = /(['"`])(?:\\.|(?!\1)[^\\])*\1/g;
  for (const match of source.matchAll(stringPattern)) scan(match[0].slice(1, -1), match.index + 1);
  if (/\.css$|\.scss$/.test(fileName)) {
    for (const match of source.matchAll(new RegExp(`\\.(${Object.keys(LEGACY_PRIMITIVES).map((name) => name.replaceAll('-', '\\-')).join('|')})(?=[.{,:\\s]|$)`, 'g'))) {
      const position = lineAndColumn(source, match.index + 1);
      matches.push({ name: match[1], replacement: LEGACY_PRIMITIVES[match[1]], index: match.index + 1, ...position });
    }
  }
  return matches.sort((left, right) => left.index - right.index);
}

export async function collectStyleSources(root) {
  const files = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(path);
    }
  }
  await collect(root);
  return Promise.all(files.map(async (path) => ({ path, relativePath: relative(root, path), text: await readFile(path, 'utf8') })));
}

export function findProhibitedClassUsages(source) {
  const matches = [];
  const classAttribute = /(?:className|class|[A-Za-z]+ClassName)\s*=\s*\{?(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  for (const match of source.matchAll(classAttribute)) {
    const value = match.slice(1).find(Boolean) ?? '';
    for (const name of PROHIBITED_GLOBAL_CLASSES) {
      if (new RegExp(`(?:^|\\s)${name}(?=\\s|$)`).test(value)) matches.push(name);
    }
  }
  return [...new Set(matches)];
}

export function findInvalidVarUsages(source) {
  return [...source.matchAll(/var\((?!\s*--)[^)]*\)/g)].map((match) => match[0]);
}
