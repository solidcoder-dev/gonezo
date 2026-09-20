export class ExactDecimal {
  private readonly units: bigint;
  private readonly scale: number;

  private constructor(units: bigint, scale: number) {
    this.units = units;
    this.scale = scale;
  }

  static from(value: string | number | bigint): ExactDecimal {
    const input = String(value).trim();
    const match = /^([+-]?)(\d+)(?:\.(\d+))?$/.exec(input);
    if (!match) throw new Error(`Invalid decimal value: ${input}`);
    const [, sign, whole, fraction = ''] = match;
    return new ExactDecimal((sign === '-' ? -1n : 1n) * BigInt(`${whole}${fraction}`), fraction.length);
  }

  add(other: ExactDecimal): ExactDecimal {
    const scale = Math.max(this.scale, other.scale);
    return new ExactDecimal(this.atScale(scale) + other.atScale(scale), scale);
  }

  subtract(other: ExactDecimal): ExactDecimal {
    return this.add(new ExactDecimal(-other.units, other.scale));
  }

  compare(other: ExactDecimal): number {
    const scale = Math.max(this.scale, other.scale);
    const left = this.atScale(scale);
    const right = other.atScale(scale);
    return left < right ? -1 : left > right ? 1 : 0;
  }

  ratioTo(denominator: ExactDecimal, decimalPlaces = 2): ExactDecimal {
    if (denominator.units === 0n) throw new Error('Cannot divide by zero');
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) throw new Error('Decimal places must be a non-negative integer');
    const places = BigInt(decimalPlaces);
    const numerator = this.units * (10n ** BigInt(denominator.scale)) * (10n ** places);
    const divisor = denominator.units * (10n ** BigInt(this.scale));
    const quotient = numerator / divisor;
    const remainder = numerator % divisor;
    const rounded = (remainder < 0n ? -remainder : remainder) * 2n >= (divisor < 0n ? -divisor : divisor)
      ? quotient + (numerator * divisor < 0n ? -1n : 1n)
      : quotient;
    return new ExactDecimal(rounded, decimalPlaces);
  }

  toString(): string {
    const fixed = this.toFixed(this.scale);
    return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
  }

  toFixed(scale: number): string {
    if (!Number.isInteger(scale) || scale < 0) throw new Error('Decimal places must be a non-negative integer');
    let units = this.units;
    if (scale < this.scale) {
      const divisor = 10n ** BigInt(this.scale - scale);
      const quotient = units / divisor;
      const remainder = units % divisor;
      units = (remainder < 0n ? -remainder : remainder) * 2n >= divisor
        ? quotient + (units < 0n ? -1n : 1n)
        : quotient;
    } else if (scale > this.scale) {
      units *= 10n ** BigInt(scale - this.scale);
    }
    const negative = units < 0n;
    const digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
    return scale === 0 ? `${negative ? '-' : ''}${digits}` : `${negative ? '-' : ''}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
  }

  private atScale(scale: number): bigint {
    return this.units * (10n ** BigInt(scale - this.scale));
  }
}

export function addExactDecimals(left: string, right: string): string {
  const result = ExactDecimal.from(left).add(ExactDecimal.from(right));
  const scale = Math.max(decimalScale(left), decimalScale(right));
  return result.toFixed(scale);
}

export function subtractExactDecimals(left: string, right: string): string {
  const result = ExactDecimal.from(left).subtract(ExactDecimal.from(right));
  const scale = Math.max(decimalScale(left), decimalScale(right));
  return result.toFixed(scale);
}

function decimalScale(value: string): number {
  return value.trim().split('.')[1]?.length ?? 0;
}
