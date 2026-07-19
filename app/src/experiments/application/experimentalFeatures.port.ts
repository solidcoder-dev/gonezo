import type { ExperimentalFeature, ExperimentalFeatures } from './experimentalFeatures.types';

export type ExperimentalFeaturesPort = Readonly<{
  load(): Promise<ExperimentalFeatures>;
  setFeature(input: Readonly<{
    feature: ExperimentalFeature;
    enabled: boolean;
  }>): Promise<void>;
}>;

export type { ExperimentalFeature, ExperimentalFeatures } from './experimentalFeatures.types';
export { DEFAULT_EXPERIMENTAL_FEATURES, EXPERIMENTAL_FEATURES } from './experimentalFeatures.types';
