import { describe, expect, it, vi } from 'vitest';
import { LocalAmountVisibilityAdapter } from './LocalAmountVisibilityAdapter';

function createStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

describe('LocalAmountVisibilityAdapter', () => {
  it('defaults a missing preference to visible', async () => {
    await expect(new LocalAmountVisibilityAdapter(createStorage()).load()).resolves.toBe('visible');
  });

  it.each(['visible', 'hidden'] as const)('loads %s', async (value) => {
    await expect(new LocalAmountVisibilityAdapter(createStorage({ 'gonezo.amountVisibility.v1': value })).load()).resolves.toBe(value);
  });

  it('treats an invalid stored value as hidden', async () => {
    await expect(new LocalAmountVisibilityAdapter(createStorage({ 'gonezo.amountVisibility.v1': 'invalid' })).load()).resolves.toBe('hidden');
  });

  it('propagates storage read failures', async () => {
    const storage = createStorage();
    storage.getItem.mockImplementation(() => { throw new Error('read failed'); });
    await expect(new LocalAmountVisibilityAdapter(storage).load()).rejects.toThrow('read failed');
  });

  it.each(['visible', 'hidden'] as const)('stores only %s', async (value) => {
    const storage = createStorage();
    await new LocalAmountVisibilityAdapter(storage).save(value);
    expect(storage.setItem).toHaveBeenCalledWith('gonezo.amountVisibility.v1', value);
  });

  it('propagates storage write failures', async () => {
    const storage = createStorage();
    storage.setItem.mockImplementation(() => { throw new Error('write failed'); });
    await expect(new LocalAmountVisibilityAdapter(storage).save('hidden')).rejects.toThrow('write failed');
  });
});
