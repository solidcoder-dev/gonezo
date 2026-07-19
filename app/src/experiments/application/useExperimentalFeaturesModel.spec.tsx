import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EXPERIMENTAL_FEATURES, type ExperimentalFeaturesPort } from './experimentalFeatures.port';
import { useExperimentalFeaturesModel } from './useExperimentalFeaturesModel';

function createPort(overrides: Partial<ExperimentalFeaturesPort> = {}): ExperimentalFeaturesPort {
  return {
    load: vi.fn(async () => ({ voiceMovementEntryEnabled: false })),
    setFeature: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('useExperimentalFeaturesModel', () => {
  it('defaults the experiment to disabled', async () => {
    const port = createPort();
    const { result } = renderHook(() => useExperimentalFeaturesModel({ port }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.features.voiceMovementEntryEnabled).toBe(false);
  });

  it('loads a persisted enabled preference', async () => {
    const port = createPort({
      load: vi.fn(async () => ({ voiceMovementEntryEnabled: true })),
    });
    const { result } = renderHook(() => useExperimentalFeaturesModel({ port }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.features.voiceMovementEntryEnabled).toBe(true);
  });

  it('loads a persisted disabled preference', async () => {
    const port = createPort({
      load: vi.fn(async () => ({ voiceMovementEntryEnabled: false })),
    });
    const { result } = renderHook(() => useExperimentalFeaturesModel({ port }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));
    expect(result.current.state.features.voiceMovementEntryEnabled).toBe(false);
  });

  it('optimistically updates the toggle and rolls back when persistence fails', async () => {
    const onError = vi.fn();
    let rejectSave!: (reason?: unknown) => void;
    const saveDeferred = new Promise<void>((_, reject) => {
      rejectSave = reject;
    });
    const port = createPort({
      load: vi.fn(async () => ({ voiceMovementEntryEnabled: false })),
      setFeature: vi.fn(async () => saveDeferred),
    });
    const { result } = renderHook(() => useExperimentalFeaturesModel({ port, events: { onError } }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      void result.current.commands.setVoiceMovementEntryEnabled(true);
    });

    expect(result.current.state.features.voiceMovementEntryEnabled).toBe(true);

    rejectSave(new Error('disk full'));
    await waitFor(() => expect(result.current.state.saving).toBe(false));
    expect(result.current.state.features.voiceMovementEntryEnabled).toBe(false);
    expect(onError).toHaveBeenCalledWith({ message: 'Unable to save experimental preference.' });
  });

  it('persists enabling and disabling through the feature port', async () => {
    const setFeature = vi.fn(async () => undefined);
    const port = createPort({
      load: vi.fn(async () => ({ voiceMovementEntryEnabled: false })),
      setFeature,
    });
    const { result } = renderHook(() => useExperimentalFeaturesModel({ port }));

    await waitFor(() => expect(result.current.state.loading).toBe(false));

    await act(async () => {
      await result.current.commands.setVoiceMovementEntryEnabled(true);
      await result.current.commands.setVoiceMovementEntryEnabled(false);
    });

    expect(setFeature).toHaveBeenNthCalledWith(1, {
      feature: EXPERIMENTAL_FEATURES.voiceMovementEntry,
      enabled: true,
    });
    expect(setFeature).toHaveBeenNthCalledWith(2, {
      feature: EXPERIMENTAL_FEATURES.voiceMovementEntry,
      enabled: false,
    });
  });
});
