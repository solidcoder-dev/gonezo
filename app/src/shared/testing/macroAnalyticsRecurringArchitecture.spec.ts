import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Macro Analytics recurring architecture', () => {
  it('keeps operational fact access outside domain/application and recurring identities inside aggregation', () => {
    const aggregator = readFileSync(resolve('src/macroAnalytics/domain/recurringContribution.ts'), 'utf8');
    const contribution = readFileSync(resolve('src/macroAnalytics/domain/macroAnalyticsContribution.ts'), 'utf8');
    const builder = readFileSync(resolve('src/macroAnalytics/application/buildMacroAnalyticsContribution.ts'), 'utf8');
    const wire = readFileSync(resolve('src/macroAnalytics/infrastructure/MacroAnalyticsPublicationWireV3.ts'), 'utf8');

    expect(aggregator).not.toMatch(/from ['"].*infrastructure\//u);
    expect(builder).not.toMatch(/from ['"].*infrastructure\//u);
    expect(contribution).not.toContain('seriesId');
    expect(wire).not.toContain('seriesId');
    expect(wire).not.toContain('occurrenceId');
    expect(wire).not.toContain('recurringMovementId');
  });
});
