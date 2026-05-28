export type UserPreferencesResult = {
  defaultAccountId: string | null;
};

export type PreferencesSetDefaultAccountInput = {
  accountId: string;
};

export interface PreferencesCorePort {
  preferencesGet(): Promise<UserPreferencesResult>;
  preferencesSetDefaultAccount(input: PreferencesSetDefaultAccountInput): Promise<void>;
  preferencesClearDefaultAccount(): Promise<void>;
}
