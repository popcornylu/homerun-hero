import * as THREE from 'three';
import {
  GRAVITY, AIR_DENSITY, DRAG_COEFFICIENT, MAGNUS_COEFFICIENT,
  BALL_MASS, BALL_CROSS_SECTION,
} from '../constants.js';

export class PitchTrajectory {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.spinAxis = new THREE.Vector3();
    this.active = false;
    this.reachedPlate = false;
  }

  launch(pitch, releasePoint) {
    this.position.copy(releasePoint);

    // Aim STRAIGHT at the target, only compensating for gravity.
    // Magnus force will push the ball OFF this line - creating visible "break".
    const target = new THREE.Vector3(pitch.targetX, pitch.targetY, 0);
    const dir = target.clone().sub(this.position);
    const dist = dir.length();
    const flightTime = dist / pitch.speedMs;

    const vy = (target.y - this.position.y + 0.5 * GRAVITY * flightTime * flightTime) / flightTime;
    const vz = (target.z - this.position.z) / flightTime;
    const vx = (target.x - this.position.x) / flightTime;

    this.velocity.set(vx, vy, vz);

    // Spin
    this.spinAxis.set(pitch.spinAxis.x, pitch.spinAxis.y, pitch.spinAxis.z);
    this.spin.copy(this.spinAxis).multiplyScalar(pitch.spinRads);

    this.active = true;
    this.reachedPlate = false;
  }

  step(dt) {
    if (!this.active) return;

    const v = this.velocity;
    const speed = v.length();
    if (speed < 0.01) return;

    const vDir = v.clone().normalize();

    // Gravity
    const gravityForce = new THREE.Vector3(0, -GRAVITY * BALL_MASS, 0);

    // Air drag
    const dragMag = 0.5 * AIR_DENSITY * DRAG_COEFFICIENT * BALL_CROSS_SECTION * speed * speed;
    const dragForce = vDir.clone().multiplyScalar(-dragMag);

    // Magnus force - creates the visible "break"
    const magnusForce = this.spin.clone().cross(v).multiplyScalar(MAGNUS_COEFFICIENT);

    const accel = new THREE.Vector3()
      .add(gravityForce)
      .add(dragForce)
      .add(magnusForce)
      .divideScalar(BALL_MASS);

    this.velocity.add(accel.multiplyScalar(dt));
    this.position.add(v.clone().multiplyScalar(dt));

    if (this.position.z >= 0) {
      this.reachedPlate = true;
    }

    if (this.position.z > 2.0 || this.position.y < -0.5) {
      this.active = false;
    }
  }

  isInStrikeZone() {
    const x = this.position.x;
    const y = this.position.y;
    return x >= -0.25 && x <= 0.25 && y >= 0.45 && y <= 1.1;
  }
}
