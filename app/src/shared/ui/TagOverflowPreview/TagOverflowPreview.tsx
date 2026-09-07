import { useLayoutEffect, useRef, useState } from 'react';
import styles from './TagOverflowPreview.module.css';

export type TagOverflowPreviewProps = {
  tags: string[];
  emptyLabel?: string;
};

export function TagOverflowPreview({ tags, emptyLabel = 'No tags' }: TagOverflowPreviewProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const tagRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const overflowRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const update = () => {
      const width = container.clientWidth;
      if (width <= 0) return;
      let used = 0;
      let count = 0;
      const gap = 4;
      for (let index = 0; index < tags.length; index += 1) {
        const remaining = tags.length - index - 1;
        const tagWidth = tagRefs.current[index]?.getBoundingClientRect().width ?? 0;
        const overflowWidth = remaining > 0
          ? (overflowRefs.current[remaining]?.getBoundingClientRect().width ?? 0) + gap
          : 0;
        const nextWidth = tagWidth + (count > 0 ? gap : 0);
        if (used + nextWidth + overflowWidth > width) break;
        used += nextWidth;
        count += 1;
      }
      setVisibleCount(count);
    };

    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, [tags]);

  if (tags.length === 0) return <span className="text-secondary" data-testid="tag-overflow-preview">{emptyLabel}</span>;
  const hiddenCount = tags.length - visibleCount;
  return (
    <span ref={containerRef} className="d-inline-flex gap-1 text-truncate" aria-label={tags.join(', ')} data-testid="tag-overflow-preview">
      {tags.slice(0, visibleCount).map((tag) => <span key={tag} className="text-truncate">#{tag}</span>)}
      {hiddenCount > 0 ? <span aria-label={`${hiddenCount} more tags`}>+{hiddenCount}</span> : null}
      <span className={styles.measurements} aria-hidden>
        {tags.map((tag, index) => <span key={tag} ref={(element) => { tagRefs.current[index] = element; }}>#{tag}</span>)}
        {tags.slice(1).map((_, index) => {
          const remaining = index + 1;
          return <span key={remaining} ref={(element) => { overflowRefs.current[remaining] = element; }}>+{remaining}</span>;
        })}
      </span>
    </span>
  );
}
