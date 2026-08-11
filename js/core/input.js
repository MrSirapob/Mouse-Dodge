export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.p1 = { x: 640, y: 360, actionPressed: false };
    this.p2 = { x: 360, y: 360, up: false, down: false, left: false, right: false, actionPressed: false, lastDir: { x: 1, y: 0 } };
    this.onPause = null;
    this.onP1Action = null;
    this.onP2Action = null;
    this.bind();
  }
  bind() {
    const pointer = (clientX, clientY) => {
      const r = this.canvas.getBoundingClientRect();
      const sx = (clientX - r.left) * (this.canvas.clientWidth / r.width);
      const sy = (clientY - r.top) * (this.canvas.clientHeight / r.height);
      this.p1.x = Math.max(0, Math.min(this.canvas.clientWidth, sx));
      this.p1.y = Math.max(0, Math.min(this.canvas.clientHeight, sy));
    };
    this.canvas.addEventListener('pointermove', e => pointer(e.clientX, e.clientY), { passive: true });
    this.canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointer(e.clientX, e.clientY);
      this.p1.actionPressed = true;
      this.onP1Action?.();
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    const keyMap = {
      KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
      KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right'
    };
    window.addEventListener('keydown', e => {
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); this.onPause?.(); return; }
      if (keyMap[e.code]) { e.preventDefault(); this.p2[keyMap[e.code]] = true; }
      if (e.code === 'Slash' && !e.repeat) { e.preventDefault(); this.p2.actionPressed = true; this.onP2Action?.(); }
    });
    window.addEventListener('keyup', e => { if (keyMap[e.code]) this.p2[keyMap[e.code]] = false; });
  }
  p2Direction() {
    const x = (this.p2.right ? 1 : 0) - (this.p2.left ? 1 : 0);
    const y = (this.p2.down ? 1 : 0) - (this.p2.up ? 1 : 0);
    if (x || y) this.p2.lastDir = { x, y };
    return { x, y };
  }
  resize() {}
}
