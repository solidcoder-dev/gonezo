export type DateFilterBoundary = 'start' | 'end';

export function parseDateFilterEpoch(value: string | undefined, boundary: DateFilterBoundary): number | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const suffix = boundary === 'start' ? 'T00:00:00.000' : 'T23:59:59.999';
    const epoch = Date.parse(`${normalized}${suffix}`);
    return Number.isFinite(epoch) ? epoch : undefined;
  }
  const epoch = Date.parse(normalized);
  return Number.isFinite(epoch) ? epoch : undefined;
}

