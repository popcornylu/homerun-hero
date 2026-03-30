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

    if (speed < 0.01 || this.flightTime > 12) {
      this.active = false;
      this.landed = true;
      this.landingPosition = this.position.clone();
      return;
    }

    const vDir = v.clone().normalize();

    // Gravity
    const gravityForce = new THREE.Vector3(0, -GRAVITY * BALL_MASS, 0);

    // Air drag (stronger for batted balls at high speed)
    const dragMag = 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * BALL_CROSS_SECTION * speed * speed;
    const dragForce = vDir.clone().multiplyScalar(-dragMag);

    // Magnus force
    const magnusForce = this.spin.clone().cross(v).multiplyScalar(MAGNUS_COEFFICIENT);

    // Spin decay (spin reduces over time)
    this.spin.multiplyScalar(1 - 0.5 * dt);

    // Acceleration
    const accel = new THREE.Vector3()
      .add(gravityForce)
      .add(dragForce)
      .add(magnusForce)
      .divideScalar(BALL_MASS);

    this.velocity.add(accel.clone().multiplyScalar(dt));
    this.position.add(v.clone().multiplyScalar(dt));

    // Track max height
    if (this.position.y > this.maxHeight) {
      this.maxHeight = this.position.y;
    }

    // Ground collision
    if (this.position.y <= 0 && this.velocity.y < 0) {
      this.position.y = 0;
      this.active = false;
      this.landed = true;
      this.landingPosition = this.position.clone();
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
