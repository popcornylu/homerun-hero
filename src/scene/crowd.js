import * as THREE from 'three';
import { FENCE_CENTER } from '../constants.js';

const SKIN_COLORS = [0xf5d0a9, 0xd4a574, 0xc68642, 0x8d5524, 0xffdbac, 0xe8b88a];
const SHIRT_COLORS = [
  0x2244aa, 0xcc2222, 0x22aa44, 0xeeee22, 0xff8800,
  0xffffff, 0x222222, 0xaa22aa, 0x22aaaa, 0x4466cc,
  0x884422, 0x44cc44, 0xdd4488, 0x6644aa, 0x888888,
];

export class Crowd {
  constructor(scene) {
    this._scene = scene;
    this._celebrating = false;
    this._celebrateTime = 0;

    // Generate all spectator positions first
    this._specs = [];
    this._generateOutfieldCrowd();

    const n = this._specs.length;

    // Shared geometries (2x size)
    const headGeo = new THREE.SphereGeometry(0.44, 5, 5);
    const bodyGeo = new THREE.CylinderGeometry(0.36, 0.44, 0.9, 5);
    const handGeo = new THREE.SphereGeometry(0.16, 4, 4);

    // Instanced meshes (4 draw calls for all spectators)
    const matHead = new THREE.MeshLambertMaterial();
    const matBody = new THREE.MeshLambertMaterial();
    const matHand = new THREE.MeshLambertMaterial();

    this._heads = new THREE.InstancedMesh(headGeo, matHead, n);
    this._bodies = new THREE.InstancedMesh(bodyGeo, matBody, n);
    this._handL = new THREE.InstancedMesh(handGeo, matHand, n);
    this._handR = new THREE.InstancedMesh(handGeo, matHand, n);

    // Enable per-instance colors
    this._heads.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this._bodies.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this._handL.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    this._handR.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);

    // Set initial transforms and colors
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const s = this._specs[i];

