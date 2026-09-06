import { useLayoutEffect, useRef, useState } from 'react';

export type TagOverflowPreviewProps = {
  tags: string[];
  emptyLabel?: string;
};

function tagWidth(tag: string): number {
  return tag.length * 7.2 + 18;
}

export function TagOverflowPreview({ tags, emptyLabel = 'No tags' }: TagOverflowPreviewProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(tags.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const update = () => {
      const width = container.clientWidth;
      if (width <= 0) return;
      let used = 0;
      let count = 0;
      for (let index = 0; index < tags.length; index += 1) {
        const remaining = tags.length - index - 1;
        const metadataWidth = remaining > 0 ? tagWidth(`+${remaining}`) + 4 : 0;
        const nextWidth = tagWidth(tags[index]) + (count > 0 ? 4 : 0);
        if (used + nextWidth + metadataWidth > width) break;
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

  if (tags.length === 0) return <span>{emptyLabel}</span>;
  const hiddenCount = tags.length - visibleCount;
  return (
    <span ref={containerRef} className="d-inline-flex gap-1 text-truncate" aria-label={tags.join(', ')}>
      {tags.slice(0, visibleCount).map((tag) => <span key={tag} className="text-truncate">#{tag}</span>)}
      {hiddenCount > 0 ? <span aria-label={`${hiddenCount} more tags`}>+{hiddenCount}</span> : null}
    </span>
  );
}
