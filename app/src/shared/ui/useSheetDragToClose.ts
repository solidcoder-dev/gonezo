import type { PointerEvent } from 'react';
import { useRef, useState } from 'react';

const DRAG_CLOSE_THRESHOLD_PX = 96;

export function useSheetDragToClose(enabled: boolean, close: () => void) {
  const dragStartY = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  function start(event: PointerEvent<HTMLElement>) {
    if (!enabled || (event.pointerType === 'mouse' && event.button !== 0)) {
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
    setOffset(Math.max(0, event.clientY - dragStartY.current));
    event.preventDefault();
  }

  function finish(event: PointerEvent<HTMLElement>) {
    if (!enabled || dragStartY.current === null) {
      return;
    }
    const finalOffset = Math.max(0, event.clientY - dragStartY.current);
    dragStartY.current = null;
    setDragging(false);
    setOffset(0);
    if (finalOffset >= DRAG_CLOSE_THRESHOLD_PX) {
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
