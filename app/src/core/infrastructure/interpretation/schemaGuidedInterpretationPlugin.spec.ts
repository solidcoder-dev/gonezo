import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SchemaGuidedInterpretationPlugin,
  type SchemaGuidedInterpretationPluginRequest,
} from './schemaGuidedInterpretationPlugin';

const { nativeInterpret, nativeCancel } = vi.hoisted(() => ({
  nativeInterpret: vi.fn(),
  nativeCancel: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  registerPlugin: vi.fn(() => ({
    interpret: nativeInterpret,
    cancel: nativeCancel,
  })),
}));

const requestFixturePath = resolve(process.cwd(), '../core/schema-guided-interpretation-json/src/test/resources/fixtures/interpretation-request.1.json');

describe('SchemaGuidedInterpretationPlugin', () => {
  beforeEach(() => {
    nativeInterpret.mockReset();
    nativeCancel.mockReset();
  });

  it('encodes semantic requests for Capacitor and decodes native results', async () => {
    const request = buildBridgeRequest();
    const requestFixture = JSON.parse(readFileSync(requestFixturePath, 'utf8')) as unknown;
    const resultJson = JSON.stringify({
      contractVersion: '1',
      specId: 'gonezo-movement-entry',
      version: '1',
      fields: [
        {
          key: 'amount',
          interpretation: {
            kind: 'resolved',
            candidate: {
              value: {
                type: 'decimal',
                value: '34.80',
              },
              confidence: 0.92,
            },
          },
        },
      ],
      issues: [
        {
          code: 'example-warning',
          message: 'Example warning',
          level: 'WARNING',
        },
      ],
    });

    nativeInterpret.mockResolvedValue({
      kind: 'success',
      resultJson,
    });

    await expect(SchemaGuidedInterpretationPlugin.interpret(request)).resolves.toEqual({
      kind: 'success',
      result: {
        specId: 'gonezo-movement-entry',
        specVersion: '1',
        fields: [
          {
            key: 'amount',
            interpretation: {
              kind: 'resolved',
              candidate: {
                value: {
                  type: 'decimal',
                  value: '34.80',
                },
                confidence: 0.92,
              },
            },
          },
        ],
        issues: [
          {
            code: 'example-warning',
            message: 'Example warning',
            level: 'warning',
          },
        ],
      },
    });

    expect(nativeInterpret).toHaveBeenCalledWith(expect.objectContaining({
      runId: request.runId,
      requestId: request.requestId,
      requestJson: expect.any(String),
    }));
    const nativeRequest = nativeInterpret.mock.calls[0]?.[0] as { requestJson: string };
    expect(JSON.parse(nativeRequest.requestJson)).toEqual(requestFixture);
  });

  it('rejects incompatible native results as malformed_output', async () => {
    const request = buildBridgeRequest();
    nativeInterpret.mockResolvedValue({
      kind: 'success',
      resultJson: '{"contractVersion":"1","specId":"gonezo-movement-entry","specVersion":"1","fields":[],"issues":[]}',
    });

    await expect(SchemaGuidedInterpretationPlugin.interpret(request)).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'malformed_output',
        recoverable: false,
        message: 'Missing required interpretation property version.',
      },
    });
  });

  it.each([
    ['model_unavailable', 'model_unavailable'],
    ['model_corrupt', 'model_corrupt'],
    ['unsupported_device', 'unsupported_device'],
    ['inference_failed', 'inference_failed'],
  ] as const)('preserves native failure code %s', async (nativeCode, expectedCode) => {
    const request = buildBridgeRequest();
    nativeInterpret.mockResolvedValue({
      kind: 'failure',
      failure: {
        code: nativeCode,
        recoverable: true,
        message: 'Native failure',
      },
    });

    await expect(SchemaGuidedInterpretationPlugin.interpret(request)).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: expectedCode,
        recoverable: true,
        message: 'Native failure',
      },
    });
  });

  it('rejects incompatible semantic requests before calling Capacitor', async () => {
    const request = buildBridgeRequest();
    const invalidRequest = {
      ...request,
      interpretationRequest: {
        ...request.interpretationRequest,
        interpretationSpec: {
          ...request.interpretationRequest.interpretationSpec,
          fields: [
            {
              ...request.interpretationRequest.interpretationSpec.fields[0],
              type: 'currency',
            },
          ],
        },
      },
    } as unknown as SchemaGuidedInterpretationPluginRequest;

    await expect(SchemaGuidedInterpretationPlugin.interpret(invalidRequest)).resolves.toEqual({
      kind: 'failure',
      failure: {
        code: 'invalid_request',
        recoverable: false,
        message: 'Unknown interpretation value type currency.',
      },
    });

    expect(nativeInterpret).not.toHaveBeenCalled();
  });

  it('forwards cancellations to the native bridge', async () => {
    await SchemaGuidedInterpretationPlugin.cancel('request-1');

    expect(nativeCancel).toHaveBeenCalledWith({ requestId: 'request-1' });
  });
});

function buildBridgeRequest(): SchemaGuidedInterpretationPluginRequest {
  return {
    runId: '11111111-1111-1111-1111-111111111111',
    requestId: '22222222-2222-2222-2222-222222222222',
    interpretationRequest: {
      contractVersion: '1',
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
    },
  };
}
