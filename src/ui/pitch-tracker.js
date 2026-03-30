import { STRIKE_ZONE } from '../constants.js';

/**
 * 2D pitch tracking overlay - shows the strike zone from the catcher's perspective
 * with ball trajectory trail, crossing point, and click position.
 */
export class PitchTracker {
  constructor() {
    this._canvas = document.getElementById('pitch-tracker-canvas');
    this._ctx = this._canvas.getContext('2d');

    // High-DPI support
    const dpr = Math.min(window.devicePixelRatio, 2);
    this._canvas.width = 120 * dpr;
    this._canvas.height = 160 * dpr;
    this._ctx.scale(dpr, dpr);
    this._w = 120;
    this._h = 160;

    // Strike zone box dimensions on canvas (with margin for outside-zone pitches)
    this._margin = 25;
    this._zoneX = this._margin;
    this._zoneY = this._margin;
    this._zoneW = this._w - this._margin * 2;
    this._zoneH = this._h - this._margin * 2;

    // World strike zone
    this._szW = STRIKE_ZONE.xMax - STRIKE_ZONE.xMin;
    this._szH = STRIKE_ZONE.yMax - STRIKE_ZONE.yMin;

    // Extended world range for mapping (wider than strike zone to show balls/high pitches)
    // Strike zone is 0.44m wide, 0.55m tall; extend ~2x each side
    this._mapXMin = STRIKE_ZONE.xMin - this._szW * 0.8;
    this._mapXMax = STRIKE_ZONE.xMax + this._szW * 0.8;
    this._mapYMin = STRIKE_ZONE.yMin - this._szH * 0.8;
    this._mapYMax = STRIKE_ZONE.yMax + this._szH * 0.8;
    this._mapW = this._mapXMax - this._mapXMin;
    this._mapH = this._mapYMax - this._mapYMin;

    // State
    this._ballPos = null;         // current ball {x, y} in world
    this._trail = [];             // trajectory trail: [{x, y}]
    this._crossingPos = null;     // where ball crossed the plate
    this._clickPos = null;        // where player clicked
    this._clickTimer = 0;
    this._crossingTimer = 0;
    this._visible = false;
    this._trailInterval = 0;     // throttle trail sampling
  }

  /** Map world X,Y to canvas coordinates (using extended range) */
  _worldToCanvas(wx, wy) {
    const nx = (wx - this._mapXMin) / this._mapW;
    const ny = 1 - (wy - this._mapYMin) / this._mapH; // invert Y
    return {
      x: nx * this._w,
      y: ny * this._h,
    };
  }

  /** Map world X,Y to canvas, clamped to canvas bounds */
  _worldToCanvasClamped(wx, wy) {
    const p = this._worldToCanvas(wx, wy);
    p.x = Math.max(4, Math.min(this._w - 4, p.x));
    p.y = Math.max(4, Math.min(this._h - 4, p.y));
    return p;
  }

  show() {
    this._visible = true;
    this._crossingPos = null;
    this._clickPos = null;
    this._ballPos = null;
    this._trail = [];
  }

  hide() {
    this._visible = false;
  }

  setBallPosition(worldX, worldY) {
    this._ballPos = { x: worldX, y: worldY };

    // Sample trail points (every ~3 calls to avoid too many dots)
    this._trailInterval++;
    if (this._trailInterval >= 3) {
      this._trailInterval = 0;
      this._trail.push({ x: worldX, y: worldY });
      // Keep max 30 trail points
      if (this._trail.length > 30) this._trail.shift();
    }
  }

  clearBall() {
    this._ballPos = null;
    // Keep trail visible (don't clear) so user can see the path after pitch completes
  }

  clearTrail() {
    this._trail = [];
    this._trailInterval = 0;
  }

  setCrossingPosition(worldX, worldY) {
    this._crossingPos = { x: worldX, y: worldY };
    this._crossingTimer = 3.0;
  }

