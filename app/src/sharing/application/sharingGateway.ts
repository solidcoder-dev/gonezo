import type { SharingGatewayPort } from './sharingGateway.port';

export type { SharingGatewayPort } from './sharingGateway.port';

export function createSharingGateway(core: SharingGatewayPort): SharingGatewayPort {
  return {
    sharingListPeople: () => core.sharingListPeople(),
    ...(core.sharingRenamePerson ? { sharingRenamePerson: (input: Parameters<NonNullable<SharingGatewayPort['sharingRenamePerson']>>[0]) => core.sharingRenamePerson?.(input) ?? Promise.resolve() } : {}),
    ...(core.sharingListGroupSuggestions ? { sharingListGroupSuggestions: () => core.sharingListGroupSuggestions?.() ?? Promise.resolve({ items: [] }) } : {}),
    sharingApplyShareToPostedMovement: (input) => core.sharingApplyShareToPostedMovement(input),
    sharingGetMovementDetails: (input) => core.sharingGetMovementDetails(input),
    sharingListMovementDetails: (input) => core.sharingListMovementDetails(input),
  };
}
