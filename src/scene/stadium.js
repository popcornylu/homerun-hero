import * as THREE from 'three';
import { MOUND_DISTANCE, BASE_DISTANCE, FENCE_CENTER, FENCE_LEFT, FENCE_RIGHT, FENCE_HEIGHT } from '../constants.js';

export class Stadium {
  constructor(scene) {
    this.group = new THREE.Group();
    this._buildField();
    this._buildInfield();
    this._buildFoulLines();
    this._buildFence();
    this._buildBases();
    this._buildMound();
    scene.add(this.group);
  }

  _buildField() {
    // Outfield grass
    const grassGeo = new THREE.CircleGeometry(160, 64, 0, Math.PI);
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x2d8a4e });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.rotation.z = Math.PI; // face toward outfield (-Z)
    grass.receiveShadow = true;
    this.group.add(grass);

    // Ground behind home plate (for camera view)
    const behindGeo = new THREE.PlaneGeometry(40, 20);
    const behindMat = new THREE.MeshLambertMaterial({ color: 0x2d8a4e });
    const behind = new THREE.Mesh(behindGeo, behindMat);
    behind.rotation.x = -Math.PI / 2;
    behind.position.set(0, -0.01, 10);
    behind.receiveShadow = true;
    this.group.add(behind);
  }

  _buildInfield() {
    // Infield dirt - diamond shape
    const dirtGeo = new THREE.CircleGeometry(28, 4);
    const dirtMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.rotation.z = Math.PI / 4;
    dirt.position.set(0, 0.005, -BASE_DISTANCE / 2);
    dirt.receiveShadow = true;
    this.group.add(dirt);

    // Infield grass (cutout circle in the middle)
    const innerGrassGeo = new THREE.CircleGeometry(18, 32);
    const innerGrassMat = new THREE.MeshLambertMaterial({ color: 0x2d8a4e });
    const innerGrass = new THREE.Mesh(innerGrassGeo, innerGrassMat);
    innerGrass.rotation.x = -Math.PI / 2;
    innerGrass.position.set(0, 0.01, -BASE_DISTANCE / 2);
    innerGrass.receiveShadow = true;
    this.group.add(innerGrass);

    // Home plate area dirt circle
    const homeDirtGeo = new THREE.CircleGeometry(4, 32);
    const homeDirt = new THREE.Mesh(homeDirtGeo, dirtMat.clone());
    homeDirt.rotation.x = -Math.PI / 2;
    homeDirt.position.set(0, 0.006, 0);
    homeDirt.receiveShadow = true;
    this.group.add(homeDirt);
  }

  _buildFoulLines() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Left foul line
    const leftLineGeo = new THREE.PlaneGeometry(0.1, 160);
    const leftLine = new THREE.Mesh(leftLineGeo, lineMat);
    leftLine.rotation.x = -Math.PI / 2;
    leftLine.rotation.z = Math.PI / 4;
    leftLine.position.set(-56.57, 0.02, -56.57);
    this.group.add(leftLine);

    // Right foul line
    const rightLine = new THREE.Mesh(leftLineGeo.clone(), lineMat);
    rightLine.rotation.x = -Math.PI / 2;
    rightLine.rotation.z = -Math.PI / 4;
    rightLine.position.set(56.57, 0.02, -56.57);
    this.group.add(rightLine);
  }

  _buildFence() {
    // Outfield fence as a curved wall
    const curve = new THREE.EllipseCurve(
      0, 0,
      FENCE_CENTER, FENCE_CENTER,
      Math.PI * 0.75, Math.PI * 0.25,
      true
    );
    const points2D = curve.getPoints(64);
    const shape = new THREE.Shape();

    // Build fence wall shape
    const fenceGeo = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];

    for (let i = 0; i < points2D.length; i++) {
      const x = points2D[i].x;
      const z = -points2D[i].y; // flip Y to Z
      vertices.push(x, 0, z);
      vertices.push(x, FENCE_HEIGHT, z);
    }

    for (let i = 0; i < points2D.length - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }

    fenceGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    fenceGeo.setIndex(indices);
    fenceGeo.computeVertexNormals();

    const fenceMat = new THREE.MeshLambertMaterial({
      color: 0x1a5c2a,
      side: THREE.DoubleSide,
    });
    const fence = new THREE.Mesh(fenceGeo, fenceMat);
    fence.castShadow = true;
    this.group.add(fence);

    // Yellow line on top of fence
    const topLineGeo = new THREE.BufferGeometry();
    const topVerts = [];
    for (const p of points2D) {
      topVerts.push(p.x, FENCE_HEIGHT + 0.05, -p.y);
    }
    topLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    const topLine = new THREE.Line(
      topLineGeo,
      new THREE.LineBasicMaterial({ color: 0xffdd00, linewidth: 2 })
    );
    this.group.add(topLine);
  }

  _buildBases() {
    const baseMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const baseGeo = new THREE.BoxGeometry(0.38, 0.05, 0.38);

    // Home plate (pentagon shape simplified as box)
    const home = new THREE.Mesh(baseGeo, baseMat);
    home.position.set(0, 0.025, 0);
    this.group.add(home);

    // 1st base
    const first = new THREE.Mesh(baseGeo, baseMat);
    first.position.set(BASE_DISTANCE / Math.SQRT2, 0.025, -BASE_DISTANCE / Math.SQRT2);
    this.group.add(first);

    // 2nd base
    const second = new THREE.Mesh(baseGeo, baseMat);
    second.position.set(0, 0.025, -BASE_DISTANCE * Math.SQRT2);
    this.group.add(second);

    // 3rd base
    const third = new THREE.Mesh(baseGeo, baseMat);
    third.position.set(-BASE_DISTANCE / Math.SQRT2, 0.025, -BASE_DISTANCE / Math.SQRT2);
    this.group.add(third);
  }

  _buildMound() {
    // Pitcher's mound
    const moundGeo = new THREE.CylinderGeometry(2.7, 3.0, 0.25, 16);
    const moundMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    const mound = new THREE.Mesh(moundGeo, moundMat);
    mound.position.set(0, 0.125, -MOUND_DISTANCE);
    mound.receiveShadow = true;
    this.group.add(mound);

    // Rubber
    const rubberGeo = new THREE.BoxGeometry(0.61, 0.05, 0.15);
    const rubberMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const rubber = new THREE.Mesh(rubberGeo, rubberMat);
    rubber.position.set(0, 0.28, -MOUND_DISTANCE);
    this.group.add(rubber);
  }
}
