import type {
  SharingApplyShareToPostedTransactionInput,
  SharingApplyShareToPostedTransactionResult,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingMovementDetailsResult,
} from '../../sharing/application/sharing.port';
import { CoreAdapterWeb } from './coreAdapterWeb';
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

  sharingApplyShareToPostedTransaction(
    input: SharingApplyShareToPostedTransactionInput,
  ): Promise<SharingApplyShareToPostedTransactionResult> {
    return isNativeRuntime()
      ? CorePlugin.sharingApplyShareToPostedTransaction(input)
      : this.web.sharingApplyShareToPostedTransaction(input);
  }

  sharingGetMovementDetails(input: SharingGetMovementDetailsInput): Promise<SharingMovementDetailsResult> {
    return isNativeRuntime() ? CorePlugin.sharingGetMovementDetails(input) : this.web.sharingGetMovementDetails(input);
  }

  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult> {
    return isNativeRuntime() ? CorePlugin.sharingListMovementDetails(input) : this.web.sharingListMovementDetails(input);
  }
}
