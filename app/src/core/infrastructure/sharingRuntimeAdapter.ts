import type {
  SharingApplyShareToPostedMovementInput,
  SharingApplyShareToPostedMovementResult,
  SharingGetMovementDetailsInput,
  SharingListMovementDetailsInput,
  SharingListMovementDetailsResult,
  SharingListPeopleResult,
  SharingRenamePersonInput,
  SharingListGroupSuggestionsResult,
  SharingGetPlannedShareInput,
  SharingPlannedShareResult,
  SharingMovementDetailsResult,
  SharingReplaceMovementShareInput,
  SharingReplaceMovementShareResult,
  SharingRemoveMovementShareInput,
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

  sharingRenamePerson(input: SharingRenamePersonInput): Promise<void> {
    return isNativeRuntime() ? CorePlugin.sharingRenamePerson(input) : this.web.sharingRenamePerson(input);
  }

  sharingListGroupSuggestions(): Promise<SharingListGroupSuggestionsResult> {
    return isNativeRuntime() ? CorePlugin.sharingListGroupSuggestions() : this.web.sharingListGroupSuggestions();
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

  sharingReplaceMovementShare(input: SharingReplaceMovementShareInput): Promise<SharingReplaceMovementShareResult> {
    if (!isNativeRuntime() && !this.web.sharingReplaceMovementShare) return Promise.reject(new Error('Sharing replacement unavailable'));
    return isNativeRuntime() ? CorePlugin.sharingReplaceMovementShare(input) : this.web.sharingReplaceMovementShare!(input);
  }

  sharingRemoveMovementShare(input: SharingRemoveMovementShareInput): Promise<void> {
    if (!isNativeRuntime() && !this.web.sharingRemoveMovementShare) return Promise.reject(new Error('Sharing removal unavailable'));
    return isNativeRuntime() ? CorePlugin.sharingRemoveMovementShare(input) : this.web.sharingRemoveMovementShare!(input);
  }

  sharingListMovementDetails(input: SharingListMovementDetailsInput): Promise<SharingListMovementDetailsResult> {
    return isNativeRuntime() ? CorePlugin.sharingListMovementDetails(input) : this.web.sharingListMovementDetails(input);
  }

  sharingGetPlannedShare(input: SharingGetPlannedShareInput): Promise<SharingPlannedShareResult> {
    return isNativeRuntime() ? CorePlugin.sharingGetPlannedShare(input) : this.web.sharingGetPlannedShare(input);
  }
}
