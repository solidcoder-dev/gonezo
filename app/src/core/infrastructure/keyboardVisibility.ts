export type KeyboardVisibilityListener = (visible: boolean) => void;

export type KeyboardVisibilityCapability = {
  isVisible(): boolean;
  subscribe(listener: KeyboardVisibilityListener): () => void;
  hide(): void;
};

const KEYBOARD_EVENT = 'gonezo:keyboard-visibility';

export function createKeyboardVisibilityCapability(target: Window = window): KeyboardVisibilityCapability {
  let visible = false;
  const listeners = new Set<KeyboardVisibilityListener>();
  const handleEvent = (event: Event) => {
    const nextVisible = Boolean((event as CustomEvent<{ visible?: boolean }>).detail?.visible);
    visible = nextVisible;
    listeners.forEach((listener) => listener(nextVisible));
  };
  target.addEventListener(KEYBOARD_EVENT, handleEvent);

  return {
    isVisible: () => visible,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hide() {
      const activeElement = target.document.activeElement;
      if (activeElement instanceof HTMLElement) activeElement.blur();
    },
  };
}

export function emitKeyboardVisibility(target: Window, visible: boolean): void {
  target.dispatchEvent(new CustomEvent(KEYBOARD_EVENT, { detail: { visible } }));
}
