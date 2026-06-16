import { useId, type KeyboardEvent } from 'react';
import type { MultiTagPickerViewProps } from './MultiTagPickerView.contract';
import './MultiTagPickerView.css';

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
    <div className="multi-tag-picker">
      <label className="multi-tag-picker-label" htmlFor={inputId}>
        {required.config.label}
      </label>
      {required.data.selectedTags.length > 0 ? (
        <div className="multi-tag-picker-selected" aria-label="Selected tags">
          {required.data.selectedTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="multi-tag-picker-chip"
              title={tag.name}
              aria-label={`Remove tag ${tag.name}`}
              disabled={required.status.disabled}
              onClick={() => provided.commands.removeTag(tag.id)}
            >
              <span className="multi-tag-picker-chip-name">#{tag.name}</span>
              <span className="multi-tag-picker-chip-remove" aria-hidden>×</span>
            </button>
          ))}
        </div>
      ) : null}
      <span className="multi-tag-picker-field">
        <input
          id={inputId}
          className="multi-tag-picker-input"
          disabled={required.status.disabled}
          placeholder={required.data.selectedTags.length === 0 ? required.config.placeholder : 'Add tag...'}
          value={required.state.query}
          onChange={(event) => provided.commands.changeQuery(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </span>
      {listOpen ? (
        <ul className="multi-tag-picker-list" aria-label={`${required.config.label} suggestions`}>
          {suggestions.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                className="multi-tag-picker-option"
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
                className="multi-tag-picker-option multi-tag-picker-create"
                onClick={() => provided.commands.createTag(required.state.createCandidate!)}
              >
                + {required.state.createCandidate}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
      {required.status.error ? <p className="field-error">{required.status.error}</p> : null}
    </div>
  );
}
