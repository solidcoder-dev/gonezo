import { ExactDecimal } from '../../shared/domain/exactDecimal';

export type SharingAnalyticsParticipant = Readonly<{
  amount: string;
  requiresSettlement: boolean;
}>;

export type SharingAnalyticsAttribution = Readonly<{
  participantCount: number;
  settlementParticipantCount: number;
  participantAllocatedAmount: string;
  settlementRequiredAmount: string;
  personalAmount: string;
}>;

export function resolveSharingAnalyticsAttribution(
  fullAmountValue: string,
  participants: readonly SharingAnalyticsParticipant[],
): SharingAnalyticsAttribution {
  const fullAmount = ExactDecimal.from(fullAmountValue);
  let participantAllocatedAmount = ExactDecimal.from('0');
  let settlementRequiredAmount = ExactDecimal.from('0');
  let settlementParticipantCount = 0;

  for (const participant of participants) {
    const amount = ExactDecimal.from(participant.amount);
    if (amount.compare(ExactDecimal.from('0')) < 0) throw new Error('Participant allocation cannot be negative');
    participantAllocatedAmount = participantAllocatedAmount.add(amount);
    if (participant.requiresSettlement) {
      settlementRequiredAmount = settlementRequiredAmount.add(amount);
      if (amount.compare(ExactDecimal.from('0')) > 0) settlementParticipantCount += 1;
    }
  }

  if (settlementRequiredAmount.compare(participantAllocatedAmount) > 0 || participantAllocatedAmount.compare(fullAmount) > 0) {
    throw new Error('Participant allocations exceed the movement amount');
  }

  return Object.freeze({
    participantCount: participants.length,
    settlementParticipantCount,
    participantAllocatedAmount: participantAllocatedAmount.toString(),
    settlementRequiredAmount: settlementRequiredAmount.toString(),
    personalAmount: fullAmount.subtract(settlementRequiredAmount).toString(),
  });
}
