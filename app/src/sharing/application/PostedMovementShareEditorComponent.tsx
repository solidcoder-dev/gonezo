import { useEffect, useState } from 'react';
import type { SharingPort } from './sharing.port';
import type { MovementDetailViewModel } from '../../movements/application/movementDetailView.types';
import type { ShareDraft, SharingGroupSuggestion, SharingPersonSuggestion } from '../domain/shareDraft';
import { movementSharingDraft } from './movementSharingDraftMapper';
import { ShareMovementEditorPageView } from '../ui/ShareMovementEditor/ShareMovementEditorPageView';

type PostedMovementShareEditorComponentProps = {
  movement: MovementDetailViewModel;
  sharing: Pick<SharingPort, 'sharingListPeople' | 'sharingListGroupSuggestions' | 'sharingReplaceMovementShare' | 'sharingRemoveMovementShare'>;
  onClose: () => void;
  onSaved: () => void;
  onError: (error: { message: string }) => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to save sharing';
}

export function PostedMovementShareEditorComponent({ movement, sharing, onClose, onSaved, onError }: PostedMovementShareEditorComponentProps) {
  const [people, setPeople] = useState<SharingPersonSuggestion[]>();
  const [groups, setGroups] = useState<SharingGroupSuggestion[]>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string>();
  const draft = movementSharingDraft(movement);

  useEffect(() => {
    let active = true;
    void Promise.all([
      sharing.sharingListPeople(),
      sharing.sharingListGroupSuggestions ? sharing.sharingListGroupSuggestions() : Promise.resolve({ items: [] }),
    ]).then(([peopleResult, groupsResult]) => {
      if (!active) return;
      setPeople(peopleResult.items.map((person) => ({ id: person.id, name: person.name, email: person.email })));
      setGroups(groupsResult.items);
    }).catch((error: unknown) => {
      if (active) setLoadError(errorMessage(error));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [sharing]);

  function applyShare(_: { peopleCount: number; total: string }, nextDraft: ShareDraft) {
    if (!sharing.sharingReplaceMovementShare) {
      onError({ message: 'Sharing replacement unavailable' });
      return;
    }
    setSaving(true);
    void sharing.sharingReplaceMovementShare({
      transactionId: movement.id,
      payer: { currentUser: true },
      participants: nextDraft.people.filter((person) => person.role === 'participant').map((person) => ({
        person: person.personId ? { personId: person.personId } : { displayName: person.name },
        amount: person.amount,
        settlementChoice: person.settlementChoice,
      })),
    }).then(onSaved).catch((error: unknown) => onError({ message: errorMessage(error) })).finally(() => setSaving(false));
  }

  function removeShare() {
    if (!sharing.sharingRemoveMovementShare) {
      onError({ message: 'Sharing removal unavailable' });
      return;
    }
    setSaving(true);
    void sharing.sharingRemoveMovementShare({ transactionId: movement.id }).then(onSaved).catch((error: unknown) => onError({ message: errorMessage(error) })).finally(() => setSaving(false));
  }

  if (loading) return <main className="min-vh-100 d-flex align-items-center justify-content-center" aria-label="Sharing"><span role="status">Loading sharing people…</span></main>;
  if (loadError) return <main className="min-vh-100 d-flex flex-column align-items-center justify-content-center gap-3" aria-label="Sharing"><p className="text-danger">{loadError}</p><button type="button" className="btn btn-secondary" onClick={onClose}>Close</button></main>;

  return (
    <ShareMovementEditorPageView
      title="Sharing"
      onClose={onClose}
      required={{ config: {}, data: { peopleSuggestions: people, groupSuggestions: groups }, state: { amount: movement.amount.value, currencyCode: movement.amount.currency, draft, movementType: movement.financialType === 'income' ? 'income' : 'expense' }, status: { disabled: saving } }}
      provided={{ commands: { applyShare, removeShare } }}
      useDefaultPeopleOptions={false}
    />
  );
}
