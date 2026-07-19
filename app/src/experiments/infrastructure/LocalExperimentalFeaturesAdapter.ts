import {
  DEFAULT_EXPERIMENTAL_FEATURES,
  EXPERIMENTAL_FEATURES,
  type ExperimentalFeature,
  type ExperimentalFeatures,
  type ExperimentalFeaturesPort,
} from '../application/experimentalFeatures.port';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const STORAGE_KEY = 'gonezo.experimentalFeatures.v1';

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
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

function normalizeStoredFeatures(input: unknown): ExperimentalFeatures {
  if (!input || typeof input !== 'object') {
    return DEFAULT_EXPERIMENTAL_FEATURES;
  }

  const candidate = input as Record<string, unknown>;
  return {
    voiceMovementEntryEnabled: candidate.voiceMovementEntryEnabled === true,
  };
}

function readStoredFeatures(storage: StorageLike): ExperimentalFeatures {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_EXPERIMENTAL_FEATURES;
  }

  try {
    return normalizeStoredFeatures(JSON.parse(raw));
  } catch {
    return DEFAULT_EXPERIMENTAL_FEATURES;
  }
}

export class LocalExperimentalFeaturesAdapter implements ExperimentalFeaturesPort {
  private readonly storage: StorageLike;

  constructor(storage?: StorageLike) {
    this.storage = resolveStorage(storage);
  }

  async load(): Promise<ExperimentalFeatures> {
    return readStoredFeatures(this.storage);
  }

  async setFeature(input: Readonly<{
    feature: ExperimentalFeature;
    enabled: boolean;
  }>): Promise<void> {
    if (input.feature !== EXPERIMENTAL_FEATURES.voiceMovementEntry) {
      return;
    }

    const features = readStoredFeatures(this.storage);
    const nextFeatures: ExperimentalFeatures = {
      ...features,
      voiceMovementEntryEnabled: input.enabled,
    };
    this.storage.setItem(STORAGE_KEY, JSON.stringify(nextFeatures));
  }
}