      // Skin and shirt colors
      const skinHex = SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)];
      const shirtHex = SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)];

      // Head
      color.setHex(skinHex);
      this._heads.setColorAt(i, color);

      // Body
      color.setHex(shirtHex);
      this._bodies.setColorAt(i, color);

      // Hands (same skin)
      color.setHex(skinHex);
      this._handL.setColorAt(i, color);
      this._handR.setColorAt(i, color);

      // Set initial transforms
      this._setRestPose(i, s, dummy);
    }

    this._heads.instanceMatrix.needsUpdate = true;
    this._bodies.instanceMatrix.needsUpdate = true;
    this._handL.instanceMatrix.needsUpdate = true;
    this._handR.instanceMatrix.needsUpdate = true;

    scene.add(this._heads);
    scene.add(this._bodies);
    scene.add(this._handL);
    scene.add(this._handR);
  }

  _generateOutfieldCrowd() {
    const FC = FENCE_CENTER;
    const arcStart = Math.PI * 0.78;
    const arcEnd = Math.PI * 0.22;
    const arcSpan = arcEnd - arcStart; // negative (CW)

    // Must match stadium.js deckConfigs exactly!
    // Floor Y for row = baseY + row * rowH
    // Spectator stands on floor, so y = floorY + 0.3 (half body height)
    const decks = [
      { startR: FC + 3,  baseY: 0,    rows: 15, rowD: 1.8, rowH: 1.1 },  // Lower deck
      { startR: FC + 30, baseY: 17,   rows: 5,  rowD: 2.0, rowH: 1.0 },  // Club level
      { startR: FC + 41, baseY: 22.5, rows: 15, rowD: 1.8, rowH: 1.1 },  // Upper deck
    ];

    for (const deck of decks) {
      for (let row = 0; row < deck.rows; row++) {
        const r = deck.startR + row * deck.rowD;
        const y = deck.baseY + row * deck.rowH;
        // Seat spacing along the arc
        const circumference = r * Math.abs(arcSpan);
        const spacing = 1.8; // meters between spectators
        const numSeats = Math.floor(circumference / spacing);

        for (let i = 0; i < numSeats; i++) {
          // Small random gaps (empty seats ~10%)
          if (Math.random() < 0.1) continue;

          const t = (i + Math.random() * 0.3) / numSeats;
          const angle = arcStart + arcSpan * t;
          const rr = r + (Math.random() - 0.5) * 0.4;
          const x = Math.cos(angle) * rr;
          const z = -Math.sin(angle) * rr;

          this._specs.push({
            x, y: y + 0.5, z,  // stand on top of the floor
            phase: Math.random() * Math.PI * 2,
            speed: 0.3 + Math.random() * 0.8,
            amp: 0.01 + Math.random() * 0.02,
          });
        }
      }
    }

    console.log(`[Crowd] ${this._specs.length} spectators generated`);
  }

  _setRestPose(i, s, dummy) {
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);

    // Body
    dummy.position.set(s.x, s.y, s.z);
    dummy.updateMatrix();
    this._bodies.setMatrixAt(i, dummy.matrix);

    // Head (above body)
    dummy.position.set(s.x, s.y + 0.84, s.z);
    dummy.updateMatrix();
    this._heads.setMatrixAt(i, dummy.matrix);

    // Hands
    dummy.position.set(s.x - 0.6, s.y + 0.1, s.z);
    dummy.updateMatrix();
    this._handL.setMatrixAt(i, dummy.matrix);

    dummy.position.set(s.x + 0.6, s.y + 0.1, s.z);
    dummy.updateMatrix();
    this._handR.setMatrixAt(i, dummy.matrix);
  }

  celebrate() {
    this._celebrating = true;
    this._celebrateTime = 0;
  }

  update(dt) {
    if (this._celebrating) {
      this._celebrateTime += dt;
      if (this._celebrateTime > 4.0) {
        this._celebrating = false;
        this._needsReset = true;
      }
      this._animateCelebration();
    } else if (this._needsReset) {
      // Reset to rest pose after celebration ends
      const dummy = new THREE.Object3D();
      for (let i = 0; i < this._specs.length; i++) {
        this._setRestPose(i, this._specs[i], dummy);
      }
      this._heads.instanceMatrix.needsUpdate = true;
      this._bodies.instanceMatrix.needsUpdate = true;
      this._handL.instanceMatrix.needsUpdate = true;
      this._handR.instanceMatrix.needsUpdate = true;
      this._needsReset = false;
    }
    // Idle: no per-frame update needed (rest pose is static) — saves perf
  }

  _animateCelebration() {
    const ct = this._celebrateTime;
    const dummy = new THREE.Object3D();
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    const n = this._specs.length;

    for (let i = 0; i < n; i++) {
      const s = this._specs[i];

      const jumpPhase = Math.sin((ct * 7 + s.phase) * 1.3);
      const jump = Math.max(0, jumpPhase) * 0.7;
      const wave = Math.sin(ct * 9 + s.phase) * 0.25;

      // Body
      dummy.position.set(s.x, s.y + jump, s.z);
      dummy.updateMatrix();
      this._bodies.setMatrixAt(i, dummy.matrix);

      // Head
      dummy.position.y = s.y + 0.84 + jump;
      dummy.updateMatrix();
      this._heads.setMatrixAt(i, dummy.matrix);

      // Hands up and waving
      dummy.position.set(s.x - 0.5, s.y + 1.4 + jump + wave, s.z);
      dummy.updateMatrix();
      this._handL.setMatrixAt(i, dummy.matrix);

      dummy.position.set(s.x + 0.5, s.y + 1.4 + jump - wave, s.z);
      dummy.updateMatrix();
      this._handR.setMatrixAt(i, dummy.matrix);
    }

    this._heads.instanceMatrix.needsUpdate = true;
    this._bodies.instanceMatrix.needsUpdate = true;
    this._handL.instanceMatrix.needsUpdate = true;
    this._handR.instanceMatrix.needsUpdate = true;
  }
}
