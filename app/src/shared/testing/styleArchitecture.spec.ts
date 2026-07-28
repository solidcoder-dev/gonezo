import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = resolve(import.meta.dirname, '..', '..');
const readSource = (relativePath: string) => readFileSync(resolve(sourceRoot, relativePath), 'utf8');

describe('style architecture', () => {
  it('keeps Bootstrap before document and primitive overrides', () => {
    const entry = readSource('main.tsx');
    expect(entry.indexOf("./styles/bootstrap.scss")).toBeLessThan(entry.indexOf("./index.css"));
    expect(entry.indexOf("./index.css")).toBeLessThan(entry.indexOf("./shared/ui/primitives.css"));
  });

  it('keeps semantic tokens and category colors in the central token file', () => {
    const tokens = readSource('styles/_gonezo-tokens.scss');
    const index = readSource('index.css');
    const generated = readSource('styles/_theme-colors.generated.scss');
    expect(tokens).toContain('--color-brand: var(--bs-primary)');
    expect(tokens).toContain('--color-income: var(--bs-success)');
    expect(tokens).toContain('--color-expense: var(--bs-danger)');
    expect(tokens).toContain('--color-transfer: var(--bs-info)');
    expect(tokens).toContain('--category-purple');
    expect(generated).toContain('$brand-color: #16752e;');
    expect(generated).toContain('$income-color: #149447;');
    expect(index).not.toContain('--color-brand:');
    expect(index).not.toContain('--color-surface-primary:');
  });

  it('defines the required structural token contract', () => {
    const tokens = readSource('styles/_gonezo-tokens.scss');
    for (const token of [
      '--color-text-inverse', '--color-surface-muted', '--analytics-filter-bar-height',
      '--app-bottom-navigation-height', '--shadow-sm', '--shadow-md', '--shadow-lg',
      '--shadow-floating', '--shadow-card', '--shadow-switch-thumb', '--color-text-danger', '--control-height', '--touch-target-min',
      '--z-header', '--z-sticky', '--z-navigation', '--z-sheet', '--z-modal', '--z-toast', '--z-content',
      '--color-action-primary', '--color-navigation-active', '--color-focus-ring', '--app-content-max-width', '--space-md',
      '--font-family-body', '--color-on-brand', '--color-on-warning', '--color-on-success', '--color-on-info',
    ]) {
      expect(tokens).toContain(`${token}:`);
    }
    expect(tokens).not.toContain('--gz-');
  });

  it('keeps action states distinct and defines complete theme and scale contracts', () => {
    const tokens = readSource('styles/_gonezo-tokens.scss');
    expect(tokens).toContain('--color-action-primary: var(--color-brand);');
    expect(tokens).toContain('--color-action-primary-hover: var(--color-brand-hover);');
    expect(tokens).not.toContain('--color-action-primary: var(--color-brand-hover);');
    for (const token of ['--space-2xs', '--space-xs', '--space-sm', '--space-md', '--space-lg', '--space-xl', '--space-2xl', '--space-3xl', '--font-size-xs', '--font-size-3xl', '--line-height-tight', '--font-weight-bold', '--motion-duration-fast', '--radius-xl']) {
      expect(tokens).toContain(`${token}:`);
    }
    expect(tokens).toMatch(/^:root\s*\{/m);
    expect(tokens).toContain("[data-bs-theme='dark']");
    for (const token of ['--color-surface', '--color-text-primary', '--color-border-default', '--color-action-primary', '--color-income', '--color-expense', '--color-transfer', '--color-error']) {
      expect(tokens).toMatch(new RegExp(`--${token.slice(2)}:`));
    }
  });

  it('does not define Bootstrap component class names as global Gonezo selectors', () => {
    const css = readSource('shared/ui/primitives.css');
    for (const selector of ['.card', '.toast', '.btn', '.container', '.row', '.form-control', '.form-select']) {
      expect(css).not.toMatch(new RegExp(`^${selector.replace('.', '\\.')}(?:\\s|\\{|,)`, 'm'));
    }
  });

  it('keeps shadow construction and reduced motion centralized', () => {
    const sources = readSource('styles/_gonezo-tokens.scss');
    const index = readSource('index.css');
    expect(sources).toContain('--shadow-floating:');
    expect(index).toContain('@media (prefers-reduced-motion: reduce)');
    expect(readSource('analytics/ui/FlowTab/FlowTabView.module.css')).not.toContain('prefers-reduced-motion');
    expect(readSource('analytics/ui/OverviewSnapshotCard/OverviewSnapshotCardView.module.css')).not.toContain('var(1rem)');
  });

  it('keeps validation errors on the semantic danger token', () => {
    const primitives = readSource('shared/ui/primitives.css');
    expect(primitives).toContain('color: var(--color-text-danger)');
    expect(primitives).not.toContain('color: var(--color-text-secondary);\n  font-size: 0.82rem');
  });

  it('keeps semantic ownership separate from visual similarity', () => {
    const tokens = readSource('styles/_gonezo-tokens.scss');
    const navigation = readSource('shared/ui/BottomNavigation/BottomNavigationView.css');
    const movements = readSource('movements/ui/MonthlyMovements/MonthlyMovementsView.css');
    const expected = readSource('workspace/ui/PendingExpectedOverview/PendingExpectedOverviewView.module.css');
    expect(tokens).toContain('--color-navigation-active:');
    expect(navigation).toContain('var(--color-navigation-active)');
    expect(movements).toContain('var(--color-income)');
    expect(expected).toContain('--card-tone: var(--color-income)');
    expect(movements).not.toContain('var(--color-brand-hover)');
  });

  it('keeps sticky analytics offsets composed from structural tokens', () => {
    const analytics = readSource('analytics/ui/AnalyticsPageView.module.css');
    expect(analytics).toContain('var(--app-header-height)');
    expect(analytics).toContain('var(--analytics-tabs-height)');
    expect(analytics).not.toMatch(/top:\s*60px/);
    expect(analytics).not.toMatch(/top:\s*104px/);
    expect(analytics).toContain('min-height: var(--analytics-tabs-height)');
  });

  it('keeps the semantic theme contract shared through inheritance', () => {
    const tokens = readSource('styles/_gonezo-tokens.scss');
    const required = [
      '--color-income-text', '--color-expense-text', '--color-transfer-text',
      '--color-on-brand', '--color-on-income', '--color-on-expense', '--color-on-transfer', '--color-on-danger',
      '--color-on-warning', '--color-on-success', '--color-on-info',
      '--touch-target-min', '--app-header-height', '--analytics-tabs-height', '--analytics-filter-bar-height',
    ];
    for (const token of required) {
      expect(tokens).toContain(`${token}:`);
    }
    expect(tokens.match(/\[data-bs-theme='dark'\]/g)?.length).toBe(1);
    expect(tokens).not.toMatch(/@media\s*\(max-width:\s*575px\)[\s\S]*--analytics-tabs-height/);
  });
});
