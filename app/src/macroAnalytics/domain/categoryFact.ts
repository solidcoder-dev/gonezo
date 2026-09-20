import type { FinancialFactSource } from './financialFact';
import type { MacroCategoryCode } from './macroCategoryCode';

export type CategoryFact = Readonly<{
  id: string;
  occurredAt: string;
  source: FinancialFactSource;
  kind: 'INCOME' | 'EXPENSE';
  currency: string;
  amount: string;
  category: MacroCategoryCode;
}>;
