import { useId, type RefObject } from 'react';
import type { MovementReuseSuggestionGroup, MovementReuseSuggestionVariant } from '../../../movements/application/movementReuseSuggestions.port';
import styles from './MovementReuseAutocompleteView.module.css';
import { MovementReuseVariantMetadata } from './MovementReuseVariantMetadata';

export type MovementReuseAutocompleteViewProps = {
  query: string;
  open: boolean;
  loading: boolean;
  groups: MovementReuseSuggestionGroup[];
  expandedTitle: string | null;
  variants: MovementReuseSuggestionVariant[];
  inputRef?: RefObject<HTMLInputElement | null>;
  inputId?: string;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onToggleGroup: (group: MovementReuseSuggestionGroup) => void;
  onSelectVariant: (selection: { title: string; variant: MovementReuseSuggestionVariant }) => void;
};

export function MovementReuseAutocompleteView({
  query,
  open,
  loading,
  groups,
  expandedTitle,
  variants,
  inputRef,
  inputId,
  placeholder,
  error,
  onChange,
  onClose,
  onActivate,
  onDeactivate,
  onToggleGroup,
  onSelectVariant,
}: MovementReuseAutocompleteViewProps) {
  const listboxId = `movement-reuse-suggestions-${useId().replace(/:/g, '')}`;
  return (
    <div className={styles.autocomplete} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onDeactivate?.();
    }}>
      <input
        ref={inputRef}
        id={inputId}
        className="form-control"
        role="combobox"
        aria-label="Merchant or source"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onActivate}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Enter' && open && groups[0]) {
            event.preventDefault();
            onSelectVariant({ title: groups[0].title, variant: groups[0].primaryVariant });
          }
        }}
      />
      {open ? (
        <div id={listboxId} role="listbox" aria-label="Movement reuse suggestions" className={styles.listbox}>
          {loading ? <div role="status" className={styles.status}>Loading suggestions</div> : null}
          {!loading && !error && groups.map((group) => (
            <div key={group.normalizedTitle} className={styles.group}>
              <div className={styles.row}>
                <button type="button" role="option" aria-selected="false" className={styles.selection} onClick={() => onSelectVariant({ title: group.title, variant: group.primaryVariant })}>
                  <span className={styles.title}>{group.title}</span>
                  <MovementReuseVariantMetadata variant={group.primaryVariant} />
                </button>
                {group.variantCount > 1 ? (
                  <button type="button" className={styles.expand} aria-label={`Show ${group.variantCount - 1} other ${group.title} variants`} onClick={() => onToggleGroup(group)}>
                    {group.variantCount} ›
                  </button>
                ) : null}
              </div>
              {expandedTitle === group.normalizedTitle ? variants.map((variant) => (
                <button key={variant.deterministicKey} type="button" role="option" aria-selected="false" className={styles.alternative} onClick={() => onSelectVariant({ title: group.title, variant })}>
                  <MovementReuseVariantMetadata variant={variant} />
                </button>
              )) : null}
            </div>
          ))}
          {error ? <div role="status" className={styles.status}>{error}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
