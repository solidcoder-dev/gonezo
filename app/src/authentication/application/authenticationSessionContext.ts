import { createContext, useContext } from 'react';

export type AuthenticationSession = {
  readonly userId: string;
  logout(): Promise<void>;
};

export const AuthenticationSessionContext = createContext<AuthenticationSession | null>(null);

export function useAuthenticationSession(): AuthenticationSession {
  const session = useContext(AuthenticationSessionContext);
  if (!session) throw new Error('Authentication session is unavailable');
  return session;
}
