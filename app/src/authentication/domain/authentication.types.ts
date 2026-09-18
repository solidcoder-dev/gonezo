export type AuthState =
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'authenticated'; readonly userId: string };

export type CredentialRecord = {
  readonly userId: string;
  readonly username: string;
  readonly normalizedUsername: string;
  readonly passwordHash: string;
};

export const UNAUTHENTICATED: AuthState = Object.freeze({ status: 'unauthenticated' });
