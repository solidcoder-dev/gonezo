const DEFAULT_TICK_COUNT = 5;

function roundedStepCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / power) * power;
}

export function buildUniformYAxisTicks(maxValue: number, tickCount = DEFAULT_TICK_COUNT): number[] {
  const count = Math.max(2, Math.trunc(tickCount));
  const max = Math.max(0, Number.isFinite(maxValue) ? maxValue : 0);
  const step = roundedStepCeil(max / (count - 1));
  return Array.from({ length: count }, (_, index) => step * index);
}

export type NiceYAxisRange = { domain: [number, number]; ticks: number[] };

export function buildNiceYAxisRange(values: number[], preferredTickCount = 5): NiceYAxisRange {
  const finiteValues = values.filter(Number.isFinite);
  if (finiteValues.length === 0) return { domain: [0, 0], ticks: [] };
  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const padding = rawMin === rawMax
    ? Math.max(Math.abs(rawMin) * 0.02, 1)
    : Math.max((rawMax - rawMin) * 0.12, 1);
  const targetMin = rawMin - padding;
  const targetMax = rawMax + padding;
  const count = Math.max(2, Math.trunc(preferredTickCount));
  const roughStep = (targetMax - targetMin) / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const factor = [1, 2, 5, 10].find((candidate) => candidate >= normalized) ?? 10;
  const step = factor * magnitude;
  const niceMin = Math.floor(targetMin / step) * step;
  const niceMax = Math.ceil(targetMax / step) * step;
  const ticks: number[] = [];
  for (let tick = niceMin; tick <= niceMax + step * 0.000001; tick += step) ticks.push(Number(tick.toFixed(10)));
  return { domain: [niceMin, niceMax], ticks };
}

export function formatExactAxisValue(value: number, prefix = ''): string {
  if (Math.abs(value) >= 1000) {
    const compact = Number((value / 1000).toFixed(1));
    return `${prefix}${compact}k`;
  }
  return `${prefix}${Math.round(value)}`;
}
