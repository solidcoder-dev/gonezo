import { describe, expect, it } from 'vitest';
import { EXPERIMENTAL_FEATURES, type ExperimentalFeature } from '../application/experimentalFeatures.port';
import { LocalExperimentalFeaturesAdapter } from './LocalExperimentalFeaturesAdapter';

function createStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    store,
  };
}

describe('LocalExperimentalFeaturesAdapter', () => {
  it('defaults the voice movement entry experiment to disabled', async () => {
    const adapter = new LocalExperimentalFeaturesAdapter(createStorage());

    await expect(adapter.load()).resolves.toEqual({
      voiceMovementEntryEnabled: false,
    });
  });

  it('loads a persisted enabled preference', async () => {
    const adapter = new LocalExperimentalFeaturesAdapter(
      createStorage({
        'gonezo.experimentalFeatures.v1': JSON.stringify({ voiceMovementEntryEnabled: true }),
      }),
    );

    await expect(adapter.load()).resolves.toEqual({
      voiceMovementEntryEnabled: true,
    });
  });

  it('loads a persisted disabled preference', async () => {
    const adapter = new LocalExperimentalFeaturesAdapter(
      createStorage({
        'gonezo.experimentalFeatures.v1': JSON.stringify({ voiceMovementEntryEnabled: false }),
      }),
    );

    await expect(adapter.load()).resolves.toEqual({
      voiceMovementEntryEnabled: false,
    });
  });

  it('falls back safely for malformed persisted data', async () => {
    const adapter = new LocalExperimentalFeaturesAdapter(
      createStorage({
        'gonezo.experimentalFeatures.v1': '{not-json',
      }),
    );

    await expect(adapter.load()).resolves.toEqual({
      voiceMovementEntryEnabled: false,
    });
  });

  it.each<[ExperimentalFeature, boolean]>([
    [EXPERIMENTAL_FEATURES.voiceMovementEntry, true],
    [EXPERIMENTAL_FEATURES.voiceMovementEntry, false],
  ])('persists %s=%s', async (feature, enabled) => {
    const storage = createStorage();
    const adapter = new LocalExperimentalFeaturesAdapter(storage);

    await adapter.setFeature({ feature, enabled });

    expect(storage.store.get('gonezo.experimentalFeatures.v1')).toBe(
      JSON.stringify({ voiceMovementEntryEnabled: enabled }),
    );
  });
});
