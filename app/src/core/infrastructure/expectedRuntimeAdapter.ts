import type {
  ExpectedCreateMovementInput,
  ExpectedCreateMovementResult,
  ExpectedDismissMovementInput,
  ExpectedListMovementsInput,
  ExpectedListMovementsResult,
  ExpectedResolveMovementInput,
  ExpectedPostMovementInput,
  ExpectedUpdateMovementInput,
  ExpectedUpdateMovementResult,
} from '../../expected/application/expected.port';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class ExpectedRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  expectedCreateMovement(input: ExpectedCreateMovementInput): Promise<ExpectedCreateMovementResult> {
    return isNativeRuntime() ? CorePlugin.expectedCreateMovement(input) : this.web.expectedCreateMovement(input);
  }

  expectedUpdateMovement(input: ExpectedUpdateMovementInput): Promise<ExpectedUpdateMovementResult> {
    return isNativeRuntime() ? CorePlugin.expectedUpdateMovement(input) : this.web.expectedUpdateMovement(input);
  }

  expectedListMovements(input: ExpectedListMovementsInput): Promise<ExpectedListMovementsResult> {
    return isNativeRuntime() ? CorePlugin.expectedListMovements(input) : this.web.expectedListMovements(input);
  }

  async expectedResolveMovement(input: ExpectedResolveMovementInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.expectedResolveMovement(input);
      return;
    }
    await this.web.expectedResolveMovement(input);
  }

  expectedPostMovement(input: ExpectedPostMovementInput): Promise<{ transactionId: string; shareId?: string; nextExpectedMovementId?: string }> {
    if (isNativeRuntime()) return CorePlugin.expectedPostMovement(input);
    throw new Error('Expected posting workflow is only available on the Android runtime');
  }

  async expectedDismissMovement(input: ExpectedDismissMovementInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.expectedDismissMovement(input);
      return;
    }
    await this.web.expectedDismissMovement(input);
  }
}
