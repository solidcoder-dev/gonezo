import { describe, expect, it } from 'vitest';

// The executable policy is JavaScript so the same module can run in the Node quality gate.
// @ts-expect-error The repository's TypeScript program intentionally excludes scripts/.
import { findInvalidVarUsages, findLegacyPrimitiveUsages, findProhibitedClassUsages, LEGACY_PRIMITIVES, PROHIBITED_GLOBAL_CLASSES } from '../../../scripts/style-policy.mjs';

describe('style policy', () => {
  it('keeps the prohibited class list centralized and detects legacy classes in TSX', () => {
    expect(PROHIBITED_GLOBAL_CLASSES).toContain('stack');
    expect(findProhibitedClassUsages('<div className="stack page" />')).toEqual(['stack']);
  });

  it('does not flag CSS Module property access as a global class', () => {
    expect(findProhibitedClassUsages('<div className={styles.card} />')).toEqual([]);
    expect(findProhibitedClassUsages('<p>{copy.card}</p>')).toEqual([]);
  });

  it('keeps the legacy primitive migration map centralized', () => {
    expect(LEGACY_PRIMITIVES['text-button']).toBe('gz-text-button');
    expect(LEGACY_PRIMITIVES['chip-row']).toBe('gz-chip-row');
  });

  it.each([
    ['literal', '<button className="text-button" />'],
    ['clsx', "clsx('icon-button', enabled && 'chip-row')"],
    ['array', "['section-gap', active && 'hint']"],
    ['template', "`composer-more-options ${open ? 'text-button' : ''}`"],
  ])('detects legacy primitives in a %s expression', (_kind: string, source: string) => {
    expect(findLegacyPrimitiveUsages(source).map(({ name, replacement }: { name: string; replacement: string }) => ({ name, replacement }))).toEqual(
      expect.arrayContaining(Object.entries(LEGACY_PRIMITIVES).filter(([name]) => source.includes(name)).map(([name, replacement]) => ({ name, replacement }))),
    );
  });

  it('does not flag similar names or valid gz primitives', () => {
    expect(findLegacyPrimitiveUsages("const hintText = 'hint-text'; const className = 'gz-hint';")).toEqual([]);
  });

  it('rejects var() without a custom-property name', () => {
    expect(findInvalidVarUsages('gap: var(1rem);')).toEqual(['var(1rem)']);
    expect(findInvalidVarUsages('gap: var(--space-md);')).toEqual([]);
  });
});
