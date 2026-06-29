import { useMemo, useState } from 'react';
import type { ViewProps } from '../../../shared/ui/ViewProps';
import type { ShareDraft, ShareMode, SharePersonDraft, SharingPersonSuggestion } from '../../domain/shareDraft';
import {
  DEFAULT_SHARE_PEOPLE_OPTIONS,
  distributeShareByParts,
  formatShareCents,
  makeSharePerson,
  matchesSharePerson,
  parseShareCents,
  resetSharePeopleForMode,
  totalShareCents,
} from '../../application/shareDraftCalculator';
import styles from './ShareExpenseEditorView.module.css';

export type { ShareDraft, ShareMode, SharePersonDraft } from '../../domain/shareDraft';

export type ShareExpenseEditorViewProps = ViewProps<
  Record<string, never>,
  {
    peopleSuggestions?: SharingPersonSuggestion[];
  },
  {
    amount: string;
    currencyCode?: string;
    draft?: ShareDraft;
  },
  {
    disabled?: boolean;
  },
  {
    applyShare: (summary: { peopleCount: number; total: string }, draft: ShareDraft) => void;
  }
>;

const AVATAR_CLASS_BY_TONE: Record<SharePersonDraft['avatarTone'], string> = {
  you: styles.avatarYou,
  emma: styles.avatarEmma,
  luis: styles.avatarLuis,
  maria: styles.avatarMaria,
  john: styles.avatarJohn,
  alex: styles.avatarAlex,
  alexandra: styles.avatarAlexandra,
  ali: styles.avatarAli,
  custom: styles.avatarCustom,
};

function amountInputLabel(person: SharePersonDraft): string {
  return person.id === 'you' ? 'Your amount' : `${person.name} amount`;
}

export function ShareExpenseEditorView({ required, provided }: ShareExpenseEditorViewProps) {
  const amountCents = parseShareCents(required.state.amount);
  const peopleOptions = required.data.peopleSuggestions?.length ? required.data.peopleSuggestions : DEFAULT_SHARE_PEOPLE_OPTIONS;
  const [mode, setMode] = useState<ShareMode>(required.state.draft?.mode ?? 'parts');
  const [personQuery, setPersonQuery] = useState('');
  const [people, setPeople] = useState<SharePersonDraft[]>(() => required.state.draft?.people ?? resetSharePeopleForMode('parts', amountCents, [
    {
      id: 'you',
      name: 'You (Payer)',
      reimbursable: false,
      parts: 1,
      amount: '',
      avatarTone: 'you',
    },
  ]));

  const matchingPeople = useMemo(() => {
    const existingNames = new Set(people.map((person) => person.name.toLowerCase()));
    return peopleOptions
      .filter((person) => !existingNames.has(person.name.toLowerCase()))
      .filter((person) => personQuery.trim() && matchesSharePerson(person, personQuery))
      .slice(0, 3);
  }, [people, peopleOptions, personQuery]);
  const normalizedQuery = personQuery.trim();
  const canAddTypedPerson = Boolean(normalizedQuery)
    && !people.some((person) => person.name.toLowerCase() === normalizedQuery.toLowerCase())
    && !matchingPeople.some((person) => person.name.toLowerCase() === normalizedQuery.toLowerCase());
  const totalCents = totalShareCents(people);
  const remainingCents = amountCents - totalCents;
  const exceedsTotal = totalCents > amountCents;

  function changeMode(nextMode: ShareMode) {
    setMode(nextMode);
    setPeople((current) => resetSharePeopleForMode(nextMode, amountCents, current));
  }

  function addPerson(personName: string) {
    const nextPerson = makeSharePerson(personName, peopleOptions);
    setPeople((current) => {
      const next = [current[0], nextPerson, ...current.slice(1)];
      return resetSharePeopleForMode(mode, amountCents, next);
    });
    setPersonQuery('');
  }

  function removePerson(personId: string) {
    setPeople((current) => resetSharePeopleForMode(mode, amountCents, current.filter((person) => person.id !== personId)));
  }

  function updatePersonParts(personId: string, nextParts: number) {
    setPeople((current) => distributeShareByParts(amountCents, current.map((person) => (
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
        <strong>{formatShareCents(amountCents)}</strong>
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
              <span className={`${styles.avatar} ${AVATAR_CLASS_BY_TONE[person.avatarTone]}`} aria-hidden>
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
          <strong>{formatShareCents(totalCents)} {required.state.currencyCode ?? ''}</strong>
          <span>Remaining</span>
          <strong className={remainingCents < 0 ? styles.negativeAmount : undefined}>
            {formatShareCents(remainingCents)} {required.state.currencyCode ?? ''}
          </strong>
        </div>
      ) : null}
      {exceedsTotal ? (
        <p className={styles.shareWarning} role="alert">
          <i className="bi bi-exclamation-triangle" aria-hidden />
          Can't exceed {formatShareCents(amountCents)} {required.state.currencyCode ?? ''} total
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
                <span className={`${styles.avatar} ${styles.avatarCustom}`} aria-hidden>{person.name.slice(0, 1)}</span>
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
        onClick={() => provided.commands.applyShare(
          { peopleCount: people.length, total: formatShareCents(totalCents) },
          { mode, people },
        )}
      >
        Apply share
      </button>
    </div>
  );
}
