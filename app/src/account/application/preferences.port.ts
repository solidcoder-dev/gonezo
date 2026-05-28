export type UserPreferencesResult = {
  defaultAccountId: string | null;
};

export type PreferencesSetDefaultAccountInput = {
  accountId: string;
};

export interface PreferencesPort {
  preferencesGet(): Promise<UserPreferencesResult>;
  preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void>;
  preferencesClearDefaultAccount(): Promise<void>;
}
