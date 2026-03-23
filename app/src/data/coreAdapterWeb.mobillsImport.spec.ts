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
      },
    });

    expect(result.totalRows).toBe(2);
    expect(result.importedCount).toBe(2);
    expect(result.failedCount).toBe(0);

    const accounts = await core.ledgerListAccounts();
    expect(accounts.items.some((account) => account.name === 'Billetera')).toBe(true);
  });

  it('skips duplicates by default on repeated import', async () => {
    const core = new CoreAdapterWeb();
    const csv = [
      '"Date";"Description";"Value";"Account";"Category";"Subcategory";"Tags"',
      '"31/07/2018";"Lunch";"-8.30";"Billetera";"Food";"";"trip"',
      '"31/07/2018";"Salary";"1000.00";"Billetera";"Salary";"";"work"',
    ].join('\r\n');

    const first = await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
      },
    });

    const second = await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
      },
    });

    expect(first.importedCount).toBe(2);
    expect(second.importedCount).toBe(0);
    expect(second.skippedCount).toBe(2);
    expect(second.failedCount).toBe(0);
    expect(second.rows.map((row) => row.status)).toEqual(['skipped', 'skipped']);
    expect(second.rows.every((row) => row.errorCode === 'DUPLICATE_TRANSACTION')).toBe(true);
  });

  it('fails duplicates when duplicate policy is fail', async () => {
    const core = new CoreAdapterWeb();
    const csv = [
      '"Date";"Description";"Value";"Account";"Category";"Subcategory";"Tags"',
      '"31/07/2018";"Lunch";"-8.30";"Billetera";"Food";"";"trip"',
    ].join('\r\n');

    await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
      },
    });

    const second = await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        duplicatePolicy: 'fail',
      },
    });

    expect(second.importedCount).toBe(0);
    expect(second.skippedCount).toBe(0);
    expect(second.failedCount).toBe(1);
    expect(second.rows[0]?.status).toBe('failed');
    expect(second.rows[0]?.errorCode).toBe('DUPLICATE_TRANSACTION');
  });

  it('imports duplicates when duplicate policy is import_anyway', async () => {
    const core = new CoreAdapterWeb();
    const csv = [
      '"Date";"Description";"Value";"Account";"Category";"Subcategory";"Tags"',
      '"31/07/2018";"Lunch";"-8.30";"Billetera";"Food";"";"trip"',
    ].join('\r\n');

    await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
      },
    });

    const second = await core.mobillsImport({
      fileBase64: toUtf16Base64(csv),
      policy: {
        createMissingAccounts: true,
        createMissingCategories: true,
        createMissingTags: true,
        duplicatePolicy: 'import_anyway',
      },
    });

    expect(second.importedCount).toBe(1);
    expect(second.failedCount).toBe(0);
    expect(second.skippedCount).toBe(0);
  });
});
