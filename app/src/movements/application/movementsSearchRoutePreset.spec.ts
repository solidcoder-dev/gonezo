import { describe, expect, it } from 'vitest';
import { buildMovementSearchHref, parseMovementsSearchRoutePreset, safeMovementSearchReturnTo } from './movementsSearchRoutePreset';

describe('parseMovementsSearchRoutePreset', () => {
  it('initializes pending expected expense searches without narrowing account or currency', () => {
    const preset = parseMovementsSearchRoutePreset('?source=expected&type=expense&state=pending');
    expect(preset.source).toBe('expected');
    expect(preset.types).toEqual(['expense']);
  });

  it('falls back safely for invalid values', () => {
    const preset = parseMovementsSearchRoutePreset('?source=expected&type=transfer&state=posted');
    expect(preset.source).toBe('posted');
    expect(preset.types).toEqual([]);
  });

  it('round-trips analytics drilldown fields', () => {
    const href = buildMovementSearchHref({ source: 'posted', type: 'expense', fromDate: '2026-07-01', toDate: '2026-07-31', categoryIds: ['cat-food'], tagIds: ['tag-trip'], merchant: 'Cafe', currency: 'EUR', accountIds: ['acc-1'] });
    expect(href).toBe('/movements/search?source=posted&type=expense&fromDate=2026-07-01&toDate=2026-07-31&categoryIds=cat-food&tagIds=tag-trip&currency=EUR&accountIds=acc-1&merchant=Cafe');
    expect(parseMovementsSearchRoutePreset(href.split('?')[1])).toMatchObject({ types: ['expense'], fromDate: '2026-07-01', toDate: '2026-07-31', categoryIds: ['cat-food'], tagIds: ['tag-trip'], merchant: 'Cafe', currency: 'EUR', accountIds: ['acc-1'] });
  });

  it('round-trips sharing context and normalizes duplicate identifiers', () => {
    const href = buildMovementSearchHref({
      source: 'posted',
      type: 'expense',
      currency: 'eur',
      accountIds: ['acc-1', ' acc-1 ', '', 'acc-2'],
      tagIds: ['tag-trip', 'tag-trip'],
      sharing: 'shared',
      sharingPersonId: 'person-1',
      returnTo: '/analytics?currency=EUR',
    });

    expect(parseMovementsSearchRoutePreset(href.split('?')[1])).toMatchObject({
      currency: 'EUR',
      accountIds: ['acc-1', 'acc-2'],
      tagIds: ['tag-trip'],
      sharing: 'shared',
      sharingPersonId: 'person-1',
    });
  });

  it('rejects invalid dates, sharing values and unsafe return paths', () => {
    expect(parseMovementsSearchRoutePreset('?source=posted&fromDate=07-01-2026').source).toBe('posted');
    expect(parseMovementsSearchRoutePreset('?source=posted&sharing=mine').source).toBe('posted');
    expect(buildMovementSearchHref({ source: 'posted', returnTo: '//external.example' })).toBe('/movements/search?source=posted');
    expect(safeMovementSearchReturnTo('/analytics')).toBe('/analytics');
    expect(safeMovementSearchReturnTo('/movements/new')).toBeUndefined();
  });

  it('represents uncategorized analytics expenses explicitly', () => {
    const href = buildMovementSearchHref({ source: 'posted', type: 'expense', uncategorized: true });
    expect(parseMovementsSearchRoutePreset(href.split('?')[1]).uncategorized).toBe(true);
  });
});
