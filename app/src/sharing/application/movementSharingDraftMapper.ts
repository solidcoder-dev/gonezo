import type { MovementDetailViewModel } from '../../movements/application/movementDetailView.types';
import type { ShareDraft } from '../domain/shareDraft';
import { formatShareCents, parseShareCents } from './shareDraftCalculator';

export function movementSharingDraft(movement: MovementDetailViewModel): ShareDraft | undefined {
  if (movement.source !== 'posted' || movement.sharing.phase !== 'loaded' || !movement.sharing.value) {
    return undefined;
  }
  const totalCents = parseShareCents(movement.amount.value);
  const participantCents = movement.sharing.value.participants.reduce(
    (sum, participant) => sum + parseShareCents(participant.amount),
    0,
  );
  return {
    mode: 'amounts',
    people: [
      {
        id: 'owner',
        role: 'owner',
        name: 'You (Payer)',
        parts: 1,
        amount: formatShareCents(totalCents - participantCents),
        avatarTone: 'you',
        includedInAllocation: true,
      },
      ...movement.sharing.value.participants.map((participant) => ({
        id: participant.id,
        role: 'participant' as const,
        personId: participant.personId,
        name: participant.name,
        parts: 1,
        amount: participant.amount,
        avatarTone: 'custom' as const,
        settlementChoice: participant.reimbursementStatus === 'paid' || participant.reimbursementStatus === 'dismissed'
          ? 'settled' as const
          : participant.reimbursementStatus === 'pending' ? 'pending' as const : 'not_required' as const,
      })),
    ],
  };
}
