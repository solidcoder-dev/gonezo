import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type CategoryMoneyAmount = Readonly<{ kind: 'MONEY'; value: ExactDecimal; currency: string }>;

export function createCategoryMoneyAmount(value: ExactDecimal | string, currency: string): CategoryMoneyAmount {
  return Object.freeze({ kind: 'MONEY', value: typeof value === 'string' ? ExactDecimal.from(value) : value, currency });
}
