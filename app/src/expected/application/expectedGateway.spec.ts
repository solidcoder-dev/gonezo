import { describe, expect, it, vi } from 'vitest';
import type { ExpectedGatewayPort } from './expectedGateway.port';
import { createExpectedGateway } from './expectedGateway';

function coreWithExpectedPostMovement(expectedPostMovement?: ExpectedGatewayPort['expectedPostMovement']) {
  return {
    expectedCreateMovement: vi.fn(),
    expectedUpdateMovement: vi.fn(),
    expectedListMovements: vi.fn(),
    expectedResolveMovement: vi.fn(),
    expectedDismissMovement: vi.fn(),
    ...(expectedPostMovement ? { expectedPostMovement } : {}),
  } as unknown as ExpectedGatewayPort;
}

describe('createExpectedGateway', () => {
  it('preserves the optional expected posting capability and its input/result', async () => {
    const input = {
      expectedMovementId: 'expected-1',
      movement: {
        accountId: 'account-1',
        type: 'expense' as const,
        amount: '12.00',
        currency: 'EUR',
        splitItems: [],
      },
      occurredAt: '2026-07-21T10:00:00.000Z',
      categoryId: 'category-1',
      tagNames: ['home'],
      ignored: false,
      idempotencyKey: 'expected-1',
    };
    const result = { transactionId: 'transaction-1', nextExpectedMovementId: 'expected-2' };
    const expectedPostMovement = vi.fn(async () => result);
    const gateway = createExpectedGateway(coreWithExpectedPostMovement(expectedPostMovement));

    await expect(gateway.expectedPostMovement?.(input)).resolves.toBe(result);
    expect(expectedPostMovement).toHaveBeenCalledWith(input);
  });

  it('does not invent expected posting when the core does not offer it', () => {
    const gateway = createExpectedGateway(coreWithExpectedPostMovement());

    expect(gateway.expectedPostMovement).toBeUndefined();
    expect(gateway.expectedCreateMovement).toBeDefined();
    expect(gateway.expectedResolveMovement).toBeDefined();
  });
});
