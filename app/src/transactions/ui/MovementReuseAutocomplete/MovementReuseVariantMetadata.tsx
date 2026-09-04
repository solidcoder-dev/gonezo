import type { MovementReuseSuggestionVariant } from '../../../movements/application/movementReuseSuggestions.port';
import styles from './MovementReuseAutocompleteView.module.css';

export function MovementReuseVariantMetadata({ variant }: { variant: MovementReuseSuggestionVariant }) {
  const metadata = [variant.accountName, variant.category?.name, ...variant.tags.map((tag) => `#${tag.name}`)].filter(Boolean);
  return (
    <span className={styles.metadataRow}>
      <span className={styles.metadataSummary}>{metadata.join(' · ')}</span>
      <span className={styles.metadataCounters}>
        {variant.itemCount > 0 ? <span aria-label={`${variant.itemCount} items`}>◫ {variant.itemCount}</span> : null}
        {variant.shareCount > 0 ? <span aria-label={`${variant.shareCount} shares`}>👥 {variant.shareCount}</span> : null}
      </span>
    </span>
  );
}
