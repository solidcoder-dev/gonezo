import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
type KeyboardVisibilityCapability = {
  isVisible(): boolean;
  subscribe(listener: (visible: boolean) => void): () => void;
};

const KeyboardVisibilityContext = createContext(false);

export function KeyboardVisibilityProvider({ capability, children }: { capability: KeyboardVisibilityCapability; children: ReactNode }) {
  const [visible, setVisible] = useState(capability.isVisible);
  useEffect(() => capability.subscribe(setVisible), [capability]);
  return <KeyboardVisibilityContext.Provider value={visible}>{children}</KeyboardVisibilityContext.Provider>;
}

export function useKeyboardVisible(): boolean {
  return useContext(KeyboardVisibilityContext);
}
