import type {
  PreferencesSetDefaultAccountInput,
  UserPreferencesResult,
} from '../../account/application/preferences.port';
import { CoreAdapterWeb } from './coreAdapterWeb';
import { CorePlugin } from './corePlugin';
import { isNativeRuntime } from './runtimeAdapterSupport';

export class PreferencesRuntimeAdapter {
  private readonly web: CoreAdapterWeb;

  constructor(web: CoreAdapterWeb) {
    this.web = web;
  }

  preferencesGet(): Promise<UserPreferencesResult> {
    return isNativeRuntime() ? CorePlugin.preferencesGet() : this.web.preferencesGet();
  }

  async preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void> {
    if (isNativeRuntime()) {
      await CorePlugin.preferencesSetDefaultAccount(input);
      return;
    }
    await this.web.preferencesSetDefaultAccount(input);
  }

  preferencesClearDefaultAccount(): Promise<void> {
    return isNativeRuntime() ? CorePlugin.preferencesClearDefaultAccount() : this.web.preferencesClearDefaultAccount();
  }
}
