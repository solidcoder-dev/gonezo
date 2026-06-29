import { useMemo, useState } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import styles from './ShareExpenseEditorView.module.css';

export type ShareExpenseEditorViewProps = ViewProps<
  Record<string, never>,
  Record<string, never>,
  {
    amount: string;
    currencyCode?: string;
  },
  {
    disabled?: boolean;
  },
  {
    applyShare: (summary: { peopleCount: number; total: string }) => void;
  }
>;

type ShareMode = 'parts' | 'amounts';

type SharePerson = {
  id: string;
  name: string;
  email?: string;
  reimbursable: boolean;
  parts: number;
  amount: string;
  avatarClassName: string;
};

const PEOPLE_OPTIONS: SharePerson[] = [
  { id: 'emma', name: 'Emma', email: 'emma@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarEmma },
  { id: 'luis', name: 'Luis', email: 'luis@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarLuis },
  { id: 'maria', name: 'Maria', email: 'maria@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarMaria },
  { id: 'john', name: 'John', email: 'john@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarJohn },
  { id: 'alex-johnson', name: 'Alex Johnson', email: 'alex.j@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarAlex },
  { id: 'alexandra-rossi', name: 'Alexandra Rossi', email: 'alexandra.r@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarAlexandra },
  { id: 'ali-khan', name: 'Ali Khan', email: 'ali.k@example.com', reimbursable: true, parts: 1, amount: '', avatarClassName: styles.avatarAli },
];

function parseCents(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function makePerson(name: string): SharePerson {
  const normalizedName = name.trim();
  const existing = PEOPLE_OPTIONS.find((person) => person.name.toLowerCase() === normalizedName.toLowerCase());
  if (existing) {
    return { ...existing, id: `${existing.id}-${Date.now()}` };
  }
  return {
    id: `person-${Date.now()}`,
    name: normalizedName,
    reimbursable: true,
    parts: 1,
    amount: '',
    avatarClassName: styles.avatarCustom,
  };
}

function distributeByParts(amountCents: number, people: SharePerson[]): SharePerson[] {
  const totalParts = people.reduce((total, person) => total + Math.max(1, person.parts), 0);
  let allocated = 0;
  return people.map((person, index) => {
    const parts = Math.max(1, person.parts);
    const cents = index === people.length - 1
      ? amountCents - allocated
      : Math.floor((amountCents * parts) / totalParts);
    allocated += cents;
    return { ...person, amount: formatCents(cents) };
  });
}

function resetPeopleForMode(mode: ShareMode, amountCents: number, people: SharePerson[]): SharePerson[] {
  const resetPeople = people.map((person) => ({ ...person, parts: 1, amount: '' }));
  return mode === 'parts' ? distributeByParts(amountCents, resetPeople) : resetPeople;
}

function totalShareCents(people: SharePerson[]): number {
  return people.reduce((total, person) => total + parseCents(person.amount), 0);
}

function matchesPerson(person: SharePerson, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  return person.name.toLowerCase().includes(normalized) || Boolean(person.email?.toLowerCase().includes(normalized));
}

function amountInputLabel(person: SharePerson): string {
  return person.id === 'you' ? 'Your amount' : `${person.name} amount`;
}

export function ShareExpenseEditorView({ required, provided }: ShareExpenseEditorViewProps) {
  const amountCents = parseCents(required.state.amount);
  const [mode, setMode] = useState<ShareMode>('parts');
  const [personQuery, setPersonQuery] = useState('');
  const [people, setPeople] = useState<SharePerson[]>(() => resetPeopleForMode('parts', amountCents, [
    {
      id: 'you',
      name: 'You (Payer)',
      reimbursable: false,
      parts: 1,
      amount: '',
      avatarClassName: styles.avatarYou,
    },
  ]));

  const matchingPeople = useMemo(() => {
    const existingNames = new Set(people.map((person) => person.name.toLowerCase()));
    return PEOPLE_OPTIONS
      .filter((person) => !existingNames.has(person.name.toLowerCase()))
      .filter((person) => personQuery.trim() && matchesPerson(person, personQuery))
      .slice(0, 3);
  }, [people, personQuery]);
  const normalizedQuery = personQuery.trim();
  const canAddTypedPerson = Boolean(normalizedQuery)
    && !people.some((person) => person.name.toLowerCase() === normalizedQuery.toLowerCase())
    && !matchingPeople.some((person) => person.name.toLowerCase() === normalizedQuery.toLowerCase());
  const totalCents = totalShareCents(people);
  const remainingCents = amountCents - totalCents;
  const exceedsTotal = totalCents > amountCents;

  function changeMode(nextMode: ShareMode) {
    setMode(nextMode);
    setPeople((current) => resetPeopleForMode(nextMode, amountCents, current));
  }

  function addPerson(personName: string) {
    const nextPerson = makePerson(personName);
    setPeople((current) => {
      const next = [current[0], nextPerson, ...current.slice(1)];
      return resetPeopleForMode(mode, amountCents, next);
    });
    setPersonQuery('');
  }

  function removePerson(personId: string) {
    setPeople((current) => resetPeopleForMode(mode, amountCents, current.filter((person) => person.id !== personId)));
  }

  function updatePersonParts(personId: string, nextParts: number) {
    setPeople((current) => distributeByParts(amountCents, current.map((person) => (
      person.id === personId ? { ...person, parts: Math.max(1, nextParts) } : person
    ))));
  }

  function updatePersonAmount(personId: string, amount: string) {
    setPeople((current) => current.map((person) => (person.id === personId ? { ...person, amount } : person)));
  }

  function toggleReimbursable(personId: string) {
    setPeople((current) => current.map((person) => (
      person.id === personId ? { ...person, reimbursable: !person.reimbursable } : person
    )));
  }

  return (
    <div className={styles.shareEditor}>
      <div className={styles.totalLine}>
        <span>Total</span>
        <strong>{formatCents(amountCents)}</strong>
        {required.state.currencyCode ? <span>{required.state.currencyCode}</span> : null}
      </div>

      <div className={styles.modeTabs} role="tablist" aria-label="Share mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'parts'}
          className={mode === 'parts' ? styles.activeModeTab : undefined}
          onClick={() => changeMode('parts')}
          disabled={required.status.disabled}
        >
          As parts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'amounts'}
          className={mode === 'amounts' ? styles.activeModeTab : undefined}
          onClick={() => changeMode('amounts')}
          disabled={required.status.disabled}
        >
          As amounts
        </button>
      </div>

      <div className={styles.peopleHeader}>
        <span>Person</span>
        <span>Reimburse</span>
        <span>{mode === 'parts' ? 'Parts' : 'Amount'}</span>
      </div>
      <ul className={styles.peopleList} aria-label="Share people">
        {people.map((person) => (
          <li key={person.id} className={styles.personRow}>
            <span className={`${styles.avatar} ${person.avatarClassName}`} aria-hidden>
              {person.id === 'you' ? 'You' : person.name.slice(0, 1)}
            </span>
            <strong>{person.name}</strong>
            <span className={styles.reimburseCell}>
              {person.id === 'you' ? (
                <span aria-label="You do not reimburse">-</span>
              ) : (
                <button
                  type="button"
                  className={person.reimbursable ? styles.reimburseOn : styles.reimburseOff}
                  aria-label={`Toggle reimbursement for ${person.name}`}
                  aria-pressed={person.reimbursable}
                  disabled={required.status.disabled}
                  onClick={() => toggleReimbursable(person.id)}
                >
                  <i className="bi bi-check-lg" aria-hidden />
                </button>
              )}
            </span>
            {mode === 'parts' ? (
              <div className={styles.shareValueCell}>
                <div className={styles.partsStepper}>
                  <button
                    type="button"
                    aria-label={`Decrease parts for ${person.name}`}
                    disabled={required.status.disabled || person.parts <= 1}
                    onClick={() => updatePersonParts(person.id, person.parts - 1)}
                  >
                    <i className="bi bi-dash-lg" aria-hidden />
                  </button>
                  <input
                    aria-label={`${person.name} parts`}
                    type="number"
                    min="1"
                    step="1"
                    value={person.parts}
                    onChange={(event) => updatePersonParts(person.id, Number(event.target.value))}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    aria-label={`Increase parts for ${person.name}`}
                    disabled={required.status.disabled}
                    onClick={() => updatePersonParts(person.id, person.parts + 1)}
                  >
                    <i className="bi bi-plus-lg" aria-hidden />
                  </button>
                </div>
                <span>{person.amount} {required.state.currencyCode ?? ''}</span>
              </div>
            ) : (
              <label className={styles.amountField}>
                <input
                  aria-label={amountInputLabel(person)}
                  type="number"
                  min="0"
                  step="0.01"
                  value={person.amount}
                  onChange={(event) => updatePersonAmount(person.id, event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                />
                {required.state.currencyCode ? <span>{required.state.currencyCode}</span> : null}
              </label>
            )}
            {person.id === 'you' ? (
              <span className={styles.personSpacer} aria-hidden />
            ) : (
              <button
                type="button"
                className={`text-button icon-button ${styles.removePersonButton}`}
                aria-label={`Remove ${person.name}`}
                disabled={required.status.disabled}
                onClick={() => removePerson(person.id)}
              >
                <i className="bi bi-trash" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      {mode === 'amounts' ? (
        <div className={styles.amountSummary}>
          <span>Total</span>
          <strong>{formatCents(totalCents)} {required.state.currencyCode ?? ''}</strong>
          <span>Remaining</span>
          <strong className={remainingCents < 0 ? styles.negativeAmount : undefined}>
            {formatCents(remainingCents)} {required.state.currencyCode ?? ''}
          </strong>
        </div>
      ) : null}
      {exceedsTotal ? (
        <p className={styles.shareWarning} role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          Can't exceed {formatCents(amountCents)} {required.state.currencyCode ?? ''} total
        </p>
      ) : null}

      <div className={styles.addPersonPanel}>
        <label className={styles.searchField}>
          <i className="bi bi-search" aria-hidden />
          <input
            aria-label="Search people to add"
            value={personQuery}
            onChange={(event) => setPersonQuery(event.target.value)}
            placeholder="Search people to add"
          />
        </label>
        {normalizedQuery ? (
          <div className={styles.suggestions} aria-label="People suggestions">
            {matchingPeople.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => addPerson(person.name)}
                disabled={required.status.disabled}
              >
                <span className={`${styles.avatar} ${person.avatarClassName}`} aria-hidden>{person.name.slice(0, 1)}</span>
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.email}</small>
                </span>
              </button>
            ))}
            {canAddTypedPerson ? (
              <button
                type="button"
                onClick={() => addPerson(normalizedQuery)}
                disabled={required.status.disabled}
              >
                <span className={`${styles.avatar} ${styles.avatarCustom}`} aria-hidden>{normalizedQuery.slice(0, 1)}</span>
                <span>
                  <strong>Add {normalizedQuery}</strong>
                  <small>New person</small>
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className={styles.applyButton}
        disabled={required.status.disabled || exceedsTotal}
        onClick={() => provided.commands.applyShare({ peopleCount: people.length, total: formatCents(totalCents) })}
      >
        Apply share
      </button>
    </div>
  );
}
