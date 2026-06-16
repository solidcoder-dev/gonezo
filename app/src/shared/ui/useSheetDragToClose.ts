import type { PointerEvent } from 'react';
import { useRef, useState } from 'react';

const DRAG_CLOSE_THRESHOLD_PX = 140;
const DRAG_UP_THRESHOLD_PX = 72;
const DRAG_ACTIVATION_THRESHOLD_PX = 12;
const INTERACTIVE_DRAG_SELECTOR = 'button, input, textarea, select, a, [role="button"], [contenteditable="true"]';

export function useSheetDragToClose(enabled: boolean, close: () => void, dragUp?: () => void, dragDown?: () => void) {
  const dragStartY = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  function start(event: PointerEvent<HTMLElement>) {
    if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return;
    }
    if (event.target instanceof Element && event.target.closest(INTERACTIVE_DRAG_SELECTOR)) {
      return;
    }
    dragStartY.current = event.clientY;
    setDragging(true);
    if ('setPointerCapture' in event.currentTarget) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  }

  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled || dragStartY.current === null) {
      return;
    }
    const nextOffset = event.clientY - dragStartY.current;
    if (Math.abs(nextOffset) <= DRAG_ACTIVATION_THRESHOLD_PX) {
      setOffset(0);
      return;
    }
    setOffset(dragUp ? nextOffset : Math.max(0, nextOffset));
    event.preventDefault();
  }

  function finish(event: PointerEvent<HTMLElement>) {
    if (!enabled || dragStartY.current === null) {
      return;
    }
    const finalOffset = event.clientY - dragStartY.current;
    dragStartY.current = null;
    setDragging(false);
    setOffset(0);
    if (dragUp && finalOffset <= -DRAG_UP_THRESHOLD_PX) {
      dragUp();
      return;
    }
    if (finalOffset >= DRAG_CLOSE_THRESHOLD_PX) {
      if (dragDown) {
        dragDown();
        return;
      }
      close();
    }
  }

  return {
    dragging,
    offset,
    handlers: {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: finish,
      onPointerCancel: finish,
    },
  };
}
