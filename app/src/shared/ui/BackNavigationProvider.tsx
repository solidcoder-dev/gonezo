import type { ReactNode } from 'react';
import type { BackDismissableRegistry } from '../utils/backNavigation';
import { BackNavigationContext } from './backNavigationContext';

type BackNavigationProviderProps = {
  registry: BackDismissableRegistry;
  children: ReactNode;
};

export function BackNavigationProvider({ registry, children }: BackNavigationProviderProps) {
  return (
    <BackNavigationContext.Provider value={registry}>
      {children}
    </BackNavigationContext.Provider>
  );
}