  setClickPosition(worldX, worldY) {
    this._clickPos = { x: worldX, y: worldY };
    this._clickTimer = 3.0;
  }

  update(dt) {
    if (this._crossingTimer > 0) {
      this._crossingTimer -= dt;
      if (this._crossingTimer <= 0) this._crossingPos = null;
    }
    if (this._clickTimer > 0) {
      this._clickTimer -= dt;
      if (this._clickTimer <= 0) this._clickPos = null;
    }
    this._draw();
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;
    ctx.clearRect(0, 0, w, h);

    if (!this._visible) return;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 8);
    ctx.fill();

    // Strike zone box
    const zx = this._zoneX;
    const zy = this._zoneY;
    const zw = this._zoneW;
    const zh = this._zoneH;

    // Compute actual zone position from world mapping
    const zoneTopLeft = this._worldToCanvas(STRIKE_ZONE.xMin, STRIKE_ZONE.yMax);
    const zoneBottomRight = this._worldToCanvas(STRIKE_ZONE.xMax, STRIKE_ZONE.yMin);
    const zxm = zoneTopLeft.x;
    const zym = zoneTopLeft.y;
    const zwm = zoneBottomRight.x - zoneTopLeft.x;
    const zhm = zoneBottomRight.y - zoneTopLeft.y;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(zxm, zym, zwm, zhm);

    // Zone grid (3x3)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 3; i++) {
      const gx = zxm + (zwm / 3) * i;
      ctx.beginPath();
      ctx.moveTo(gx, zym);
      ctx.lineTo(gx, zym + zhm);
      ctx.stroke();
      const gy = zym + (zhm / 3) * i;
      ctx.beginPath();
      ctx.moveTo(zxm, gy);
      ctx.lineTo(zxm + zwm, gy);
      ctx.stroke();
    }

    // Trajectory trail - fading dots showing the ball's path
    if (this._trail.length > 1) {
      for (let i = 0; i < this._trail.length; i++) {
        const t = this._trail[i];
        const p = this._worldToCanvasClamped(t.x, t.y);
        const alpha = 0.15 + 0.5 * (i / this._trail.length); // fade in
        const radius = 1.5 + 1.5 * (i / this._trail.length); // grow bigger
        ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw connecting line for trail
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < this._trail.length; i++) {
        const p = this._worldToCanvasClamped(this._trail[i].x, this._trail[i].y);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Crossing position (where ball crossed plate) - hollow circle
    if (this._crossingPos) {
      const cp = this._worldToCanvasClamped(this._crossingPos.x, this._crossingPos.y);
      const inZone = this._isInZone(this._crossingPos.x, this._crossingPos.y);
      ctx.strokeStyle = inZone ? '#ff4444' : '#4488ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      // Label
      ctx.fillStyle = inZone ? '#ff4444' : '#4488ff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(inZone ? 'STRIKE' : 'BALL', cp.x, cp.y + 19);
    }

    // Click position - X mark
    if (this._clickPos) {
      const kp = this._worldToCanvasClamped(this._clickPos.x, this._clickPos.y);
      ctx.strokeStyle = '#ffdd00';
      ctx.lineWidth = 2.5;
      const s = 6;
      ctx.beginPath();
      ctx.moveTo(kp.x - s, kp.y - s);
      ctx.lineTo(kp.x + s, kp.y + s);
      ctx.moveTo(kp.x + s, kp.y - s);
      ctx.lineTo(kp.x - s, kp.y + s);
      ctx.stroke();
    }

    // Current ball position - bright filled circle (drawn last, on top)
    if (this._ballPos) {
      const bp = this._worldToCanvasClamped(this._ballPos.x, this._ballPos.y);

      // Outer glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Ball dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Bright ring
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _isInZone(wx, wy) {
    return wx >= STRIKE_ZONE.xMin && wx <= STRIKE_ZONE.xMax &&
           wy >= STRIKE_ZONE.yMin && wy <= STRIKE_ZONE.yMax;
  }
}
