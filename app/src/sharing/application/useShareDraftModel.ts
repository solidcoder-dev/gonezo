import { useState } from 'react';
import type { SharingGatewayPort } from './sharingGateway.port';
import type { ShareDraft, SharingPersonSuggestion } from '../domain/shareDraft';

export function useShareDraftModel(sharing: SharingGatewayPort) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [summary, setSummary] = useState<{ peopleCount: number; total: string } | undefined>();
  const [draft, setDraft] = useState<ShareDraft | undefined>();
  const [peopleSuggestions, setPeopleSuggestions] = useState<SharingPersonSuggestion[]>([]);

  function reset() {
    setEditorOpen(false);
    setSummary(undefined);
    setDraft(undefined);
  }

  async function refreshPeopleSuggestions() {
    const people = await sharing.sharingListPeople();
    setPeopleSuggestions(people.items.map((person) => ({ id: person.id, name: person.name, email: person.email })));
  }

  function applyShareDraft(nextSummary: { peopleCount: number; total: string }, nextDraft: ShareDraft) {
    setSummary(nextSummary);
    setDraft(nextDraft);
    setEditorOpen(false);
  }

  function removeShareDraft() {
    setSummary(undefined);
    setDraft(undefined);
  }

  return {
    state: {
      editorOpen,
      summary,
      draft,
      peopleSuggestions,
    },
    actions: {
      reset,
      refreshPeopleSuggestions,
      openEditor: () => setEditorOpen(true),
      closeEditor: () => setEditorOpen(false),
      applyShareDraft,
      removeShareDraft,
    },
  };
}
