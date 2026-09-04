import type { MovementReuseSuggestionGroup, MovementReuseSuggestionVariant } from '../../../movements/application/movementReuseSuggestions.port';
import styles from './MovementReuseAutocompleteView.module.css';

export type MovementReuseAutocompleteViewProps = {
  query: string;
  open: boolean;
  loading: boolean;
  groups: MovementReuseSuggestionGroup[];
  expandedTitle: string | null;
  variants: MovementReuseSuggestionVariant[];
  error?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onToggleGroup: (group: MovementReuseSuggestionGroup) => void;
  onSelectVariant: (variant: MovementReuseSuggestionVariant, title?: string) => void;
};

function variantSummary(variant: MovementReuseSuggestionVariant): string {
  const parts = [variant.accountName, variant.category?.name, ...variant.tags.map((tag) => `#${tag.name}`)].filter(Boolean);
  return parts.join(' · ');
}

export function MovementReuseAutocompleteView({
  query,
  open,
  loading,
  groups,
  expandedTitle,
  variants,
  error,
  onChange,
  onClose,
  onToggleGroup,
  onSelectVariant,
}: MovementReuseAutocompleteViewProps) {
  const listboxId = 'movement-reuse-suggestions';
  return (
    <div className={styles.autocomplete}>
      <input
        className="form-control"
        role="combobox"
        aria-label="Merchant or source"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
          if (event.key === 'Enter' && groups[0]) onSelectVariant(groups[0].primaryVariant, groups[0].title);
        }}
      />
      {open ? (
          <div id={listboxId} role="listbox" aria-label="Movement reuse suggestions" className={styles.listbox}>
          {loading ? <div role="status" className={styles.status}>Loading suggestions</div> : null}
          {!loading && !error && groups.map((group) => (
            <div key={group.normalizedTitle} className={styles.group}>
              <div className={styles.row}>
                <button type="button" role="option" aria-selected="false" className={styles.selection} onClick={() => onSelectVariant(group.primaryVariant, group.title)}>
                  <span className={styles.title}>{group.title}</span>
                  <span className={styles.meta}>{variantSummary(group.primaryVariant)} · ◫ {group.primaryVariant.itemCount} · 👥 {group.primaryVariant.shareCount}</span>
                </button>
                {group.variantCount > 1 ? (
                  <button type="button" className={styles.expand} aria-label={`Show ${group.variantCount - 1} other ${group.title} variants`} onClick={() => onToggleGroup(group)}>
                    {group.variantCount} ›
                  </button>
                ) : null}
              </div>
              {expandedTitle === group.normalizedTitle ? variants.map((variant) => (
                <button key={variant.deterministicKey} type="button" role="option" aria-selected="false" className={styles.alternative} onClick={() => onSelectVariant(variant)}>
                  {variantSummary(variant)}
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
