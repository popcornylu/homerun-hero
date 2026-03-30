import * as THREE from 'three';
import { MOUND_DISTANCE } from '../constants.js';

export class Pitcher {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0, 0.25, -MOUND_DISTANCE);

    this._animTime = 0;
    this._animating = false;
    this._releaseCallback = null;
    this._released = false;

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.7, 4, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    this._body = new THREE.Mesh(bodyGeo, bodyMat);
    this._body.position.y = 1.1;
    this._body.castShadow = true;
    this.group.add(this._body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
    this._head = new THREE.Mesh(headGeo, headMat);
    this._head.position.y = 1.7;
    this.group.add(this._head);

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 8);
    const capMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    this._cap = new THREE.Mesh(capGeo, capMat);
    this._cap.position.y = 1.82;
    this.group.add(this._cap);

    // Throwing arm
    const armGeo = new THREE.CapsuleGeometry(0.06, 0.5, 4, 8);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
    this._arm = new THREE.Mesh(armGeo, armMat);
    this._arm.position.set(-0.3, 1.3, 0);
    this._armRestRotation = 0;
    this.group.add(this._arm);

    // Glove arm
    const gloveArm = new THREE.Mesh(armGeo.clone(), bodyMat.clone());
    gloveArm.position.set(0.3, 1.2, -0.1);
    gloveArm.rotation.x = -0.3;
    this.group.add(gloveArm);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.08, 0.4, 4, 8);
    const legMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.4, 0);
    this.group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo.clone(), legMat);
    rightLeg.position.set(0.12, 0.4, 0);
    this.group.add(rightLeg);

    scene.add(this.group);
  }

  startWindup(onRelease) {
    this._animTime = 0;
    this._animating = true;
    this._released = false;
    this._releaseCallback = onRelease;
  }

  update(dt) {
    if (!this._animating) return;

    this._animTime += dt;
    const t = this._animTime;

    if (t < 0.6) {
      // Windup: raise arm back
      const p = t / 0.6;
      this._arm.rotation.x = -p * 2.5;
      this._arm.position.y = 1.3 + p * 0.3;
      this._body.rotation.x = p * 0.15;
    } else if (t < 0.85) {
      // Forward delivery
      const p = (t - 0.6) / 0.25;
      this._arm.rotation.x = -2.5 + p * 4.0;
      this._arm.position.y = 1.6 - p * 0.4;
      this._arm.position.z = p * 0.5;
      this._body.rotation.x = 0.15 - p * 0.25;

      // Release point at ~80% through delivery
      if (p > 0.7 && !this._released) {
        this._released = true;
        if (this._releaseCallback) this._releaseCallback();
      }
    } else if (t < 1.3) {
      // Follow through
      const p = (t - 0.85) / 0.45;
      this._arm.rotation.x = 1.5 - p * 1.5;
      this._arm.position.z = 0.5 - p * 0.5;
      this._body.rotation.x = -0.1 + p * 0.1;
    } else {
      // Reset
      this._arm.rotation.x = 0;
      this._arm.position.set(-0.3, 1.3, 0);
      this._body.rotation.x = 0;
      this._animating = false;
    }
  }

  getReleasePoint() {
    // World-space release point (hand position at release)
    return new THREE.Vector3(-0.3, 2.0, -MOUND_DISTANCE + 0.5);
  }
}
