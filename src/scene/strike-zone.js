import * as THREE from 'three';
import { STRIKE_ZONE } from '../constants.js';

export class StrikeZoneVisual {
  constructor(scene) {
    this.group = new THREE.Group();

    const w = STRIKE_ZONE.xMax - STRIKE_ZONE.xMin;
    const h = STRIKE_ZONE.yMax - STRIKE_ZONE.yMin;
    const cx = (STRIKE_ZONE.xMin + STRIKE_ZONE.xMax) / 2;
    const cy = (STRIKE_ZONE.yMin + STRIKE_ZONE.yMax) / 2;

    // Semi-transparent filled plane
    const planeGeo = new THREE.PlaneGeometry(w, h);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.set(cx, cy, 0);
    this.group.add(plane);

    // Bright border
    const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h));
    const borderMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.set(cx, cy, 0);
    this.group.add(border);

    // Inner grid lines (3x3)
    const gridMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });

    for (let i = 1; i < 3; i++) {
      const vx = STRIKE_ZONE.xMin + (w / 3) * i;
      const vGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(vx, STRIKE_ZONE.yMin, 0),
        new THREE.Vector3(vx, STRIKE_ZONE.yMax, 0),
      ]);
      this.group.add(new THREE.Line(vGeo, gridMat));

      const hy = STRIKE_ZONE.yMin + (h / 3) * i;
      const hGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(STRIKE_ZONE.xMin, hy, 0),
        new THREE.Vector3(STRIKE_ZONE.xMax, hy, 0),
      ]);
      this.group.add(new THREE.Line(hGeo, gridMat));
    }

    scene.add(this.group);

    // Ball position marker - BIG bright circle on the zone
    const markerGeo = new THREE.CircleGeometry(0.045, 24);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._ballMarker = new THREE.Mesh(markerGeo, markerMat);
    this._ballMarker.visible = false;
    scene.add(this._ballMarker);

    // Outer glow ring
    const ringGeo = new THREE.RingGeometry(0.05, 0.07, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._ballRing = new THREE.Mesh(ringGeo, ringMat);
    this._ballRing.visible = false;
    scene.add(this._ballRing);
  }

  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  updateBallMarker(worldX, worldY) {
    this._ballMarker.position.set(worldX, worldY, 0.01);
    this._ballMarker.visible = true;
    this._ballRing.position.set(worldX, worldY, 0.01);
    this._ballRing.visible = true;
  }

  hideBallMarker() {
    this._ballMarker.visible = false;
    this._ballRing.visible = false;
  }
}
