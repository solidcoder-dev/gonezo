import type { SharingGroupSuggestion, SharingPersonSuggestion } from '../../domain/shareDraft';
import styles from './ShareExpenseEditorView.module.css';

type SharingSearchViewProps = {
  readonly query: string;
  readonly people: readonly SharingPersonSuggestion[];
  readonly groups: readonly SharingGroupSuggestion[];
  readonly disabled: boolean;
  readonly onQueryChange: (value: string) => void;
  readonly onPersonSelect: (person: SharingPersonSuggestion) => void;
  readonly onGroupSelect: (group: SharingGroupSuggestion) => void;
  readonly onTypedPersonSelect: (name: string) => void;
};

export function SharingSearchView({ query, people, groups, disabled, onQueryChange, onPersonSelect, onGroupSelect, onTypedPersonSelect }: SharingSearchViewProps) {
  const canAdd = query.trim().length > 0 && people.length === 0 && groups.length === 0;
  return (
    <section className="d-grid gap-2" aria-label="Add people or group">
      <label className={`${styles.searchField} d-flex align-items-center gap-2 w-100`}>
        <i className="bi bi-search" aria-hidden="true" />
        <span className="visually-hidden">Search people or groups</span>
        <input className="flex-grow-1" aria-label="Search people or groups" value={query} placeholder="Search people or groups" onChange={(event) => onQueryChange(event.target.value)} disabled={disabled} />
      </label>
      {(people.length > 0 || groups.length > 0 || canAdd) ? (
        <div className={`${styles.suggestions} d-grid`} role="listbox" aria-label="People and group suggestions">
          {groups.map((group) => <button key={group.key} type="button" className="d-flex align-items-center gap-3 w-100 border-0 bg-transparent text-start" onClick={() => onGroupSelect(group)} disabled={disabled}><span className={styles.groupAvatars} aria-hidden="true">{group.people.slice(0, 3).map((person) => <span key={person.id}>{person.name.slice(0, 1)}</span>)}</span><span className="d-grid min-w-0"><strong className="text-truncate">{group.people.map((person) => person.name).join(', ')}</strong><small>{group.usageCount} recent shares</small></span></button>)}
          {people.map((person) => <button key={person.id} type="button" className="d-flex align-items-center gap-3 w-100 border-0 bg-transparent text-start" onClick={() => onPersonSelect(person)} disabled={disabled}><span className={`${styles.avatar} ${styles.avatarCustom}`} aria-hidden="true">{person.name.slice(0, 1)}</span><span className="d-grid min-w-0"><strong className="text-truncate">{person.name}</strong><small className="text-truncate">{person.email ?? 'Person'}</small></span></button>)}
          {canAdd ? <button type="button" className="d-flex align-items-center gap-3 w-100 border-0 bg-transparent text-start" onClick={() => onTypedPersonSelect(query)} disabled={disabled}><span className={`${styles.avatar} ${styles.avatarCustom}`} aria-hidden="true">{query.trim().slice(0, 1)}</span><span className="d-grid"><strong>Add {query.trim()}</strong><small>New person</small></span></button> : null}
        </div>
      ) : null}
    </section>
  );
}
