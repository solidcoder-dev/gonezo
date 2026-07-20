function parseDecimal(value: string): { units: bigint; scale: number } {
  const normalized = value.trim();
  const sign = normalized.startsWith('-') ? -1n : 1n;
  const unsigned = normalized.replace(/^[+-]/, '');
  const [whole = '0', fraction = ''] = unsigned.split('.');
  const digits = `${whole || '0'}${fraction}`.replace(/^0+(?=\d)/, '') || '0';
  return { units: sign * BigInt(digits), scale: fraction.length };
}

export function addDecimalAmounts(left: string, right: string): string {
  const first = parseDecimal(left);
  const second = parseDecimal(right);
  const scale = Math.max(first.scale, second.scale);
  const multiplier = (value: { units: bigint; scale: number }) => value.units * (10n ** BigInt(scale - value.scale));
  const units = multiplier(first) + multiplier(second);
  const negative = units < 0n;
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  if (scale === 0) {
    return `${negative ? '-' : ''}${digits}`;
  }
  return `${negative ? '-' : ''}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

export function isZeroDecimalAmount(value: string): boolean {
  return parseDecimal(value).units === 0n;
}
