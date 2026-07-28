import { describe, expect, it } from 'vitest';

// The executable policy is JavaScript so the same module can run in the Node quality gate.
// @ts-expect-error The repository's TypeScript program intentionally excludes scripts/.
import { DARK_SEMANTIC_CONTRAST_PAIRS, SEMANTIC_CONTRAST_PAIRS, contrastRatio } from '../../../scripts/check-color-contrast.mjs';

describe('semantic color contrast', () => {
  it.each(Object.entries(SEMANTIC_CONTRAST_PAIRS) as Array<[string, [string, string]]>)('keeps %s at AA contrast for normal text', (_name, [background, foreground]) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the semantic contrast contract stable for the main tones', () => {
    expect(Object.keys(SEMANTIC_CONTRAST_PAIRS)).toEqual([
      'brand',
      'income',
      'expense',
      'transfer',
      'success',
      'warning',
      'danger',
      'info',
    ]);
  });

  it('keeps the dark theme semantic contrast contract aligned with WCAG AA', () => {
    expect(Object.keys(DARK_SEMANTIC_CONTRAST_PAIRS)).toEqual(Object.keys(SEMANTIC_CONTRAST_PAIRS));
    for (const [name, [background, foreground]] of Object.entries(DARK_SEMANTIC_CONTRAST_PAIRS) as Array<[string, [string, string]]>) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      expect(name).toBeTruthy();
    }
  });
});
