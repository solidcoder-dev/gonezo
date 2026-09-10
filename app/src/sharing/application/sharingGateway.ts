import type { SharingGatewayPort } from './sharingGateway.port';

export type { SharingGatewayPort } from './sharingGateway.port';

export function createSharingGateway(core: SharingGatewayPort): SharingGatewayPort {
  return {
    sharingListPeople: () => core.sharingListPeople(),
    sharingApplyShareToPostedMovement: (input) => core.sharingApplyShareToPostedMovement(input),
    sharingGetMovementDetails: (input) => core.sharingGetMovementDetails(input),
    sharingListMovementDetails: (input) => core.sharingListMovementDetails(input),
  };
}
