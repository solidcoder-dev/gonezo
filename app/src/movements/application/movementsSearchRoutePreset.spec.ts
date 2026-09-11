import { describe, expect, it } from 'vitest';
import { buildMovementSearchHref, parseMovementsSearchRoutePreset } from './movementsSearchRoutePreset';

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
    expect(parseMovementsSearchRoutePreset(href.split('?')[1])).toMatchObject({ types: ['expense'], fromDate: '2026-07-01', toDate: '2026-07-31', categoryIds: ['cat-food'], tagIds: ['tag-trip'], merchant: 'Cafe' });
  });

  it('represents uncategorized analytics expenses explicitly', () => {
    const href = buildMovementSearchHref({ source: 'posted', type: 'expense', uncategorized: true });
    expect(parseMovementsSearchRoutePreset(href.split('?')[1]).uncategorized).toBe(true);
  });
});
