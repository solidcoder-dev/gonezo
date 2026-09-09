import { describe, expect, it, vi } from 'vitest';
import { createKeyboardVisibilityCapability, emitKeyboardVisibility } from './keyboardVisibility';

describe('keyboard visibility capability', () => {
  it('publishes Android visibility changes and removes listeners', () => {
    const capability = createKeyboardVisibilityCapability(window);
    const listener = vi.fn();
    const unsubscribe = capability.subscribe(listener);
    emitKeyboardVisibility(window, true);
    expect(capability.isVisible()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
    unsubscribe();
    emitKeyboardVisibility(window, false);
    expect(capability.isVisible()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
