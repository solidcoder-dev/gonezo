import { describe, expect, it } from 'vitest';
import { DefaultMovementEntryInterpretationUsabilityPolicy } from './MovementEntryInterpretationUsabilityPolicy';

describe('DefaultMovementEntryInterpretationUsabilityPolicy', () => {
  const policy = new DefaultMovementEntryInterpretationUsabilityPolicy();

  it('reports usable when at least one field is resolved', () => {
    expect(policy.evaluate({
      specId: 'gonezo-movement-entry',
      specVersion: '1',
      fields: [
        {
          key: 'amount',
          interpretation: {
            kind: 'resolved',
            candidate: {
              value: { type: 'decimal', value: '20' },
              confidence: 0.95,
            },
          },
        },
      ],
      issues: [],
    })).toBe('USABLE');
  });

  it('reports no usable fields when everything is missing or ambiguous', () => {
    expect(policy.evaluate({
      specId: 'gonezo-movement-entry',
      specVersion: '1',
      fields: [
        {
          key: 'amount',
          interpretation: { kind: 'missing' },
        },
        {
          key: 'type',
          interpretation: {
            kind: 'ambiguous',
            candidates: [
              {
                value: { type: 'enum', value: 'expense' },
                confidence: 0.6,
              },
              {
                value: { type: 'enum', value: 'income' },
                confidence: 0.4,
              },
            ],
          },
        },
      ],
      issues: [],
    })).toBe('NO_USABLE_FIELDS');
  });
});
