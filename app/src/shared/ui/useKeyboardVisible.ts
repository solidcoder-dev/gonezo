import { useContext } from 'react';
import { KeyboardVisibilityContext } from './KeyboardVisibilityContext';

export function useKeyboardVisible(): boolean {
  return useContext(KeyboardVisibilityContext);
}
