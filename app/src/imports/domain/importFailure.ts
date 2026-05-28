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
