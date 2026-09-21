import type { AnalyticsMovementFactItem } from '../../analytics/application/analytics.port';

export type MacroAnalyticsMovementSource = 'POSTED' | 'EXPECTED' | 'SCHEDULED';

const sourceByAnalyticsSource = {
  POSTED: 'POSTED',
  EXPECTED: 'EXPECTED',
  SCHEDULED_PROJECTION: 'SCHEDULED',
} satisfies Record<AnalyticsMovementFactItem['source'], MacroAnalyticsMovementSource>;

export function mapAnalyticsMovementSource(source: AnalyticsMovementFactItem['source']): MacroAnalyticsMovementSource {
  return sourceByAnalyticsSource[source];
}
