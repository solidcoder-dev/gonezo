import { App as CapacitorApp } from '@capacitor/app';
import { useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { UNSAFE_NavigationContext, useLocation, useNavigationType } from 'react-router-dom';
import { BackNavigationProvider } from '../../shared/ui/BackNavigationProvider';
import {
  BackNavigationCoordinator,
  createBackDismissableRegistry,
  type AppLifecycle,
  type NavigationHistory,
} from '../../shared/utils/backNavigation';

function useGonezoNavigationHistory(): NavigationHistory {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { navigator } = useContext(UNSAFE_NavigationContext);
  const depth = useRef(0);

  useEffect(() => {
    if (String(navigationType) === 'PUSH') {
      depth.current += 1;
    } else if (String(navigationType) === 'POP') {
      depth.current = Math.max(0, depth.current - 1);
    }
  }, [location.key, navigationType]);

  return useMemo(() => ({
    canGoBack: () => depth.current > 0,
    goBack: () => navigator.go(-1),
  }), [navigator]);
}

type BackNavigationBridgeProps = {
  children: ReactNode;
};

export function BackNavigationBridge({ children }: BackNavigationBridgeProps) {
  const registry = useMemo(() => createBackDismissableRegistry(), []);
  const navigation = useGonezoNavigationHistory();
  const coordinator = useMemo(() => new BackNavigationCoordinator(
    registry,
    navigation,
    { exit: () => { void CapacitorApp.exitApp(); } } satisfies AppLifecycle,
  ), [navigation, registry]);

  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    void CapacitorApp.addListener('backButton', () => coordinator.handleBack())
      .then((handle) => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        removeListener = () => { void handle.remove(); };
      });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [coordinator]);

  return (
    <BackNavigationProvider registry={registry}>
      {children}
    </BackNavigationProvider>
  );
}
