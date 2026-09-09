import type { AmountVisibility } from '../../shared/domain/amountVisibility';

export type AmountVisibilityPort = Readonly<{
  load(): Promise<AmountVisibility>;
  save(value: AmountVisibility): Promise<void>;
}>;
