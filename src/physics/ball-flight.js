import * as THREE from 'three';
import {
  GRAVITY, AIR_DENSITY, DRAG_COEFFICIENT, MAGNUS_COEFFICIENT,
  BALL_MASS, BALL_CROSS_SECTION,
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

    const onGround = this.landed && this.position.y <= 0.05 && this.velocity.y <= 0.5;

    if (onGround) {
      // Rolling on ground — no gravity, no air physics, just friction
      this.position.y = 0;
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

      // Ground collision — bounce
      if (this.position.y <= 0 && this.velocity.y < 0) {
        this.position.y = 0;
        if (!this.landed) {
          this.landed = true;
          this.landingPosition = this.position.clone();
        }
        // Bounce if enough energy, otherwise start rolling
        if (Math.abs(this.velocity.y) > 2.0) {
          this.velocity.y *= -0.3;
          this.velocity.x *= 0.85;
          this.velocity.z *= 0.85;
        } else {
          // Too slow to bounce — transition to rolling
          this.velocity.y = 0;
        }
      }
    }
  }

  getDistance() {
    if (!this.landingPosition) return 0;
    return Math.sqrt(
      this.landingPosition.x * this.landingPosition.x +
      this.landingPosition.z * this.landingPosition.z
    );
  }
}
