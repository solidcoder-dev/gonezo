import type { ExactDecimal } from './exactDecimal';

export class MetricKey {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): MetricKey {
    if (!/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(value)) throw new Error('Metric key must be a canonical lowercase identifier');
    return new MetricKey(value);
  }
}

export class MetricVersion {
  readonly value: number;

  private constructor(value: number) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: number): MetricVersion {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error('Metric version must be a positive integer');
    return new MetricVersion(value);
  }
}

export class MetricId {
  readonly key: MetricKey;
  readonly version: MetricVersion;

  private constructor(key: MetricKey, version: MetricVersion) {
    this.key = key;
    this.version = version;
    Object.freeze(this);
  }

  static create(key: MetricKey, version: MetricVersion): MetricId {
    return new MetricId(key, version);
  }

  toString(): string {
    return `${this.key.value}:v${this.version.value}`;
  }
}

export type MetricValueKind = 'MONEY' | 'RATIO' | 'COUNT';

export type MetricDefinition = Readonly<{ id: MetricId; valueKind: MetricValueKind }>;

export function defineMetric(input: Readonly<{ key: string; version?: number; valueKind: MetricValueKind }>): MetricDefinition {
  return createMetricDefinition(MetricId.create(MetricKey.create(input.key), MetricVersion.create(input.version ?? 1)), input.valueKind);
}

export type MetricValue =
  | Readonly<{ kind: 'MONEY'; value: ExactDecimal; currency: string }>
  | Readonly<{ kind: 'RATIO'; value: ExactDecimal }>
  | Readonly<{ kind: 'COUNT'; value: number }>;

export function createMetricDefinition(id: MetricId, valueKind: MetricValueKind): MetricDefinition {
  return Object.freeze({ id, valueKind });
}

export function moneyMetricValue(value: ExactDecimal, currency: string): MetricValue {
  const normalizedCurrency = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) throw new Error('Money metric requires a three-letter currency');
  return Object.freeze({ kind: 'MONEY', value, currency: normalizedCurrency });
}

export function ratioMetricValue(value: ExactDecimal): MetricValue {
  return Object.freeze({ kind: 'RATIO', value });
}

export function countMetricValue(value: number): MetricValue {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Count metric requires a non-negative integer');
  return Object.freeze({ kind: 'COUNT', value });
}
