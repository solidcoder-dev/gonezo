export const EXPERIMENTAL_FEATURES = {
  voiceMovementEntry: 'voiceMovementEntry',
} as const;

export type ExperimentalFeature = (typeof EXPERIMENTAL_FEATURES)[keyof typeof EXPERIMENTAL_FEATURES];

export type ExperimentalFeatures = Readonly<{
  voiceMovementEntryEnabled: boolean;
}>;

export const DEFAULT_EXPERIMENTAL_FEATURES: ExperimentalFeatures = {
  voiceMovementEntryEnabled: false,
};
