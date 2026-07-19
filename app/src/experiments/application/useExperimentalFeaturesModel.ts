import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_EXPERIMENTAL_FEATURES,
  EXPERIMENTAL_FEATURES,
  type ExperimentalFeatures,
  type ExperimentalFeaturesPort,
} from './experimentalFeatures.port';

export type ExperimentalFeaturesModelEvents = Readonly<{
  onError?: (error: { message: string }) => void;
}>;

export type ExperimentalFeaturesModel = Readonly<{
  state: Readonly<{
    loading: boolean;
    saving: boolean;
    features: ExperimentalFeatures;
  }>;
  commands: Readonly<{
    setVoiceMovementEntryEnabled(enabled: boolean): Promise<void>;
  }>;
}>;

export type UseExperimentalFeaturesModelInput = Readonly<{
  port: ExperimentalFeaturesPort;
  events?: ExperimentalFeaturesModelEvents;
}>;

export function useExperimentalFeaturesModel({ port, events }: UseExperimentalFeaturesModelInput): ExperimentalFeaturesModel {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [features, setFeatures] = useState<ExperimentalFeatures>(DEFAULT_EXPERIMENTAL_FEATURES);
  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);
  const featuresRef = useRef(features);
  const eventsRef = useRef(events);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    featuresRef.current = features;
  }, [features]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    void (async () => {
      try {
        const loaded = await port.load();
        if (cancelled || requestIdRef.current !== requestId || !mountedRef.current) {
          return;
        }
        setFeatures({
          voiceMovementEntryEnabled: loaded.voiceMovementEntryEnabled === true,
        });
      } catch {
        if (!cancelled && requestIdRef.current === requestId && mountedRef.current) {
          setFeatures(DEFAULT_EXPERIMENTAL_FEATURES);
          eventsRef.current?.onError?.({
            message: 'Unable to load experimental preference.',
          });
        }
      } finally {
        if (!cancelled && requestIdRef.current === requestId && mountedRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [port]);

  const setVoiceMovementEntryEnabled = useCallback(async (enabled: boolean) => {
    if (saving) {
      return;
    }

    const previousFeatures = featuresRef.current;
    const nextFeatures = {
      ...previousFeatures,
      voiceMovementEntryEnabled: enabled,
    };

    setSaving(true);
    featuresRef.current = nextFeatures;
    setFeatures(nextFeatures);

    try {
      await port.setFeature({
        feature: EXPERIMENTAL_FEATURES.voiceMovementEntry,
        enabled,
      });
    } catch {
      if (mountedRef.current) {
        featuresRef.current = previousFeatures;
        setFeatures(previousFeatures);
      }
      eventsRef.current?.onError?.({
        message: 'Unable to save experimental preference.',
      });
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [port, saving]);

  return {
    state: {
      loading,
      saving,
      features,
    },
    commands: {
      setVoiceMovementEntryEnabled,
    },
  };
}
