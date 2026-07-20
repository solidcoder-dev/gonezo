export const TREND_HORIZONTAL_PLOT_PADDING = 2;
export const TREND_AREA_BASELINE = 56;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 48;

type TrendPoint = { x: number; y: number };

function toPlotPoints(values: number[]): TrendPoint[] {
  const finiteValues = values.map((value) => (Number.isFinite(value) ? value : 0));
  const minimum = Math.min(...finiteValues);
  const range = Math.max(...finiteValues) - minimum || 1;
  const lastIndex = finiteValues.length - 1;

  return finiteValues.map((value, index) => ({
    x: finiteValues.length === 1
      ? 50
      : TREND_HORIZONTAL_PLOT_PADDING + (index / lastIndex) * (100 - TREND_HORIZONTAL_PLOT_PADDING * 2),
    y: PLOT_TOP + (1 - (value - minimum) / range) * (PLOT_BOTTOM - PLOT_TOP),
  }));
}

function formatPoint(point: TrendPoint): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}

export function buildSmoothedTrendPath(values: number[]): string | null {
  const points = toPlotPoints(values);
  if (points.length === 0) return null;
  if (points.length === 1) return `M ${formatPoint(points[0])}`;
  if (points.length === 2) return `M ${formatPoint(points[0])} L ${formatPoint(points[1])}`;

  const segments = points.slice(0, -1).map((point, index) => {
    const previous = points[index - 1] ?? point;
    const next = points[index + 1];
    const afterNext = points[index + 2] ?? next;
    const controlOne = {
      x: point.x + (next.x - previous.x) / 6,
      y: point.y + (next.y - previous.y) / 6,
    };
    const controlTwo = {
      x: next.x - (afterNext.x - point.x) / 6,
      y: next.y - (afterNext.y - point.y) / 6,
    };
    return `C ${formatPoint(controlOne)} ${formatPoint(controlTwo)} ${formatPoint(next)}`;
  });

  return `M ${formatPoint(points[0])} ${segments.join(' ')}`;
}
