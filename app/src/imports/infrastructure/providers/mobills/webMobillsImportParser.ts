export type MobillsImportDelimiter = '\t' | ',' | ';';

export type MobillsTransferDescriptor = {
  outAccountName: string;
  inAccountName: string;
};

export function decodeMobillsImportBase64(fileBase64: string): string {
  let binary: string;
  try {
    binary = globalThis.atob(fileBase64);
  } catch {
    throw new Error('Invalid import file payload');
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const utf16 = new TextDecoder('utf-16').decode(bytes).replace(/\uFEFF/g, '');
  if (utf16.includes('\t') || utf16.includes('\n')) {
    return utf16;
  }
  return new TextDecoder().decode(bytes).replace(/\uFEFF/g, '');
}

export function detectDelimitedHeaderDelimiter(headerLine: string): MobillsImportDelimiter {
  const candidates: Array<{ delimiter: MobillsImportDelimiter; count: number }> = [
    { delimiter: '\t', count: countDelimiterOutsideQuotes(headerLine, '\t') },
    { delimiter: ';', count: countDelimiterOutsideQuotes(headerLine, ';') },
    { delimiter: ',', count: countDelimiterOutsideQuotes(headerLine, ',') },
  ];

  let best = candidates[0];
  for (const candidate of candidates) {
    if (candidate.count > best.count) {
      best = candidate;
    }
  }

  return best.delimiter;
}

export function splitDelimitedLine(line: string, delimiter: MobillsImportDelimiter): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const escapedQuote = inQuotes && line[index + 1] === '"';
      if (escapedQuote) {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

export function findMobillsHeaderIndex(headers: string[], aliases: string[]): number {
  const normalizedAliases = aliases.map(normalizeMobillsHeaderName);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeMobillsHeaderName(header)));
}

export function parseMobillsValue(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/\u00A0/g, '')
    .replace(/[€$£]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseMobillsDate(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) {
    return null;
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const dateParts = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!dateParts) {
    return null;
  }

  const day = Number(dateParts[1]);
  const month = Number(dateParts[2]) - 1;
  const year = Number(dateParts[3]);
  const parsed = new Date(Date.UTC(year, month, day, 12, 0, 0));
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export function parseMobillsTransferDescriptor(input: {
  description?: string;
  rowAccountName: string;
  rawValue: number;
}): MobillsTransferDescriptor | null {
  const description = input.description?.trim();
  if (!description || !description.toLowerCase().startsWith('transfer ')) {
    return null;
  }
  const body = description.slice('transfer '.length).trim();
  if (!body) {
    return null;
  }
  const rowAccountName = input.rowAccountName.trim();
  if (!rowAccountName) {
    return null;
  }

  if (input.rawValue < 0) {
    const fromPrefix = new RegExp(`^${escapeRegExp(rowAccountName)}\\s+`, 'i');
    if (!fromPrefix.test(body)) {
      return null;
    }
    const inAccountName = body.replace(fromPrefix, '').trim();
    if (!inAccountName) {
      return null;
    }
    return {
      outAccountName: rowAccountName,
      inAccountName,
    };
  }

  if (input.rawValue > 0) {
    const toSuffix = new RegExp(`\\s+${escapeRegExp(rowAccountName)}$`, 'i');
    if (!toSuffix.test(body)) {
      return null;
    }
    const outAccountName = body.replace(toSuffix, '').trim();
    if (!outAccountName) {
      return null;
    }
    return {
      outAccountName,
      inAccountName: rowAccountName,
    };
  }

  return null;
}

export function buildMobillsFingerprint(input: {
  accountName: string;
  occurredAt: string;
  rawValue: number;
  currency: string;
  description?: string;
  merchant?: string;
}): string {
  const accountName = input.accountName.trim().toLowerCase();
  const currency = input.currency.trim().toUpperCase();
  const occurredAt = input.occurredAt.trim();
  const signedValue = String(input.rawValue);
  const description = (input.description ?? '').trim().toLowerCase();
  const merchant = (input.merchant ?? '').trim().toLowerCase();
  return ['mobills', accountName, occurredAt, signedValue, currency, description, merchant].join('|');
}

function countDelimiterOutsideQuotes(line: string, delimiter: MobillsImportDelimiter): number {
  let inQuotes = false;
  let count = 0;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      const escapedQuote = inQuotes && line[index + 1] === '"';
      if (escapedQuote) {
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
}

function normalizeMobillsHeaderName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
