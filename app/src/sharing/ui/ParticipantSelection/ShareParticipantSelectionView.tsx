import type { SharingGroupSuggestion, SharingPersonSuggestion } from '../../domain/shareDraft';

export type ShareParticipantSelectionViewProps = {
  readonly context: 'people' | 'groups';
  readonly people: readonly SharingPersonSuggestion[];
  readonly groups: readonly SharingGroupSuggestion[];
  readonly selectedPersonIds: ReadonlySet<string>;
  readonly query: string;
  readonly disabled: boolean;
  readonly onQueryChange: (query: string) => void;
  readonly onContextChange: (context: 'people' | 'groups') => void;
  readonly onPersonToggle: (person: SharingPersonSuggestion) => void;
  readonly onGroupSelect: (group: SharingGroupSuggestion) => void;
  readonly onCreatePerson: (name: string) => void;
  readonly onBack: () => void;
  readonly onConfirm: () => void;
};

export function ShareParticipantSelectionView({ context, people, groups, selectedPersonIds, query, disabled, onContextChange, onQueryChange, onPersonToggle, onGroupSelect, onCreatePerson, onBack, onConfirm }: ShareParticipantSelectionViewProps) {
  const canCreatePerson = query.trim().length > 0 && people.every((person) => person.name.trim().toLowerCase() !== query.trim().toLowerCase());
  return (
    <main className="min-vh-100 d-flex flex-column bg-body" aria-label="Add people or groups">
      <header className="d-flex align-items-center gap-3 px-4">
        <button type="button" className="btn btn-link d-inline-flex align-items-center justify-content-center p-0" aria-label="Back" onClick={onBack}>
          <i className="bi bi-arrow-left" aria-hidden="true" />
        </button>
        <h1 className="mb-0">Add people or groups</h1>
      </header>
      <div className="flex-grow-1 px-4 py-3">
        <div className="nav nav-underline" role="tablist" aria-label="Participant type">
          {(['people', 'groups'] as const).map((tab) => <button key={tab} id={`${tab}-tab`} type="button" role="tab" className={`nav-link ${context === tab ? 'active' : ''}`} aria-selected={context === tab} aria-controls={`${tab}-panel`} onClick={() => onContextChange(tab)} disabled={disabled}>{tab === 'people' ? 'People' : 'Groups'}</button>)}
        </div>
        <label className="d-flex align-items-center gap-2 w-100 form-control mt-3">
          <i className="bi bi-search" aria-hidden="true" />
          <span className="visually-hidden">Search people or groups</span>
          <input className="border-0 outline-0 flex-grow-1" aria-label={`Search ${context}`} value={query} placeholder={`Search ${context}`} onChange={(event) => onQueryChange(event.target.value)} disabled={disabled} />
        </label>
        {context === 'groups' ? <section id="groups-panel" role="tabpanel" aria-labelledby="groups-tab" className="mt-4" aria-label="Suggested groups">
          <h2 className="h6">Suggested groups</h2>
          <div className="vstack">
            {groups.map((group) => <button key={group.key} type="button" className="btn d-flex align-items-center gap-3 w-100 text-start" onClick={() => onGroupSelect(group)} disabled={disabled}><i className="bi bi-people" aria-hidden="true" /><span className="flex-grow-1 text-truncate">{group.people.map((person) => person.name).join(', ')}</span><small className="text-body-secondary">{group.usageCount}</small></button>)}
          </div>
        </section> : <section id="people-panel" role="tabpanel" aria-labelledby="people-tab" className="mt-4" aria-label="Suggested people">
          <h2 className="h6">Suggested people</h2>
          <div className="vstack">
            {people.map((person) => {
              const selected = selectedPersonIds.has(person.id);
              return <button key={person.id} type="button" className="btn d-flex align-items-center gap-3 w-100 text-start" aria-pressed={selected} onClick={() => onPersonToggle(person)} disabled={disabled}><span className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }} aria-hidden="true">{person.name.slice(0, 1)}</span><span className="flex-grow-1 text-truncate">{person.name}</span>{selected ? <i className="bi bi-check2 text-primary" aria-label="Selected" /> : null}</button>;
            })}
            {canCreatePerson ? <button type="button" className="btn d-flex align-items-center gap-3 w-100 text-start" onClick={() => onCreatePerson(query)} disabled={disabled}><i className="bi bi-person-plus" aria-hidden="true" /><span className="flex-grow-1">Create {query.trim()}</span></button> : null}
          </div>
        </section>}
      </div>
      <footer className="mt-auto px-4 pb-3">
        <button type="button" className="btn btn-primary w-100" onClick={onConfirm} disabled={disabled}>Confirm</button>
      </footer>
    </main>
  );
}
