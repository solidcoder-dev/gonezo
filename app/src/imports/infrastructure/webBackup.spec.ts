import { describe, expect, it, vi } from 'vitest';
import {
  collectWebMovementsBackupExport,
  summarizeWebMovementsBackupExport,
  webMovementsBackupFileName,
} from './webBackup';

describe('webBackup', () => {
  it('collects posted movements from every account page', async () => {
    const source = {
      ledgerListAccounts: vi.fn().mockResolvedValue({
        items: [
          { id: 'account-1', name: 'Wallet', type: 'cash', currency: 'EUR', status: 'active' },
          { id: 'account-2', name: 'Bank', type: 'cash', currency: 'EUR', status: 'active' },
        ],
      }),
      taxonomyListCategories: vi.fn().mockResolvedValue({ items: [] }),
      taxonomyListTags: vi.fn().mockResolvedValue({ items: [] }),
      ledgerListTransactions: vi.fn()
        .mockResolvedValueOnce({
          content: [{
            id: 'tx-1',
            accountId: 'account-1',
            type: 'expense',
            status: 'posted',
            occurredAt: '2026-05-01T00:00:00.000Z',
            amount: '10.00',
            currency: 'EUR',
            items: [],
            tags: [{ id: 'tag-food', name: 'Food' }],
          }],
          hasNext: true,
        })
        .mockResolvedValueOnce({
          content: [{
            id: 'tx-2',
            accountId: 'account-1',
            type: 'income',
            status: 'posted',
            occurredAt: '2026-05-02T00:00:00.000Z',
            amount: '20.00',
            currency: 'EUR',
            items: [],
          }],
          hasNext: false,
        })
        .mockResolvedValueOnce({
          content: [],
          hasNext: false,
        }),
    };

    const result = await collectWebMovementsBackupExport(source, '2026-05-26T10:11:12.123Z');

    expect(source.ledgerListTransactions).toHaveBeenCalledTimes(3);
    expect(result.postedMovements).toEqual([
      expect.objectContaining({ id: 'tx-1', tagIds: ['tag-food'] }),
      expect.objectContaining({ id: 'tx-2', tagIds: [] }),
    ]);
    expect(result.exportedAt).toBe('2026-05-26T10:11:12.123Z');
  });

  it('builds the public backup result from export metadata', () => {
    const fileName = webMovementsBackupFileName('2026-05-26T10:11:12.123Z');

    expect(fileName).toBe('gonezo-backup-2026-05-26T10-11-12Z.json');
    expect(summarizeWebMovementsBackupExport({
      schemaVersion: 2,
      exportedAt: '2026-05-26T10:11:12.123Z',
      accounts: [{ id: 'account-1', name: 'Wallet', type: 'cash', currency: 'EUR', status: 'active' }],
      categories: [],
      tags: [],
      postedMovements: [],
    }, fileName)).toMatchObject({
      fileName,
      exportedAt: '2026-05-26T10:11:12.123Z',
      accountCount: 1,
      postedMovementCount: 0,
    });
  });
});
