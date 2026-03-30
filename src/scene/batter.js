import * as THREE from 'three';

export class Batter {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.position.set(0.5, 0, 0.3); // Right-handed batter, offset from plate

    this._swinging = false;
    this._swingTime = 0;
    this._swingDuration = 0.28;

    // Dodgers style: white jersey, blue accents, blue helmet
    const jerseyMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 }); // white jersey
    const blueMat = new THREE.MeshLambertMaterial({ color: 0x005a9c });   // Dodger blue
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a574 });
    const pantsMat = new THREE.MeshLambertMaterial({ color: 0x888888 });  // dark grey pants

    // Body (white jersey — shorter, just upper torso)
    const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.35, 4, 8);
    this._body = new THREE.Mesh(bodyGeo, jerseyMat);
    this._body.position.y = 1.15;
    this._body.castShadow = true;
    this.group.add(this._body);

    // Head + helmet
    const headGeo = new THREE.SphereGeometry(0.15, 8, 8);
    this._head = new THREE.Mesh(headGeo, skinMat);
    this._head.position.y = 1.6;
    this.group.add(this._head);

    const helmetGeo = new THREE.SphereGeometry(0.17, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmet = new THREE.Mesh(helmetGeo, blueMat);
    helmet.position.y = 1.62;
    this.group.add(helmet);

    // Legs (grey pants — visible below jersey)
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.5, 4, 8);
    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.12, 0.4, 0);
    this.group.add(leftLeg);
    const rightLeg = new THREE.Mesh(legGeo.clone(), pantsMat);
    rightLeg.position.set(0.12, 0.4, 0);
    this.group.add(rightLeg);

    // Bat pivot (at shoulder height, centered on body)
    this._batPivot = new THREE.Group();
    this._batPivot.position.set(0, 1.2, 0);
    this.group.add(this._batPivot);

    // Bat — origin at the grip (y=0), barrel extends upward (+Y)
    const batGroup = new THREE.Group();
    const handleGeo = new THREE.CylinderGeometry(0.018, 0.015, 0.45, 8);
    const batMat = new THREE.MeshLambertMaterial({ color: 0xc89030 });
    const handle = new THREE.Mesh(handleGeo, batMat);
    handle.position.y = 0.225; // handle center (grip at y=0, top at y=0.45)
    batGroup.add(handle);
    const barrelGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.55, 8);
    const barrel = new THREE.Mesh(barrelGeo, batMat);
    barrel.position.y = 0.725; // barrel center (starts at y=0.45, ends at y=1.0)
    batGroup.add(barrel);

    this._bat = batGroup;
    // Grip sits at the pivot point; bat extends upward in stance
    this._bat.position.set(0, 0, 0);
    this._bat.rotation.z = 0.15;
    this._batPivot.add(this._bat);

    // Stance: bat behind right shoulder (from camera view)
    this._stanceY = 1.0; // batPivot Y rotation in stance
    this._batPivot.rotation.y = this._stanceY;

    // Batter faces pitcher (back toward camera)
    this.group.rotation.y = -0.3;

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

    // Pawapuro 5-step swing (keyframe lerp)
    // pivotY: sweep right→left→wrap around to left shoulder
    // batZ:   vertical→horizontal→back to vertical (on other side)
    // batX:   slight forward tilt mid-swing
    // bodyY:  torso rotates to follow
    const keys = [
    //  time  pivotY               batZ    batX   bodyY
      [ 0.00, this._stanceY,       0.15,   0.0,   0.0  ],  // stance
      [ 0.15, this._stanceY-0.8,  -0.4,    0.0,  -0.1  ],  // load
      [ 0.35, this._stanceY-3.0,  -1.5,    0.0,  -0.5  ],  // contact (horizontal)
      [ 0.55, this._stanceY-4.2,  -1.5,   -0.3,  -0.8  ],  // through zone
      [ 0.80, this._stanceY-5.5,  -0.6,    0.0,  -1.1  ],  // wrapping around
      [ 1.00, this._stanceY-6.0,  -0.1,    0.2,  -1.2  ],  // left shoulder, barrel up
    ];

    // Find which segment we're in and lerp
    let k0 = keys[0], k1 = keys[1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i][0] && p <= keys[i + 1][0]) {
        k0 = keys[i];
        k1 = keys[i + 1];
        break;
      }
    }
    const seg = (p - k0[0]) / (k1[0] - k0[0]);
    const s = seg * seg * (3 - 2 * seg); // smoothstep for natural motion

    this._batPivot.rotation.y = k0[1] + (k1[1] - k0[1]) * s;
    this._bat.rotation.z       = k0[2] + (k1[2] - k0[2]) * s;
    this._bat.rotation.x       = k0[3] + (k1[3] - k0[3]) * s;
    this._body.rotation.y      = k0[4] + (k1[4] - k0[4]) * s;

    if (p >= 1.0) {
      // Hold follow-through briefly, then reset
      this._swingTime += dt;
      if (this._swingTime > this._swingDuration + 0.35) {
        this._batPivot.rotation.y = this._stanceY;
        this._bat.rotation.z = 0.15;
        this._bat.rotation.x = 0;
        this._body.rotation.y = 0;
        this._swinging = false;
      }
    }
  }
}
