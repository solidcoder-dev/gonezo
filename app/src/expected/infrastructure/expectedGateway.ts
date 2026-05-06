import type {
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
} from '../../shared/domain/corePort';

export type ExpectedGatewayPort = {
  expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult>;
  expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult>;
  expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult>;
  expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void>;
  expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void>;
};

export function createExpectedGateway(core: ExpectedGatewayPort): ExpectedGatewayPort {
  return {
    expectedCreateMovement: (input) => core.expectedCreateMovement(input),
    expectedUpdateMovement: (input) => core.expectedUpdateMovement(input),
    expectedListMovements: (input) => core.expectedListMovements(input),
    expectedResolveMovement: (input) => core.expectedResolveMovement(input),
    expectedDismissMovement: (input) => core.expectedDismissMovement(input),
  };
}
