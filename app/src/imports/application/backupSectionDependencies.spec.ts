import { describe, expect, it } from 'vitest';
import { resolveBackupSectionOrder } from './backupSectionDependencies';

describe('backup section dependencies', () => {
  it('resolves each section after its declared dependencies', () => {
    const order = resolveBackupSectionOrder();

    expect(order.indexOf('taxonomy')).toBeLessThan(order.indexOf('ledger'));
    expect(order.indexOf('ledger')).toBeLessThan(order.indexOf('expected'));
    expect(order.indexOf('expected')).toBeLessThan(order.indexOf('sharing'));
  });

  it('rejects dependency cycles', () => {
    expect(() => resolveBackupSectionOrder({
      taxonomy: ['ledger'], ledger: ['taxonomy'], recurrence: [], expected: [], sharing: [], analytics: [], preferences: [],
    })).toThrow('dependency cycle');
  });
});
