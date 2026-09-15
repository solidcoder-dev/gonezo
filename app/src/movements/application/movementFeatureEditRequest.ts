import type { MovementDetailViewModel } from './movementDetailView.types';

export type MovementFeatureEditRequest = {
  feature: 'items' | 'sharing';
  movement: MovementDetailViewModel;
};
