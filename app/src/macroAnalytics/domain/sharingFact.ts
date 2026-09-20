import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type SharingFact = Readonly<{
  id: string;
  occurredAt: string;
  source: 'POSTED' | 'EXPECTED' | 'SCHEDULED';
  kind: 'INCOME' | 'EXPENSE';
  currency: string;
  fullAmount: string;
  personalAmount: string;
  participantAllocatedAmount: string;
  settlementRequiredAmount: string;
  participantCount: number;
  settlementParticipantCount: number;
}>;

export function createSharingFact(fact: SharingFact): SharingFact {
  if (!fact.id.trim()) throw new Error('Sharing fact id is required');
  if (!Number.isFinite(Date.parse(fact.occurredAt))) throw new Error('Sharing fact occurredAt must be a valid instant');
  if (!/^[A-Z]{3}$/.test(fact.currency)) throw new Error('Sharing fact currency must be an uppercase three-letter code');
  if (!Number.isSafeInteger(fact.participantCount) || fact.participantCount < 0) throw new Error('Sharing fact participantCount must be non-negative');
  if (!Number.isSafeInteger(fact.settlementParticipantCount) || fact.settlementParticipantCount < 0 || fact.settlementParticipantCount > fact.participantCount) {
    throw new Error('Sharing fact settlementParticipantCount must be between zero and participantCount');
  }

  const fullAmount = ExactDecimal.from(fact.fullAmount);
  const personalAmount = ExactDecimal.from(fact.personalAmount);
  const participantAllocatedAmount = ExactDecimal.from(fact.participantAllocatedAmount);
  const settlementRequiredAmount = ExactDecimal.from(fact.settlementRequiredAmount);
  const zero = ExactDecimal.from('0');
  if ([fullAmount, personalAmount, participantAllocatedAmount, settlementRequiredAmount].some((amount) => amount.compare(zero) < 0)) {
    throw new Error('Sharing fact amounts must be non-negative');
  }
  if (settlementRequiredAmount.compare(participantAllocatedAmount) > 0 || participantAllocatedAmount.compare(fullAmount) > 0) {
    throw new Error('Sharing fact participant amounts exceed the full amount');
  }
  if (personalAmount.compare(fullAmount.subtract(settlementRequiredAmount)) !== 0) {
    throw new Error('Sharing fact personalAmount must equal fullAmount minus settlementRequiredAmount');
  }

  return Object.freeze({ ...fact });
}
