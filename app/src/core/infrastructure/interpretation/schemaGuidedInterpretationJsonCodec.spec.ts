import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SchemaGuidedInterpretationRequest } from '../../application/interpretation/schemaGuidedInterpretationContract';
import {
  SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
  SchemaGuidedInterpretationJsonCodec,
  SchemaGuidedInterpretationJsonError,
} from './schemaGuidedInterpretationJsonCodec';

const requestFixturePath = resolve(process.cwd(), '../core/schema-guided-interpretation-json/src/test/resources/fixtures/interpretation-request.1.json');
const resultFixturePath = resolve(process.cwd(), '../core/schema-guided-interpretation-json/src/test/resources/fixtures/interpretation-result.1.json');

describe('SchemaGuidedInterpretationJsonCodec', () => {
  it('encodes the semantic request into the shared Kotlin-compatible request fixture', () => {
    const codec = new SchemaGuidedInterpretationJsonCodec();
    const request = buildRequest();

    const actual = JSON.parse(codec.encodeRequest(request));
    const expected = JSON.parse(readFileSync(requestFixturePath, 'utf8')) as unknown;

    expect(actual).toEqual(expected);
    expect(actual).toEqual(expect.objectContaining({
      contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
      input: request.inputSource.text,
      spec: expect.objectContaining({
        contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
        specId: request.interpretationSpec.id,
        version: request.interpretationSpec.version,
      }),
    }));
    expect(actual).toEqual(expect.objectContaining({
      spec: expect.not.objectContaining({
        id: expect.anything(),
      }),
    }));
    expect((actual as { spec: { fields: Array<{ type: string }> } }).spec.fields[0].type).toBe('ENUM');
    expect((actual as { context: { entries: Array<{ key: string; value: { type: string; value: string | number | boolean } }> } }).context.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'currentDate',
        value: expect.objectContaining({
          type: 'date',
          value: '2026-07-16',
        }),
      }),
    ]));
  });

  it('decodes the shared Kotlin result fixture into the application result model', () => {
    const codec = new SchemaGuidedInterpretationJsonCodec();
    const result = codec.decodeResult(readFileSync(resultFixturePath, 'utf8'));

    expect(result.specId).toBe('gonezo-movement-entry');
    expect(result.specVersion).toBe('1');
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toEqual(expect.objectContaining({
      key: 'amount',
      interpretation: expect.objectContaining({
        kind: 'resolved',
        candidate: expect.objectContaining({
          value: {
            type: 'decimal',
            value: '34.80',
          },
          confidence: 0.92,
        }),
      }),
    }));
    expect(result.issues).toEqual([
      {
        code: 'example-warning',
        message: 'Example warning',
        level: 'warning',
      },
    ]);
  });

  it.each([
    ['malformed JSON', '{'],
    ['unsupported contract version', '{"contractVersion":"2","specId":"gonezo-movement-entry","version":"1","fields":[],"issues":[]}'],
    ['specVersion in place of version', '{"contractVersion":"1","specId":"gonezo-movement-entry","specVersion":"1","fields":[],"issues":[]}'],
    ['unknown property', '{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[],"issues":[],"unexpected":true}'],
    ['confidence above range', '{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","interpretation":{"kind":"resolved","candidate":{"value":{"type":"decimal","value":"34.80"},"confidence":1.2}}}],"issues":[]}'],
    ['unknown value type', '{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","interpretation":{"kind":"resolved","candidate":{"value":{"type":"currency","value":"34.80"},"confidence":0.92}}}],"issues":[]}'],
    ['unknown interpretation kind', '{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[{"key":"amount","interpretation":{"kind":"merged"}}],"issues":[]}'],
    ['unknown issue level', '{"contractVersion":"1","specId":"gonezo-movement-entry","version":"1","fields":[],"issues":[{"code":"example-warning","message":"Example warning","level":"CRITICAL"}]}'],
  ])('rejects %s', (_, json) => {
    const codec = new SchemaGuidedInterpretationJsonCodec();

    expect(() => codec.decodeResult(json)).toThrowError(SchemaGuidedInterpretationJsonError);
  });
});

function buildRequest(): Omit<SchemaGuidedInterpretationRequest, 'requestId'> {
  return {
    contractVersion: SCHEMA_GUIDED_INTERPRETATION_CONTRACT_VERSION,
    inputSource: {
      kind: 'transcript',
      text: 'Gasté 34,80 euros ayer en comida',
    },
    inputLanguage: 'es',
    interpretationSpec: {
      id: 'gonezo-movement-entry',
      version: '1',
      fields: [
        {
          key: 'type',
          description: 'Financial direction expressed by the user',
          type: 'enum',
          required: false,
          allowedValues: [
            { stableValue: 'expense', label: 'Expense' },
            { stableValue: 'income', label: 'Income' },
          ],
        },
        {
          key: 'amount',
          description: 'Monetary amount explicitly mentioned by the user',
          type: 'decimal',
          required: false,
        },
      ],
    },
    interpretationContext: {
      entries: [
        {
          key: 'currentDate',
          value: {
            type: 'date',
            value: '2026-07-16',
          },
        },
        {
          key: 'timeZone',
          value: {
            type: 'text',
            value: 'Atlantic/Canary',
          },
        },
        {
          key: 'locale',
          value: {
            type: 'text',
            value: 'es-ES',
          },
        },
        {
          key: 'currency',
          value: {
            type: 'text',
            value: 'EUR',
          },
        },
      ],
    },
  };
}
