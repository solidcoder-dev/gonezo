import { useRef, useState } from 'react';
import type { ShareExpenseEditorViewProps } from '../ui/ShareExpenseEditor/ShareExpenseEditorView';
import { ShareExpenseEditorView } from '../ui/ShareExpenseEditor/ShareExpenseEditorView';
import { ShareParticipantSelectionView } from '../ui/ParticipantSelection/ShareParticipantSelectionView';
import { useShareEditorModel } from './useShareEditorModel';
import styles from '../ui/ShareMovementEditor/ShareMovementEditorPageView.module.css';

type ShareEditorFlowProps = ShareExpenseEditorViewProps & { readonly title: string; readonly onClose: () => void };

export function ShareEditorFlow({ title, onClose, required, provided }: ShareEditorFlowProps) {
  const model = useShareEditorModel({ amount: required.state.amount, draft: required.state.draft, movementType: required.state.movementType ?? 'expense', peopleSuggestions: required.data.peopleSuggestions, groupSuggestions: required.data.groupSuggestions, disabled: required.status.disabled ?? false });
  const [selectionOpen, setSelectionOpen] = useState(false);
  const draftBeforeSelection = useRef(model.state.people);
  const selectedPersonIds = new Set(model.state.people.flatMap((person) => person.role === 'participant' && person.personId ? [person.personId] : []));
  const openSelection = () => { draftBeforeSelection.current = model.state.people; model.commands.setQuery(''); setSelectionOpen(true); };
  const cancelSelection = () => { model.commands.restorePeople(draftBeforeSelection.current); setSelectionOpen(false); };
  const confirmSelection = () => setSelectionOpen(false);

  if (selectionOpen) {
    return <ShareParticipantSelectionView context={model.state.selectionContext} people={model.state.selectionPeople} groups={model.state.matchingGroups} canCreatePerson={model.state.canCreatePerson} selectedPersonIds={selectedPersonIds} query={model.state.query} disabled={required.status.disabled ?? false} onContextChange={model.commands.setSelectionContext} onQueryChange={model.commands.setQuery} onPersonToggle={(person) => {
      const selectedMember = model.state.people.find((member) => member.role === 'participant' && member.personId === person.id);
      if (selectedMember) model.commands.removePerson(selectedMember.id);
      else model.commands.addPerson(person);
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
