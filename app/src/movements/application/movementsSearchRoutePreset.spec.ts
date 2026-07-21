import { describe, expect, it } from 'vitest';
import { parseMovementsSearchRoutePreset } from './movementsSearchRoutePreset';

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
});
