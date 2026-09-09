import type { AmountVisibility } from '../../shared/domain/amountVisibility';
import type { AmountVisibilityPort } from '../../workspace/application/amountVisibility.port';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'gonezo.amountVisibility.v1';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) {
    return storage;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }

  return createMemoryStorage();
}

function parseAmountVisibility(raw: string | null): AmountVisibility {
  if (raw === null) {
    return 'visible';
  }
  return raw === 'hidden' ? 'hidden' : raw === 'visible' ? 'visible' : 'hidden';
}

export class LocalAmountVisibilityAdapter implements AmountVisibilityPort {
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = resolveStorage(storage);
  }

  async load(): Promise<AmountVisibility> {
    return parseAmountVisibility(this.storage.getItem(STORAGE_KEY));
  }

  async save(value: AmountVisibility): Promise<void> {
    if (value !== 'visible' && value !== 'hidden') {
      throw new Error('Invalid amount visibility');
    }
    this.storage.setItem(STORAGE_KEY, value);
  }
}
