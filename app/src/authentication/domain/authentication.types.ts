export type AuthState =
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly userId: string };

export type CredentialRecord = {
  readonly userId: string;
  readonly username: string;
  readonly normalizedUsername: string;
  readonly passwordHash: string;
};

export const ANONYMOUS: AuthState = Object.freeze({ status: 'anonymous' });
