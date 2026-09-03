export interface BackDismissable {
  canDismiss(): boolean;
  dismiss(): void;
}

export interface NavigationHistory {
  canGoBack(): boolean;
  goBack(): void;
}

export interface AppLifecycle {
  exit(): void;
}

export interface BackDismissableRegistry {
  register(dismissable: BackDismissable): () => void;
  dismissTopmost(): boolean;
}

export function createBackDismissableRegistry(): BackDismissableRegistry {
  const dismissables: BackDismissable[] = [];

  return {
    register(dismissable) {
      dismissables.push(dismissable);
      let registered = true;
      return () => {
        if (!registered) {
          return;
        }
        registered = false;
        const index = dismissables.indexOf(dismissable);
        if (index >= 0) {
          dismissables.splice(index, 1);
        }
      };
    },
    dismissTopmost() {
      for (let index = dismissables.length - 1; index >= 0; index -= 1) {
        const dismissable = dismissables[index];
        if (dismissable.canDismiss()) {
          dismissable.dismiss();
          return true;
        }
      }
      return false;
    },
  };
}

export class BackNavigationCoordinator {
  private readonly dismissables: BackDismissableRegistry;
  private readonly navigation: NavigationHistory;
  private readonly lifecycle: AppLifecycle;

  constructor(
    dismissables: BackDismissableRegistry,
    navigation: NavigationHistory,
    lifecycle: AppLifecycle,
  ) {
    this.dismissables = dismissables;
    this.navigation = navigation;
    this.lifecycle = lifecycle;
  }

  handleBack(): void {
    if (this.dismissables.dismissTopmost()) {
      return;
    }
    if (this.navigation.canGoBack()) {
      this.navigation.goBack();
      return;
    }
    this.lifecycle.exit();
  }
}
