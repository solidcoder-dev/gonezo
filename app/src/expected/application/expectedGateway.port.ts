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
