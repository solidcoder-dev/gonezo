import { ExactDecimal } from '../../shared/domain/exactDecimal';
import type { MacroMerchantCode } from './macroMerchantCode';

export type MerchantFactSource = 'POSTED' | 'EXPECTED' | 'SCHEDULED';
export type MerchantFactKind = 'INCOME' | 'EXPENSE';

export type MerchantFact = Readonly<{
  id: string;
  occurredAt: string;
  source: MerchantFactSource;
  kind: MerchantFactKind;
  currency: string;
  amount: string;
  merchant: MacroMerchantCode;
}>;

export function createMerchantFact(input: MerchantFact): MerchantFact {
  if (!input.id.trim()) throw new Error('Merchant fact id is required');
  if (!Number.isFinite(Date.parse(input.occurredAt)) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(input.occurredAt)) {
    throw new Error('Merchant fact occurredAt must be a timezone-qualified instant');
  }
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error('Merchant fact currency must be an uppercase three-letter code');
  if (ExactDecimal.from(input.amount).compare(ExactDecimal.from('0')) < 0) throw new Error('Merchant fact amount must be non-negative');

  return Object.freeze({
    id: input.id,
    occurredAt: input.occurredAt,
    source: input.source,
    kind: input.kind,
    currency: input.currency,
    amount: input.amount,
    merchant: input.merchant,
  });
}
