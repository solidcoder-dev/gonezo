import { describe, expect, it } from 'vitest';
import { CoreAdapterWeb } from './coreAdapterWeb';

function toUtf16Base64(text: string): string {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    bytes.push(code & 0xff);
    bytes.push((code >> 8) & 0xff);
  }
  return btoa(String.fromCharCode(...bytes));
}

describe('CoreAdapterWeb mobillsImport', () => {
  it('imports csv content with quoted commas', async () => {
    const core = new CoreAdapterWeb();
    const csv = [
      'date,account,value,currency,description,merchant,category,subcategory,tags',
      '2026-03-20,"Cash, Wallet",-12.50,EUR,"Lunch, team",Cafe,Food,Eating Out,"trip,london,Trip"',
      '2026-03-21,Cash Wallet,1500,EUR,Salary,Employer,Salary,Monthly,"work;salary"',
    ].join('\r\n');

    const result = await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        defaultAccountType: 'cash',
      },
    });

    expect(result.totalRows).toBe(2);
    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.rows.map((row) => row.status)).toEqual(['imported', 'imported']);

    const accounts = await core.ledgerListAccounts();
    expect(accounts.items.some((account) => account.name === 'Cash, Wallet')).toBe(true);
  });

  it('imports semicolon-separated csv with quoted headers and values', async () => {
    const core = new CoreAdapterWeb();
    const csv = [
      '"Date";"Description";"Value";"Account";"Category";"Subcategory";"Tags"',
      '"31/07/2018";"Limpiar coche";"-1.10";"Billetera";"Transporte";"";""',
      '"31/07/2018";"Pollo y papas";"-8.30";"Billetera";"Alimentación";"";"trip;london"',
    ].join('\r\n');

    const result = await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        defaultAccountType: 'cash',
      },
    });

    expect(result.totalRows).toBe(2);
    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);

    const accounts = await core.ledgerListAccounts();
    expect(accounts.items.some((account) => account.name === 'Billetera')).toBe(true);
  });
});
