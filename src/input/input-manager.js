export class InputManager {
  constructor(canvas) {
    this._swingRequested = false;
    this._swingPosition = { x: 0, y: 0 };
    this._canvas = canvas;

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._swingRequested = true;
      this._swingPosition.x = e.clientX;
      this._swingPosition.y = e.clientY;
    });
  }

  consumeSwing() {
    if (!this._swingRequested) return null;
    this._swingRequested = false;

    // Convert to normalized device coordinates
    const w = this._canvas.clientWidth;
    const h = this._canvas.clientHeight;
    return {
      x: (this._swingPosition.x / w) * 2 - 1,
      y: -(this._swingPosition.y / h) * 2 + 1,
      rawX: this._swingPosition.x,
      rawY: this._swingPosition.y,
    };
  }

  /** Check if there's a pending swing without consuming it */
  hasPendingSwing() {
    return this._swingRequested;
  }

  /** Consume any pending input (e.g., for title screen clicks) */
  consumeAny() {
    if (!this._swingRequested) return false;
    this._swingRequested = false;
    return true;
  }
}
