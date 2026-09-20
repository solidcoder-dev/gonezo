import { ExactDecimal } from '../../shared/domain/exactDecimal';

export function exactMedian(values: readonly ExactDecimal[]): ExactDecimal | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left.compare(right));
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) return ordered[middle];
  const left = ordered[middle - 1];
  const right = ordered[middle];
  return left.add(right).ratioTo(ExactDecimal.from(2), Math.max(decimalPlaces(left), decimalPlaces(right)) + 1);
}

function decimalPlaces(value: ExactDecimal): number {
  return value.toString().split('.')[1]?.length ?? 0;
}
