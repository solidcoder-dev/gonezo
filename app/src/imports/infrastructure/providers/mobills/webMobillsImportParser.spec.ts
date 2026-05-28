import { describe, expect, it } from 'vitest';
import {
  buildMobillsFingerprint,
  decodeMobillsImportBase64,
  detectDelimitedHeaderDelimiter,
  findMobillsHeaderIndex,
  parseMobillsDate,
  parseMobillsTransferDescriptor,
  parseMobillsValue,
  splitDelimitedLine,
} from './webMobillsImportParser';

function toUtf16Base64(text: string): string {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    bytes.push(code & 0xff);
    bytes.push((code >> 8) & 0xff);
  }
  return btoa(String.fromCharCode(...bytes));
}

describe('webMobillsImportParser', () => {
  it('decodes UTF-16 import files and splits quoted delimited rows', () => {
    const header = '"Fecha";"Descripción";"Valor";"Cuenta"';
    const row = '"20/03/2026";"Lunch, team";"-1.234,50 €";"Cash; Wallet"';
    const text = [header, row].join('\r\n');
    const decoded = decodeMobillsImportBase64(toUtf16Base64(text));
    const delimiter = detectDelimitedHeaderDelimiter(header);

    expect(decoded).toBe(text);
    expect(delimiter).toBe(';');
    expect(splitDelimitedLine(row, delimiter)).toEqual([
      '20/03/2026',
      'Lunch, team',
      '-1.234,50 €',
      'Cash; Wallet',
    ]);
  });

  it('parses Mobills fields without depending on the web adapter state', () => {
    const headers = ['Fecha', 'Cuenta', 'Valor'];

    expect(findMobillsHeaderIndex(headers, ['date', 'fecha'])).toBe(0);
    expect(parseMobillsValue('-1.234,50 €')).toBe(-1234.5);
    expect(parseMobillsDate('20/03/2026')).toBe('2026-03-20T12:00:00.000Z');
    expect(parseMobillsTransferDescriptor({
      description: 'Transfer BBVA Trade Republic',
      rowAccountName: 'BBVA',
      rawValue: -100,
    })).toEqual({
      outAccountName: 'BBVA',
      inAccountName: 'Trade Republic',
    });
    expect(parseMobillsTransferDescriptor({
      description: 'Transfer BBVA Trade Republic',
      rowAccountName: 'Trade Republic',
      rawValue: 100,
    })).toEqual({
      outAccountName: 'BBVA',
      inAccountName: 'Trade Republic',
    });
    expect(buildMobillsFingerprint({
      accountName: ' BBVA ',
      occurredAt: '2026-03-20T12:00:00.000Z',
      rawValue: -100,
      currency: 'eur',
      description: ' Transfer ',
      merchant: ' STORE ',
    })).toBe('mobills|bbva|2026-03-20T12:00:00.000Z|-100|EUR|transfer|store');
  });
});
