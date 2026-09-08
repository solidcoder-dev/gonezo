import type {
  PreferencesSetDefaultAccountInput,
  UserPreferencesResult,
} from '../../account/application/preferences.port';
import type { WebAppState } from './webAppState';

export class WebPreferencesService {
  constructor(private readonly state: WebAppState) {}

  get(): UserPreferencesResult {
    return { defaultAccountId: this.state.defaultAccountId };
  }

  setDefaultAccount(input: PreferencesSetDefaultAccountInput): void {
    const accountId = input.accountId.trim();
    if (!accountId) {
      throw new Error('accountId is required');
    }
    this.state.defaultAccountId = accountId;
  }

  clearDefaultAccount(): void {
    this.state.defaultAccountId = null;
  }
}
