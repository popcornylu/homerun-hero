import * as THREE from 'three';
import { GRAVITY } from '../constants.js';

export class PitchTrajectory {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.active = false;
    this.reachedPlate = false;
  }

  launch(pitch, releasePoint) {
    this.position.copy(releasePoint);

    // Aim at the FINAL position (target + break) so the 3D ball arrives
    // exactly where the 2D marker animation ends up.
    const finalX = pitch.targetX + (pitch.breakX || 0);
    const finalY = pitch.targetY + (pitch.breakY || 0);
    const target = new THREE.Vector3(finalX, finalY, 0);
    const dist = target.clone().sub(this.position).length();
    const flightTime = dist / pitch.speedMs;

    const vx = (target.x - this.position.x) / flightTime;
    // Compensate for symplectic Euler's systematic error: -0.5*g*T*dt
    // Use T*(T+dt) instead of T² so the ball arrives exactly at targetY
    const DT = 1 / 120; // physics timestep
    const vy = (target.y - this.position.y + 0.5 * GRAVITY * flightTime * (flightTime + DT)) / flightTime;
    const vz = (target.z - this.position.z) / flightTime;

    this.velocity.set(vx, vy, vz);

    this.active = true;
    this.reachedPlate = false;
  }

  step(dt) {
    if (!this.active) return;

    // Gravity only — no drag or Magnus.
    // The 2D marker animation on the strike zone handles visual "break";
    // removing drag/Magnus ensures the 3D ball lands exactly at the aimed position.
    const accel = new THREE.Vector3(0, -GRAVITY, 0);

    this.velocity.add(accel.clone().multiplyScalar(dt));
    this.position.add(this.velocity.clone().multiplyScalar(dt));

    if (this.position.z >= 0) {
      // Interpolate back to exact Z=0 crossing so X,Y match the target
      const vz = this.velocity.z;
      if (vz > 0.001) {
        const tBack = this.position.z / vz;
        this.position.x -= this.velocity.x * tBack;
        this.position.y -= this.velocity.y * tBack;
        this.position.z = 0;
      }
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
