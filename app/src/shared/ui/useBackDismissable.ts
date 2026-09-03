import { useContext, useEffect, useRef } from 'react';
import type { BackDismissable } from '../utils/backNavigation';
import { BackNavigationContext } from './backNavigationContext';

export function useBackDismissable(dismissable: BackDismissable, enabled = true): void {
  const registry = useContext(BackNavigationContext);
  const dismissableRef = useRef(dismissable);

  useEffect(() => {
    dismissableRef.current = dismissable;
  }, [dismissable]);

  useEffect(() => {
    if (!registry || !enabled) {
      return undefined;
    }

    return registry.register({
      canDismiss: () => dismissableRef.current.canDismiss(),
      dismiss: () => dismissableRef.current.dismiss(),
    });
  }, [enabled, registry]);
}
