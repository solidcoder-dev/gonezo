import type { SharingPersonItem } from '../application/sharing.port';

export type SharingPeoplePageViewProps = {
  readonly people: readonly SharingPersonItem[];
  readonly loading: boolean;
  readonly savingPersonId?: string;
  readonly editingPersonId?: string;
  readonly editingName: string;
  readonly error?: string;
  readonly onBack: () => void;
  readonly onStartEditing: (person: SharingPersonItem) => void;
  readonly onNameChange: (name: string) => void;
  readonly onSave: () => void;
};

export function SharingPeoplePageView({ people, loading, savingPersonId, editingPersonId, editingName, error, onBack, onStartEditing, onNameChange, onSave }: SharingPeoplePageViewProps) {
  return (
    <main className="min-vh-100 d-flex flex-column bg-body" aria-label="Sharing people">
      <header className="d-flex align-items-center gap-3 px-4">
        <button type="button" className="btn btn-link d-inline-flex align-items-center justify-content-center p-0" aria-label="Back" onClick={onBack}><i className="bi bi-arrow-left" aria-hidden="true" /></button>
        <h1 className="mb-0">Sharing people</h1>
      </header>
      <div className="flex-grow-1 px-4 py-3">
        {loading ? <p role="status">Loading sharing people...</p> : null}
        {!loading && people.length === 0 ? <p role="status">No sharing people yet.</p> : null}
        {!loading ? <ul className="list-unstyled m-0 p-0 vstack" aria-label="Active sharing people">{people.map((person) => {
          const editing = person.id === editingPersonId;
          const saving = person.id === savingPersonId;
          return <li key={person.id} className="py-3 border-bottom"><div className="d-flex align-items-center gap-3"><span className="rounded-circle bg-secondary-subtle d-inline-flex align-items-center justify-content-center" style={{ width: 44, height: 44 }} aria-hidden="true">{person.name.slice(0, 1)}</span><span className="flex-grow-1 min-w-0"><strong className="d-block text-truncate">{person.name}</strong><small className="d-block text-body-secondary">Shared person</small></span><button type="button" className="btn btn-link d-inline-flex align-items-center justify-content-center p-2" aria-label={`Edit ${person.name}`} onClick={() => onStartEditing(person)} disabled={Boolean(savingPersonId)}><i className="bi bi-pencil" aria-hidden="true" /></button></div>{editing ? <form className="d-flex align-items-start gap-2 mt-3" onSubmit={(event) => { event.preventDefault(); onSave(); }}><label className="visually-hidden" htmlFor={`sharing-person-${person.id}`}>Name</label><input id={`sharing-person-${person.id}`} className="form-control" value={editingName} onChange={(event) => onNameChange(event.target.value)} disabled={saving} /><button type="submit" className="btn btn-primary" disabled={saving || !editingName.trim() || editingName.trim() === person.name}>{saving ? 'Saving...' : 'Save'}</button></form> : null}{editing && error ? <p className="text-danger small mt-2 mb-0" role="alert">{error}</p> : null}</li>;
        })}</ul> : null}
        {!editingPersonId && error ? <p className="text-danger mt-3" role="alert">{error}</p> : null}
      </div>
    </main>
  );
}
