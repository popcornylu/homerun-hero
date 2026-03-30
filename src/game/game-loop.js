import { PHYSICS_DT } from '../constants.js';

export class GameLoop {
  constructor(onPhysicsTick, onRender) {
    this._onPhysicsTick = onPhysicsTick;
    this._onRender = onRender;
    this._lastTime = 0;
    this._accumulator = 0;
    this._running = false;
  }

  start() {
    this._running = true;
    this._lastTime = performance.now() / 1000;
    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(nowMs) {
    if (!this._running) return;
    requestAnimationFrame((t) => this._loop(t));

    const now = nowMs / 1000;
    const frameTime = Math.min(now - this._lastTime, 0.05); // cap at 50ms
    this._lastTime = now;

    this._accumulator += frameTime;

    while (this._accumulator >= PHYSICS_DT) {
      this._onPhysicsTick(PHYSICS_DT);
      this._accumulator -= PHYSICS_DT;
    }

    this._onRender(frameTime);
  }
}
