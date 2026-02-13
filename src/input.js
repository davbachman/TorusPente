const DRAG_THRESHOLD_PX = 4;
const DRAG_SUPPRESS_MS = 220;

/**
 * @param {{
 * element: HTMLElement,
 * onHorizontalDrag: (dx: number) => void,
 * onVerticalDrag: (dy: number) => void,
 * onDoubleClick: (event: MouseEvent) => void
 * }} handlers
 */
export function attachPointerControls({
  element,
  onHorizontalDrag,
  onVerticalDrag,
  onDoubleClick
}) {
  const state = {
    active: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    totalDx: 0,
    totalDy: 0,
    dragged: false,
    lastDragAt: -Infinity
  };

  const onPointerDown = (event) => {
    if (event.button !== 0) {
      return;
    }
    state.active = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.totalDx = 0;
    state.totalDy = 0;
    state.dragged = false;
    element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!state.active || event.pointerId !== state.pointerId) {
      return;
    }

    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.totalDx += dx;
    state.totalDy += dy;

    if (!state.dragged) {
      if (Math.hypot(state.totalDx, state.totalDy) >= DRAG_THRESHOLD_PX) {
        state.dragged = true;
      }
    }

    if (state.dragged) {
      if (dx !== 0) {
        onHorizontalDrag(dx);
      }
      if (dy !== 0) {
        onVerticalDrag(dy);
      }
    }

  };

  const endDrag = (event) => {
    if (!state.active || event.pointerId !== state.pointerId) {
      return;
    }

    if (state.dragged) {
      state.lastDragAt = performance.now();
    }

    state.active = false;
    state.pointerId = null;
    state.dragged = false;
    element.releasePointerCapture(event.pointerId);
  };

  const onDoubleClickInternal = (event) => {
    if (event.button !== 0) {
      return;
    }
    const now = performance.now();
    if (now - state.lastDragAt < DRAG_SUPPRESS_MS) {
      return;
    }
    onDoubleClick(event);
  };

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', endDrag);
  element.addEventListener('pointercancel', endDrag);
  element.addEventListener('dblclick', onDoubleClickInternal);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', endDrag);
    element.removeEventListener('pointercancel', endDrag);
    element.removeEventListener('dblclick', onDoubleClickInternal);
  };
}
