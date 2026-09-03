import { createContext } from 'react';
import type { BackDismissableRegistry } from '../utils/backNavigation';

export const BackNavigationContext = createContext<BackDismissableRegistry | null>(null);
