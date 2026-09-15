import { useRef, useState } from 'react';
import type { ShareExpenseEditorViewProps } from '../ui/ShareExpenseEditor/ShareExpenseEditorView';
import type { ShareSelectionCandidate } from '../domain/shareDraft';
import { ShareExpenseEditorView } from '../ui/ShareExpenseEditor/ShareExpenseEditorView';
import { ShareParticipantSelectionView } from '../ui/ParticipantSelection/ShareParticipantSelectionView';
import { useShareEditorModel } from './useShareEditorModel';
import styles from '../ui/ShareMovementEditor/ShareMovementEditorPageView.module.css';

type ShareEditorFlowProps = ShareExpenseEditorViewProps & { readonly title: string; readonly onClose: () => void; readonly useDefaultPeopleOptions?: boolean };

export function ShareEditorFlow({ title, onClose, required, provided, useDefaultPeopleOptions }: ShareEditorFlowProps) {
  const model = useShareEditorModel({ amount: required.state.amount, draft: required.state.draft, movementType: required.state.movementType ?? 'expense', peopleSuggestions: required.data.peopleSuggestions, groupSuggestions: required.data.groupSuggestions, useDefaultPeopleOptions, disabled: required.status.disabled ?? false });
  const [selectionOpen, setSelectionOpen] = useState(false);
  const draftBeforeSelection = useRef(model.state.people);
  const selectedPersonIds = new Set(model.state.people.flatMap((person) => person.role === 'participant' && person.personId ? [person.personId] : []));
  const openSelection = () => { draftBeforeSelection.current = model.state.people; model.commands.setQuery(''); setSelectionOpen(true); };
  const cancelSelection = () => { model.commands.restorePeople(draftBeforeSelection.current); setSelectionOpen(false); };
  const confirmSelection = () => setSelectionOpen(false);

  if (selectionOpen) {
    const ownerIncluded = model.state.people.some((person) => person.role === 'owner' && person.includedInAllocation !== false);
    const ownerMatchesQuery = model.state.query.trim().length === 0 || 'you'.includes(model.state.query.trim().toLowerCase());
    const selectionPeople: ShareSelectionCandidate[] = ownerMatchesQuery ? [{ kind: 'owner', name: 'You' }, ...model.state.selectionPeople.map((person) => ({ kind: 'person' as const, person }))] : model.state.selectionPeople.map((person) => ({ kind: 'person' as const, person }));
    return <ShareParticipantSelectionView context={model.state.selectionContext} people={selectionPeople} groups={model.state.matchingGroups} canCreatePerson={model.state.canCreatePerson} ownerSelected={ownerIncluded} selectedPersonIds={selectedPersonIds} query={model.state.query} disabled={required.status.disabled ?? false} onContextChange={model.commands.setSelectionContext} onQueryChange={model.commands.setQuery} onPersonToggle={(candidate) => {
      if (candidate.kind === 'owner') {
        model.commands.setOwnerIncluded(!ownerIncluded);
        return;
      }
      const selectedMember = model.state.people.find((member) => member.role === 'participant' && member.personId === candidate.person.id);
      if (selectedMember) model.commands.removePerson(selectedMember.id);
      else model.commands.addPerson(candidate.person);
    }} onGroupSelect={model.commands.addGroup} onCreatePerson={model.commands.addTypedPerson} onBack={cancelSelection} onConfirm={confirmSelection} />;
  }

  return (
    <main className="min-vh-100 d-flex flex-column bg-body" aria-label={title}>
      <header className={`${styles.header} d-flex align-items-center gap-3 px-4`}>
        <button type="button" className={`${styles.backButton} btn btn-link d-inline-flex align-items-center justify-content-center p-0`} aria-label="Back" onClick={onClose}><i className="bi bi-arrow-left" aria-hidden="true" /></button>
        <h1 className={`${styles.title} mb-0`}>{title}</h1>
      </header>
      <ShareExpenseEditorView required={{ ...required, state: { ...required.state, editorModel: model } }} provided={{ ...provided, commands: { ...provided.commands, openParticipantSelection: openSelection } }} />
    </main>
  );
}
