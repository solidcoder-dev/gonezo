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

export function formatExactAxisValue(value: number, prefix = ''): string {
  if (Math.abs(value) >= 1000) {
    const compact = Number((value / 1000).toFixed(1));
    return `${prefix}${compact}k`;
  }
  return `${prefix}${Math.round(value)}`;
}
