import * as THREE from 'three';
import { BALL_RADIUS, BALL_VISUAL_SCALE } from '../constants.js';

export class BallVisual {
  constructor(scene) {
    this._scene = scene;

    const r = BALL_RADIUS * BALL_VISUAL_SCALE;
    const geo = new THREE.SphereGeometry(r, 16, 16);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Seam lines (red great circles)
    this._seams = this._createSeams(r);
    this.mesh.add(this._seams);

    // Trail particles
    this._trail = [];
    this._trailGroup = new THREE.Group();
    scene.add(this._trailGroup);
  }

  _createSeams(r) {
    const group = new THREE.Group();
    const seamMat = new THREE.LineBasicMaterial({ color: 0xcc2222 });

    // Two seam curves approximated as tilted circles
    for (const tilt of [0.3, -0.3]) {
      const points = [];
      for (let i = 0; i <= 64; i++) {
        const t = (i / 64) * Math.PI * 2;
        const x = Math.cos(t) * r * 1.01;
        const y = Math.sin(t) * r * 1.01;
        const z = Math.sin(t * 2) * r * 0.15;
        points.push(new THREE.Vector3(
          x * Math.cos(tilt) + z * Math.sin(tilt),
          y,
          -x * Math.sin(tilt) + z * Math.cos(tilt)
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geo, seamMat));
    }
    return group;
  }

  show(position) {
    this.mesh.position.copy(position);
    this.mesh.visible = true;
    this._clearTrail();
  }

  hide() {
    this.mesh.visible = false;
    this._clearTrail();
  }

  update(position, spinAxis, spinSpeed, dt) {
    this.mesh.position.copy(position);

    // Rotate ball based on spin
    if (spinSpeed > 0 && spinAxis) {
      this.mesh.rotateOnWorldAxis(spinAxis.clone().normalize(), spinSpeed * dt);
    }

    // Add trail point
    this._addTrailPoint(position);
  }

  _addTrailPoint(pos) {
    const r = BALL_RADIUS * BALL_VISUAL_SCALE * 0.6;
    const geo = new THREE.SphereGeometry(r, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });
    const dot = new THREE.Mesh(geo, mat);
    dot.position.copy(pos);
    this._trailGroup.add(dot);
    this._trail.push({ mesh: dot, life: 0.25 });

    // Limit trail length
    if (this._trail.length > 15) {
      const old = this._trail.shift();
      this._trailGroup.remove(old.mesh);
      old.mesh.geometry.dispose();
      old.mesh.material.dispose();
    }
  }

  updateTrail(dt) {
    for (let i = this._trail.length - 1; i >= 0; i--) {
      this._trail[i].life -= dt;
      this._trail[i].mesh.material.opacity = Math.max(0, this._trail[i].life / 0.25) * 0.3;
      if (this._trail[i].life <= 0) {
        this._trailGroup.remove(this._trail[i].mesh);
        this._trail[i].mesh.geometry.dispose();
        this._trail[i].mesh.material.dispose();
        this._trail.splice(i, 1);
      }
    }
  }

  _clearTrail() {
    for (const t of this._trail) {
      this._trailGroup.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    }
    this._trail = [];
  }

  /**
   * Spawn an independent "hit ball" clone at current position.
   * Returns an object with update(pos) and dispose() methods.
   * The main ball can be hidden/reused for pitching while this one keeps rolling.
   */
  spawnHitBall() {
    const r = BALL_RADIUS * BALL_VISUAL_SCALE;
    const geo = new THREE.SphereGeometry(r, 12, 12);
    const mat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(this.mesh.position);
    mesh.castShadow = true;
    this._scene.add(mesh);

    return {
      mesh,
      update(pos) { mesh.position.copy(pos); },
      dispose: () => {
        this._scene.remove(mesh);
        geo.dispose();
        mat.dispose();
      },
    };
  }
}
