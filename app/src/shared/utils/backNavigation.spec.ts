import { describe, expect, it, vi } from 'vitest';
import {
  BackNavigationCoordinator,
  createBackDismissableRegistry,
  type AppLifecycle,
  type NavigationHistory,
} from './backNavigation';

function createCoordinator(options: { dismissables?: ReturnType<typeof createBackDismissableRegistry>; canGoBack?: boolean }) {
  const navigation: NavigationHistory = { canGoBack: () => options.canGoBack ?? true, goBack: vi.fn() };
  const lifecycle: AppLifecycle = { exit: vi.fn() };
  return {
    coordinator: new BackNavigationCoordinator(
      options.dismissables ?? createBackDismissableRegistry(),
      navigation,
      lifecycle,
    ),
    navigation,
    lifecycle,
  };
}

describe('BackNavigationCoordinator', () => {
  it('dismisses transient UI before navigation or exit', () => {
    const dismiss = vi.fn();
    const registry = createBackDismissableRegistry();
    registry.register({ canDismiss: () => true, dismiss });
    const { coordinator, navigation, lifecycle } = createCoordinator({ dismissables: registry });

    coordinator.handleBack();

    expect(dismiss).toHaveBeenCalledOnce();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(lifecycle.exit).not.toHaveBeenCalled();
  });

  it('navigates back when no transient UI can be dismissed', () => {
    const { coordinator, navigation, lifecycle } = createCoordinator({ canGoBack: true });

    coordinator.handleBack();

    expect(navigation.goBack).toHaveBeenCalledOnce();
    expect(lifecycle.exit).not.toHaveBeenCalled();
  });

  it('exits at the application navigation root', () => {
    const { coordinator, navigation, lifecycle } = createCoordinator({ canGoBack: false });

    coordinator.handleBack();

    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(lifecycle.exit).toHaveBeenCalledOnce();
  });

  it('dismisses registered UI in LIFO order and unregisters safely', () => {
    const registry = createBackDismissableRegistry();
    const dismissA = vi.fn();
    const dismissB = vi.fn();
    const unregisterA = registry.register({ canDismiss: () => true, dismiss: dismissA });
    const unregisterB = registry.register({ canDismiss: () => true, dismiss: dismissB });
    const { coordinator } = createCoordinator({ dismissables: registry });

    coordinator.handleBack();
    expect(dismissB).toHaveBeenCalledOnce();
    expect(dismissA).not.toHaveBeenCalled();

    unregisterB();
    unregisterB();
    coordinator.handleBack();
    expect(dismissA).toHaveBeenCalledOnce();

    unregisterA();
    coordinator.handleBack();
    expect(dismissA).toHaveBeenCalledOnce();
  });
});
