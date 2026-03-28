import type { MobillsImportRowResult } from './mobillsImport.types';

export type ImportRowStatus = 'imported' | 'failed' | 'skipped';

export type ImportRowResult = MobillsImportRowResult;

export type ImportFailureSummaryItem = {
  code: string;
  label: string;
  count: number;
};

export function normalizeImportErrorCode(rawCode?: string): string {
  const code = (rawCode ?? '').trim().toUpperCase();
  if (!code) {
    return 'IMPORT_FAILED';
  }
  if (code.startsWith('ACCOUNT_NOT_FOUND')) {
    return 'ACCOUNT_NOT_FOUND';
  }
  if (code.startsWith('UNSUPPORTED_CURRENCY')) {
    return 'UNSUPPORTED_CURRENCY';
  }
  if (code.startsWith('CATEGORY_AUTOCREATE_DISABLED')) {
    return 'CATEGORY_AUTOCREATE_DISABLED';
  }
  if (code.startsWith('TAG_AUTOCREATE_DISABLED')) {
    return 'TAG_AUTOCREATE_DISABLED';
  }
  return code;
}

function importErrorLabel(code: string): string {
  switch (code) {
    case 'ACCOUNT_NOT_FOUND':
      return 'Missing account';
    case 'UNSUPPORTED_CURRENCY':
      return 'Unsupported currency';
    case 'INVALID_DATE':
      return 'Invalid date';
    case 'INVALID_VALUE':
      return 'Invalid value';
    case 'ZERO_VALUE':
      return 'Zero amount';
    case 'MISSING_ACCOUNT':
      return 'Missing account field';
    case 'CATEGORY_AUTOCREATE_DISABLED':
      return 'Category missing (auto-create off)';
    case 'TAG_AUTOCREATE_DISABLED':
      return 'Tag missing (auto-create off)';
    case 'CATEGORY_NOT_FOUND':
      return 'Category not found';
    case 'CATEGORY_ARCHIVED':
      return 'Category archived';
    case 'CATEGORY_APPLIES_TO_MISMATCH':
      return 'Category type mismatch';
    case 'TAG_ARCHIVED':
      return 'Tag archived';
    default:
      return code
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
  }
}

export function summarizeImportFailures(rows: ImportRowResult[]): ImportFailureSummaryItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== 'failed') {
      continue;
    }
    const normalizedCode = normalizeImportErrorCode(row.errorCode);
    counts.set(normalizedCode, (counts.get(normalizedCode) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([code, count]) => ({
      code,
      label: importErrorLabel(code),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
