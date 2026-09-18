import { createContext, useContext, type ReactNode } from 'react';

export type AuthenticationSession = {
  logout(): Promise<void>;
};

const AuthenticationSessionContext = createContext<AuthenticationSession | null>(null);

export function AuthenticationSessionProvider({ session, children }: { session: AuthenticationSession; children: ReactNode }) {
  return <AuthenticationSessionContext.Provider value={session}>{children}</AuthenticationSessionContext.Provider>;
}

export function useAuthenticationSession(): AuthenticationSession {
  const session = useContext(AuthenticationSessionContext);
  if (!session) throw new Error('Authentication session is unavailable');
  return session;
}
