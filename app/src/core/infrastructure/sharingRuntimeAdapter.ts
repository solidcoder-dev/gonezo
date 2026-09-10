import type {
  SharingApplyShareToPostedMovementInput,
  SharingApplyShareToPostedMovementResult,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingGetPlannedShareInput,
  SharingPlannedShareResult,
  SharingMovementDetailsResult,
} from '../../sharing/application/sharing.port';
import type { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class SharingRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  sharingListPeople(): Promise<SharingListPeopleResult> {
    return isNativeRuntime() ? CorePlugin.sharingListPeople() : this.web.sharingListPeople();
  }

  sharingApplyShareToPostedMovement(
    input: SharingApplyShareToPostedMovementInput,
  ): Promise<SharingApplyShareToPostedMovementResult> {
    return isNativeRuntime()
      ? CorePlugin.sharingApplyShareToPostedMovement(input)
      : this.web.sharingApplyShareToPostedMovement(input);
  }

  sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult> {
    return isNativeRuntime() ? CorePlugin.sharingGetMovementDetails(input) : this.web.sharingGetMovementDetails(input);
  }

  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult> {
    return isNativeRuntime() ? CorePlugin.sharingListMovementDetails(input) : this.web.sharingListMovementDetails(input);
  }

  sharingGetPlannedShare(input: SharingGetPlannedShareInput): Promise<SharingPlannedShareResult> {
    return isNativeRuntime() ? CorePlugin.sharingGetPlannedShare(input) : this.web.sharingGetPlannedShare(input);
  }
}
