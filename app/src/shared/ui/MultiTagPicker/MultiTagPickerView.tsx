import { useId, type KeyboardEvent } from 'react';
import type { MultiTagPickerViewProps } from './MultiTagPickerView.contract';
import styles from './MultiTagPickerView.module.css';

export type { MultiTagPickerOption, MultiTagPickerViewProps } from './MultiTagPickerView.contract';

export function MultiTagPickerView({ required, provided }: MultiTagPickerViewProps) {
  const inputId = useId();
  const maxSuggestions = required.config.maxSuggestions ?? 4;
  const suggestions = required.data.suggestions.slice(0, maxSuggestions);
  const listOpen = !required.status.disabled && (suggestions.length > 0 || Boolean(required.state.createCandidate));

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !required.state.query) {
      provided.commands.removeLastTag();
      return;
    }
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    if (suggestions[0]) {
      provided.commands.selectTag(suggestions[0].id);
      return;
    }
    if (required.state.createCandidate) {
      provided.commands.createTag(required.state.createCandidate);
    }
  }

  return (
    <div className={styles.root}>
      <label className={styles.label} htmlFor={inputId}>
        {required.config.label}
      </label>
      {required.data.selectedTags.length > 0 ? (
        <div className={styles.selected} aria-label="Selected tags">
          {required.data.selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={styles.chip}
              title={tag.name}
              aria-label={`Remove tag ${tag.name}`}
              disabled={required.status.disabled}
              onClick={() => provided.commands.removeTag(tag.id)}
            >
              <span>#{tag.name}</span>
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}
      <span className={styles.field}>
        <input
          id={inputId}
          className={styles.input}
          disabled={required.status.disabled}
          placeholder={required.data.selectedTags.length === 0 ? required.config.placeholder : 'Add tag...'}
          value={required.state.query}
          onChange={(event) => provided.commands.changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </span>
      {listOpen ? (
        <ul className={styles.suggestions} aria-label={`${required.config.label} suggestions`}>
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                className={styles.suggestion}
                title={tag.name}
                onClick={() => provided.commands.selectTag(tag.id)}
              >
                #{tag.name}
              </button>
            </li>
          ))}
          {required.state.createCandidate ? (
            <li>
              <button
                type="button"
                className={styles.suggestion}
                onClick={() => provided.commands.createTag(required.state.createCandidate!)}
              >
                + {required.state.createCandidate}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {required.status.error ? <p className="gz-field-error">{required.status.error}</p> : null}
    </div>
  );
}
