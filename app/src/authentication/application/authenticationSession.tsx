import type { ReactNode } from 'react';
import { AuthenticationSessionContext, type AuthenticationSession } from './authenticationSessionContext';

export function AuthenticationSessionProvider({ session, children }: { session: AuthenticationSession; children: ReactNode }) {
  return <AuthenticationSessionContext.Provider value={session}>{children}</AuthenticationSessionContext.Provider>;
}
