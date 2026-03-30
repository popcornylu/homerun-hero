import * as THREE from 'three';
import {
  GRAVITY, AIR_DENSITY, DRAG_COEFFICIENT, MAGNUS_COEFFICIENT,
  BALL_MASS, BALL_CROSS_SECTION, FENCE_CENTER,
} from '../constants.js';

export class BallFlight {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.active = false;
    this.landed = false;
    this.landingPosition = null;
    this.maxHeight = 0;
    this.flightTime = 0;
  }

  launch(startPos, exitVelocity, spinVector) {
    this.position.copy(startPos);
    this.position.y = Math.max(this.position.y, 0.8); // bat contact height
    this.velocity.copy(exitVelocity);
    this.spin.copy(spinVector);
    this.active = true;
    this.landed = false;
    this.landingPosition = null;
    this.maxHeight = this.position.y;
    this.flightTime = 0;
  }

  step(dt) {
    if (!this.active) return;

    this.flightTime += dt;
    const v = this.velocity;
    const speed = v.length();

    if (speed < 0.01 || this.flightTime > 10.0) {
      this.active = false;
      this.landed = true;
      this.landingPosition = this.position.clone();
      return;
    }

    const floorHere = this._getFloorHeight(this.position);
    const inStands = floorHere > 0.1;
    const onGround = this.landed && this.position.y <= floorHere + 0.05 && this.velocity.y <= 0.5;

    // Past fence: once landed, stop completely
    const dist0 = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (this.landed && dist0 >= FENCE_CENTER) {
      this.velocity.set(0, 0, 0);
      return;
    }

    if (onGround) {
      // Rolling on field — no gravity, just friction
      this.position.y = floorHere;
      this.velocity.y = 0;
      const friction = 1 - 2.5 * dt;
      this.velocity.x *= friction;
      this.velocity.z *= friction;
      this.position.add(v.clone().multiplyScalar(dt));
    } else {
      // In the air — full physics
      const vDir = v.clone().normalize();
      const gravityForce = new THREE.Vector3(0, -GRAVITY * BALL_MASS, 0);
      const dragMag = 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * BALL_CROSS_SECTION * speed * speed;
      const dragForce = vDir.clone().multiplyScalar(-dragMag);
      const magnusForce = this.spin.clone().cross(v).multiplyScalar(MAGNUS_COEFFICIENT);
      this.spin.multiplyScalar(1 - 0.5 * dt);

      const accel = new THREE.Vector3()
        .add(gravityForce)
        .add(dragForce)
        .add(magnusForce)
        .divideScalar(BALL_MASS);

      this.velocity.add(accel.clone().multiplyScalar(dt));
      this.position.add(v.clone().multiplyScalar(dt));

      if (this.position.y > this.maxHeight) {
        this.maxHeight = this.position.y;
      }

      // Collision with ground or grandstand floor
      const floorY = this._getFloorHeight(this.position);
      const dist = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
      const pastFence = dist >= FENCE_CENTER;

      if (this.position.y <= floorY && this.velocity.y < 0) {
        this.position.y = floorY;
        if (!this.landed) {
          this.landed = true;
          this.landingPosition = this.position.clone();
        }
        if (pastFence) {
          // Past fence: stop immediately (HR into stands)
          this.velocity.set(0, 0, 0);
        } else {
          // Field bounce — very low, just a small hop
          this.velocity.y = Math.min(Math.abs(this.velocity.y) * 0.15, 2.0);
          this.velocity.x *= 0.7;
          this.velocity.z *= 0.7;
        }
      }
    }
  }

  /**
   * Get the floor height at a world position.
   * On the field (inside fence): 0
   * In the stands (past fence): stepped height matching stadium deck layout
   */
  _getFloorHeight(pos) {
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    const FC = FENCE_CENTER;

    if (dist < FC) return 0; // on the field

    // Must match stadium.js & crowd.js deck configs
    const decks = [
      { startR: FC + 3,  baseY: 0,    rows: 15, rowD: 1.8, rowH: 1.1 },
      { startR: FC + 30, baseY: 17,   rows: 5,  rowD: 2.0, rowH: 1.0 },
      { startR: FC + 41, baseY: 22.5, rows: 15, rowD: 1.8, rowH: 1.1 },
    ];

    // Find which deck row we're in
    for (const deck of decks) {
      for (let row = 0; row < deck.rows; row++) {
        const r = deck.startR + row * deck.rowD;
        if (dist >= r && dist < r + deck.rowD) {
          return deck.baseY + row * deck.rowH;
        }
      }
    }

    // Between fence and first row, or between decks — just ground level
    return 0;
  }

  getDistance() {
    if (!this.landingPosition) return 0;
    return Math.sqrt(
      this.landingPosition.x * this.landingPosition.x +
      this.landingPosition.z * this.landingPosition.z
    );
  }
}
