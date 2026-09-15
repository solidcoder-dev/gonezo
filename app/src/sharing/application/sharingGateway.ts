import type { SharingGatewayPort } from './sharingGateway.port';

export type { SharingGatewayPort } from './sharingGateway.port';

export function createSharingGateway(core: SharingGatewayPort): SharingGatewayPort {
  return {
    sharingListPeople: () => core.sharingListPeople(),
    ...(core.sharingRenamePerson ? { sharingRenamePerson: (input: Parameters<NonNullable<SharingGatewayPort['sharingRenamePerson']>>[0]) => core.sharingRenamePerson?.(input) ?? Promise.resolve() } : {}),
    ...(core.sharingListGroupSuggestions ? { sharingListGroupSuggestions: () => core.sharingListGroupSuggestions?.() ?? Promise.resolve({ items: [] }) } : {}),
    sharingApplyShareToPostedMovement: (input) => core.sharingApplyShareToPostedMovement(input),
    ...(core.sharingReplaceMovementShare ? { sharingReplaceMovementShare: (input: Parameters<NonNullable<SharingGatewayPort['sharingReplaceMovementShare']>>[0]) => core.sharingReplaceMovementShare?.(input) ?? Promise.reject(new Error('Sharing replacement unavailable')) } : {}),
    ...(core.sharingRemoveMovementShare ? { sharingRemoveMovementShare: (input: Parameters<NonNullable<SharingGatewayPort['sharingRemoveMovementShare']>>[0]) => core.sharingRemoveMovementShare?.(input) ?? Promise.reject(new Error('Sharing removal unavailable')) } : {}),
    sharingGetMovementDetails: (input) => core.sharingGetMovementDetails(input),
    sharingListMovementDetails: (input) => core.sharingListMovementDetails(input),
  };
}
