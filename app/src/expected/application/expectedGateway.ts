import type { ExpectedGatewayPort } from '../application/expectedGateway.port';

export type { ExpectedGatewayPort } from '../application/expectedGateway.port';

export function createExpectedGateway(core: ExpectedGatewayPort): ExpectedGatewayPort {
  const expectedPostMovement = core.expectedPostMovement;
  return {
    expectedCreateMovement: (input) => core.expectedCreateMovement(input),
    expectedUpdateMovement: (input) => core.expectedUpdateMovement(input),
    expectedListMovements: (input) => core.expectedListMovements(input),
    ...(expectedPostMovement ? { expectedPostMovement: (input) => expectedPostMovement(input) } : {}),
    expectedResolveMovement: (input) => core.expectedResolveMovement(input),
    expectedDismissMovement: (input) => core.expectedDismissMovement(input),
  };
}
