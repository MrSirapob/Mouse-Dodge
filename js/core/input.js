export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.p1 = { x: 640, y: 360, actionPressed: false, isTouch: false };
    this.p2 = { x: 360, y: 360, up: false, down: false, left: false, right: false, actionPressed: false, lastDir: { x: 1, y: 0 } };
    this.onPause = null;
    this.onP1Action = null;
    this.onP2Action = null;
    this.mouseSensitivity = 1;

    // Mobile controls:
    // - Keep the player slightly above the finger so the finger does not cover it.
    // - A double tap activates P1's skill; a single tap only moves the player.
    this.touchTargetOffset = 120;
    this.doubleTapWindow = 320;
    this.doubleTapDistance = 44;
    this.lastTouchTap = null;
    this.touchGesture = null;

    this.bind();
  }

  setMouseSensitivity(percent) {
    this.mouseSensitivity = Math.max(0.25, Math.min(3, Number(percent) / 100 || 1));
  }

  bind() {
    const pointer = (clientX, clientY, pointerType = 'mouse') => {
      const r = this.canvas.getBoundingClientRect();
      const sx = (clientX - r.left) * (this.canvas.clientWidth / r.width);
      let sy = (clientY - r.top) * (this.canvas.clientHeight / r.height);

      // Mouse control remains 1:1. Touch movement is handled as a
      // relative drag so a new touch never teleports the player.
      if (pointerType === 'touch') {
        sy -= this.touchTargetOffset;
        this.p1.isTouch = true;
      } else {
        this.p1.isTouch = false;
        this.p1.x = Math.max(0, Math.min(this.canvas.clientWidth, sx));
        this.p1.y = Math.max(0, Math.min(this.canvas.clientHeight, sy));
      }
    };

    const moveTouchRelative = (clientX, clientY, gesture) => {
      const r = this.canvas.getBoundingClientRect();
      const dx = (clientX - gesture.x) * (this.canvas.clientWidth / r.width);
      const dy = (clientY - gesture.y) * (this.canvas.clientHeight / r.height);

      // Keep the player's position from before this touch. Moving the
      // finger then moves the player by the same amount from that position.
      this.p1.x = Math.max(0, Math.min(this.canvas.clientWidth, gesture.playerX + dx));
      this.p1.y = Math.max(0, Math.min(this.canvas.clientHeight, gesture.playerY + dy));
      this.p1.isTouch = true;
    };

    this.canvas.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch' && this.touchGesture) {
        const dx = e.clientX - this.touchGesture.x;
        const dy = e.clientY - this.touchGesture.y;
        if (Math.hypot(dx, dy) > 18) this.touchGesture.moved = true;
        moveTouchRelative(e.clientX, e.clientY, this.touchGesture);
        return;
      }

      pointer(e.clientX, e.clientY, e.pointerType);
    }, { passive: true });

    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      if (e.pointerType === 'touch') {
        // Start the gesture from the player's CURRENT position.
        // The initial touch location must not move/teleport the player.
        this.touchGesture = {
          x: e.clientX,
          y: e.clientY,
          playerX: this.p1.x,
          playerY: this.p1.y,
          moved: false
        };
        this.p1.isTouch = true;
      } else {
        // Desktop: keep the existing single-click skill control.
        this.p1.actionPressed = true;
        this.onP1Action?.();
      }

      this.canvas.setPointerCapture?.(e.pointerId);
    });

    this.canvas.addEventListener('pointerup', e => {
      if (e.pointerType !== 'touch' || !this.touchGesture) return;

      const gesture = this.touchGesture;
      this.touchGesture = null;

      // Dragging controls movement only; it is not a tap.
      if (gesture.moved) {
        this.lastTouchTap = null;
        return;
      }

      const now = performance.now();
      const previous = this.lastTouchTap;
      const dx = previous ? e.clientX - previous.x : Infinity;
      const dy = previous ? e.clientY - previous.y : Infinity;
      const isDoubleTap =
        previous &&
        now - previous.time <= this.doubleTapWindow &&
        Math.hypot(dx, dy) <= this.doubleTapDistance;

      if (isDoubleTap) {
        this.lastTouchTap = null;
        this.p1.actionPressed = true;
        this.onP1Action?.();
      } else {
        this.lastTouchTap = {
          time: now,
          x: e.clientX,
          y: e.clientY
        };
      }
    }, { passive: true });

    this.canvas.addEventListener('pointercancel', e => {
      if (e.pointerType === 'touch') {
        this.touchGesture = null;
        this.lastTouchTap = null;
      }
    }, { passive: true });

    const keyMap = {
      KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right'
    };

    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        this.onPause?.();
        return;
      }
      if (keyMap[e.code]) {
        e.preventDefault();
        this.p2[keyMap[e.code]] = true;
      }
      if (e.code === 'Slash' && !e.repeat) {
        e.preventDefault();
        this.p2.actionPressed = true;
        this.onP2Action?.();
      }
    });

    window.addEventListener('keyup', e => {
      if (keyMap[e.code]) this.p2[keyMap[e.code]] = false;
    });
  }

  p2Direction() {
    const x = (this.p2.right ? 1 : 0) - (this.p2.left ? 1 : 0);
    const y = (this.p2.down ? 1 : 0) - (this.p2.up ? 1 : 0);
    if (x || y) this.p2.lastDir = { x, y };
    return { x, y };
  }

  resize() {}
}
