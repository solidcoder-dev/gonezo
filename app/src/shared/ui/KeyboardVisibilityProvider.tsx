import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardVisibilityContext } from './KeyboardVisibilityContext';
type KeyboardVisibilityCapability = {
  isVisible(): boolean;
  subscribe(listener: (visible: boolean) => void): () => void;
};

export function KeyboardVisibilityProvider({ capability, children }: { capability: KeyboardVisibilityCapability; children: ReactNode }) {
  const [visible, setVisible] = useState(capability.isVisible);
  useEffect(() => capability.subscribe(setVisible), [capability]);
  return <KeyboardVisibilityContext.Provider value={visible}>{children}</KeyboardVisibilityContext.Provider>;
}
