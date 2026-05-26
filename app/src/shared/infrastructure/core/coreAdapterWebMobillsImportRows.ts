import type { MobillsImportRowResult } from '../../domain/corePort';
import {
  buildMobillsFingerprint,
  decodeMobillsImportBase64,
  detectDelimitedHeaderDelimiter,
  findMobillsHeaderIndex,
  parseMobillsDate,
  parseMobillsTransferDescriptor,
  parseMobillsValue,
  splitDelimitedLine,
  type MobillsImportDelimiter,
  type MobillsTransferDescriptor,
} from './coreAdapterWebMobillsImportParser';

type WebMobillsImportRowBase = {
  sourceLine: number;
};

export type WebMobillsImportReadyRow = WebMobillsImportRowBase & {
  status: 'ready';
  accountName: string;
  occurredAt: string;
  rawValue: number;
  currency: string;
  description?: string;
  merchant?: string;
  categoryName: string;
  tagNames: string[];
  transferDescriptor?: MobillsTransferDescriptor;
  fingerprint: string;
};

export type WebMobillsImportSkippedRow = WebMobillsImportRowBase & {
  status: 'skipped';
  result: MobillsImportRowResult;
};

export type WebMobillsImportFailedRow = WebMobillsImportRowBase & {
  status: 'failed';
  result: MobillsImportRowResult;
};

export type WebMobillsImportParsedRow =
  | WebMobillsImportReadyRow
  | WebMobillsImportSkippedRow
  | WebMobillsImportFailedRow;

export type WebMobillsImportRows = {
  rows: WebMobillsImportParsedRow[];
};

type MobillsImportColumnIndexes = {
  dateIndex: number;
  accountIndex: number;
  valueIndex: number;
  currencyIndex: number;
  descriptionIndex: number;
  merchantIndex: number;
  categoryIndex: number;
  tagsIndex: number;
};

function requiredColumnIndexes(header: string[]): MobillsImportColumnIndexes {
  const dateIndex = findMobillsHeaderIndex(header, ['date', 'fecha']);
  const accountIndex = findMobillsHeaderIndex(header, ['account', 'cuenta']);
  const valueIndex = findMobillsHeaderIndex(header, ['value', 'amount', 'valor', 'importe']);
  if (dateIndex < 0 || accountIndex < 0 || valueIndex < 0) {
    throw new Error('Missing required columns: date/account/value');
  }

  return {
    dateIndex,
    accountIndex,
    valueIndex,
    currencyIndex: findMobillsHeaderIndex(header, ['currency', 'moneda']),
    descriptionIndex: findMobillsHeaderIndex(header, ['description', 'descripcion', 'concept', 'note']),
    merchantIndex: findMobillsHeaderIndex(header, ['merchant', 'counterparty', 'store', 'payee', 'comercio']),
    categoryIndex: findMobillsHeaderIndex(header, ['category', 'categoria']),
    tagsIndex: findMobillsHeaderIndex(header, ['tags', 'etiquetas', 'tag']),
  };
}

function failedRow(
  sourceLine: number,
  errorCode: string,
  errorMessage: string,
): WebMobillsImportFailedRow {
  return {
    sourceLine,
    status: 'failed',
    result: {
      sourceLine,
      status: 'failed',
      errorCode,
      errorMessage,
    },
  };
}

function skippedRow(
  sourceLine: number,
  errorCode: string,
  errorMessage: string,
): WebMobillsImportSkippedRow {
  return {
    sourceLine,
    status: 'skipped',
    result: {
      sourceLine,
      status: 'skipped',
      errorCode,
      errorMessage,
    },
  };
}

function parseTagNames(rawTags: string): string[] {
  return rawTags
    .split(/[|,;]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function parseRow(
  line: string,
  delimiter: MobillsImportDelimiter,
  indexes: MobillsImportColumnIndexes,
  sourceLine: number,
): WebMobillsImportParsedRow {
  const cells = splitDelimitedLine(line, delimiter);
  const accountName = (cells[indexes.accountIndex] ?? '').trim();
  const occurredAt = parseMobillsDate(cells[indexes.dateIndex] ?? '');
  const rawValue = parseMobillsValue(cells[indexes.valueIndex] ?? '');

  if (!accountName) {
    return failedRow(
      sourceLine,
      'MISSING_ACCOUNT',
      `Account is required at line ${sourceLine}`,
    );
  }
  if (!occurredAt) {
    return failedRow(
      sourceLine,
      'INVALID_DATE',
      `Cannot parse date at line ${sourceLine}`,
    );
  }
  if (rawValue == null) {
    return failedRow(
      sourceLine,
      'INVALID_VALUE',
      `Cannot parse value at line ${sourceLine}`,
    );
  }
  if (rawValue === 0) {
    return failedRow(
      sourceLine,
      'ZERO_VALUE',
      `Value cannot be zero at line ${sourceLine}`,
    );
  }

  const currency = (cells[indexes.currencyIndex] ?? '').trim().toUpperCase() || 'EUR';
  const description = (cells[indexes.descriptionIndex] ?? '').trim() || undefined;
  const merchant = (cells[indexes.merchantIndex] ?? '').trim() || undefined;
  const categoryName = (cells[indexes.categoryIndex] ?? '').trim();
  const tagNames = parseTagNames(cells[indexes.tagsIndex] ?? '');
  const transferDescriptor = parseMobillsTransferDescriptor({
    description,
    rowAccountName: accountName,
    rawValue,
  }) ?? undefined;

  if (transferDescriptor && rawValue > 0) {
    return skippedRow(
      sourceLine,
      'TRANSFER_PAIR_ROW',
      `Mirrored transfer row skipped at line ${sourceLine}`,
    );
  }

  const fingerprint = buildMobillsFingerprint({
    accountName,
    occurredAt,
    rawValue,
    currency,
    description,
    merchant,
  });

  return {
    sourceLine,
    status: 'ready',
    accountName,
    occurredAt,
    rawValue,
    currency,
    description,
    merchant,
    categoryName,
    tagNames,
    transferDescriptor,
    fingerprint,
  };
}

export function readWebMobillsImportRows(fileBase64: string): WebMobillsImportRows {
  const content = decodeMobillsImportBase64(fileBase64);
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [] };
  }

  const delimiter = detectDelimitedHeaderDelimiter(lines[0]);
  const header = splitDelimitedLine(lines[0], delimiter);
  const indexes = requiredColumnIndexes(header);
  return {
    rows: lines.slice(1).map((line, index) => parseRow(line, delimiter, indexes, index + 2)),
  };
}
