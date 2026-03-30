import * as THREE from 'three';

export class Batter {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0.5, 0, 0.3); // Right-handed batter, offset from plate

    this._swinging = false;
    this._swingTime = 0;
    this._swingDuration = 0.15;

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.6, 4, 8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    this._body = new THREE.Mesh(bodyGeo, bodyMat);
    this._body.position.y = 1.05;
    this._body.castShadow = true;
    this.group.add(this._body);

    // Head + helmet
    const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
    this._head = new THREE.Mesh(headGeo, headMat);
    this._head.position.y = 1.6;
    this.group.add(this._head);

    const helmetGeo = new THREE.SphereGeometry(0.17, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x222266 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 1.62;
    this.group.add(helmet);

    // Legs
    const legGeo = new THREE.CapsuleGeometry(0.08, 0.4, 4, 8);
    const legMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.35, 0);
    this.group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo.clone(), legMat);
    rightLeg.position.set(0.12, 0.35, 0);
    this.group.add(rightLeg);

    // Bat pivot (at shoulder height)
    this._batPivot = new THREE.Group();
    this._batPivot.position.set(-0.15, 1.3, 0);
    this.group.add(this._batPivot);

    // Bat
    const batGeo = new THREE.CylinderGeometry(0.02, 0.04, 1.0, 8);
    const batMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    this._bat = new THREE.Mesh(batGeo, batMat);
    this._bat.position.set(-0.3, 0.3, -0.1);
    this._bat.rotation.z = -0.5;
    this._bat.castShadow = true;
    this._batPivot.add(this._bat);

    // Stance rotation (batter faces pitcher)
    this.group.rotation.y = -0.3;

    // Store rest position
    this._batRestRot = this._batPivot.rotation.y;

    scene.add(this.group);
  }

  swing() {
    if (this._swinging) return;
    this._swinging = true;
    this._swingTime = 0;
  }

  update(dt) {
    if (!this._swinging) return;

    this._swingTime += dt;
    const p = Math.min(this._swingTime / this._swingDuration, 1);

    // Swing arc: rotate bat pivot around Y axis
    if (p < 0.5) {
      // Load / start swing
      const t = p / 0.5;
      this._batPivot.rotation.y = this._batRestRot + t * 2.8;
      this._body.rotation.y = t * 0.5;
    } else if (p < 1.0) {
      // Follow through
      const t = (p - 0.5) / 0.5;
      this._batPivot.rotation.y = this._batRestRot + 2.8 + t * 0.5;
      this._body.rotation.y = 0.5 - t * 0.3;
    }

    if (p >= 1.0) {
      // Reset after a short delay
      this._swingTime += dt;
      if (this._swingTime > this._swingDuration + 0.3) {
        this._batPivot.rotation.y = this._batRestRot;
        this._body.rotation.y = 0;
        this._swinging = false;
      }
    }
  }
}
