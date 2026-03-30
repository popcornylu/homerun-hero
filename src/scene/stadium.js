import * as THREE from 'three';
import { MOUND_DISTANCE, BASE_DISTANCE, FENCE_CENTER, FENCE_LEFT, FENCE_RIGHT, FENCE_HEIGHT } from '../constants.js';

export class Stadium {
  constructor(scene) {
    this.group = new THREE.Group();
    this._buildField();
    this._buildInfield();
    this._buildBatterBox();
    this._buildFoulLines();
    this._buildWarningTrack();
    this._buildFence();
    this._buildBases();
    this._buildMound();
    this._buildBackstop();
    this._buildDugouts();
    this._buildStands();
    this._buildScoreboard();
    this._buildLightTowers();
    scene.add(this.group);
  }

  // ── Field surface ──────────────────────────────────────────────
  _buildField() {
    const grassDark = 0x2e8b4a;
    const grassLight = 0x3ca85c;

    // Full ground plane (covers everything, vivid green)
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const ground = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: grassDark }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -80);
    ground.receiveShadow = true;
    this.group.add(ground);

    // Outfield mowed stripes (alternating light/dark rings)
    for (let i = 0; i < 12; i++) {
      const innerR = 22 + i * 14;
      const outerR = innerR + 7;
      if (outerR > FENCE_CENTER - 6) break; // stop before warning track
      const stripeGeo = new THREE.RingGeometry(innerR, outerR, 48, 1, 0, Math.PI);
      const stripe = new THREE.Mesh(stripeGeo, new THREE.MeshLambertMaterial({ color: grassLight }));
      stripe.rotation.x = -Math.PI / 2;
      stripe.rotation.z = Math.PI;
      stripe.position.y = 0.003;
      stripe.receiveShadow = true;
      this.group.add(stripe);
    }

    // Behind home plate area
    const behindGeo = new THREE.PlaneGeometry(50, 30);
    const behind = new THREE.Mesh(behindGeo, new THREE.MeshLambertMaterial({ color: grassDark }));
    behind.rotation.x = -Math.PI / 2;
    behind.position.set(0, -0.01, 15);
    behind.receiveShadow = true;
    this.group.add(behind);
  }

  // ── Infield dirt ───────────────────────────────────────────────
  _buildInfield() {
    const dirtColor = 0x9B7530;
    const dirtMat = new THREE.MeshLambertMaterial({ color: dirtColor });

    // Skinned infield diamond
    const dirtGeo = new THREE.CircleGeometry(29, 4);
    const dirt = new THREE.Mesh(dirtGeo, dirtMat);
    dirt.rotation.x = -Math.PI / 2;
    dirt.rotation.z = Math.PI / 4;
    dirt.position.set(0, 0.005, -BASE_DISTANCE / 2);
    dirt.receiveShadow = true;
    this.group.add(dirt);

    // Infield grass circle
    const innerGeo = new THREE.CircleGeometry(18.5, 48);
    const innerMat = new THREE.MeshLambertMaterial({ color: 0x2e8b4a });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(0, 0.01, -BASE_DISTANCE / 2);
    inner.receiveShadow = true;
    this.group.add(inner);

    // Home plate dirt circle
    const homeDirt = new THREE.Mesh(new THREE.CircleGeometry(5, 32), dirtMat.clone());
    homeDirt.rotation.x = -Math.PI / 2;
    homeDirt.position.set(0, 0.006, 0);
    homeDirt.receiveShadow = true;
    this.group.add(homeDirt);

    // Dirt cutouts at 1st and 3rd
    for (const sx of [1, -1]) {
      const bd = new THREE.Mesh(new THREE.CircleGeometry(2.5, 16), dirtMat.clone());
      bd.rotation.x = -Math.PI / 2;
      bd.position.set(sx * BASE_DISTANCE / Math.SQRT2, 0.007, -BASE_DISTANCE / Math.SQRT2);
      this.group.add(bd);
    }

    // Base paths
    const pathMat = new THREE.MeshLambertMaterial({ color: dirtColor });
    const pathGeo = new THREE.PlaneGeometry(1.0, BASE_DISTANCE);
    for (const angle of [-Math.PI / 4, Math.PI / 4]) {
      const path = new THREE.Mesh(pathGeo, pathMat);
      path.rotation.x = -Math.PI / 2;
      path.rotation.z = angle;
      const cx = Math.sin(-angle) * BASE_DISTANCE / 2;
      const cz = -Math.cos(-angle) * BASE_DISTANCE / 2;
      path.position.set(cx, 0.006, cz);
      this.group.add(path);
    }
  }

  // ── Batter's box & catcher's box ──────────────────────────────
  _buildBatterBox() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const boxW = 1.2, boxH = 1.8, lw = 0.05;

    const makeBox = (cx, cz) => {
      const lines = [
        [cx - boxW / 2, cz, lw, boxH],
        [cx + boxW / 2, cz, lw, boxH],
        [cx, cz - boxH / 2, boxW, lw],
        [cx, cz + boxH / 2, boxW, lw],
      ];
      for (const [x, z, w, h] of lines) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.015, z);
        this.group.add(m);
      }
    };
    makeBox(0.7, 0);
    makeBox(-0.7, 0);

    // Catcher's box back line
    const cb = new THREE.Mesh(new THREE.PlaneGeometry(2.6, lw), lineMat);
    cb.rotation.x = -Math.PI / 2;
    cb.position.set(0, 0.015, 1.3);
    this.group.add(cb);
  }

  // ── Foul lines ─────────────────────────────────────────────────
  _buildFoulLines() {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineGeo = new THREE.PlaneGeometry(0.12, 170);

    for (const angle of [Math.PI / 4, -Math.PI / 4]) {
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = angle;
      const cx = Math.sin(-angle) * 60;
      const cz = -Math.cos(-angle) * 60;
      line.position.set(cx, 0.02, cz);
      this.group.add(line);
    }
  }

  // ── Warning track ──────────────────────────────────────────────
  _buildWarningTrack() {
    const inner = new THREE.EllipseCurve(0, 0, FENCE_CENTER - 5, FENCE_CENTER - 5, Math.PI * 0.76, Math.PI * 0.24, true).getPoints(64);
    const outer = new THREE.EllipseCurve(0, 0, FENCE_CENTER + 1, FENCE_CENTER + 1, Math.PI * 0.76, Math.PI * 0.24, true).getPoints(64);

    const verts = [], idx = [];
    for (let i = 0; i < inner.length; i++) {
      verts.push(inner[i].x, 0.003, -inner[i].y);
      verts.push(outer[i].x, 0.003, -outer[i].y);
    }
    for (let i = 0; i < inner.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      idx.push(a, c, b, b, c, d);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.group.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x8B7530 })));
  }

  // ── Outfield fence ─────────────────────────────────────────────
  _buildFence() {
    const pts = new THREE.EllipseCurve(0, 0, FENCE_CENTER, FENCE_CENTER, Math.PI * 0.75, Math.PI * 0.25, true).getPoints(64);

    // Main wall
    const wallVerts = [], wallIdx = [];
    for (const p of pts) {
      wallVerts.push(p.x, 0, -p.y, p.x, FENCE_HEIGHT, -p.y);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      wallIdx.push(a, c, b, b, c, d);
    }
    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallVerts, 3));
    wallGeo.setIndex(wallIdx);
    wallGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(wallGeo, new THREE.MeshLambertMaterial({ color: 0x1a5c2a, side: THREE.DoubleSide })));

    // Padding (darker lower strip)
    const padVerts = [], padIdx = [];
    const padH = 1.2;
    for (const p of pts) {
      padVerts.push(p.x, 0, -p.y - 0.05, p.x, padH, -p.y - 0.05);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      padIdx.push(a, c, b, b, c, d);
    }
    const padGeo = new THREE.BufferGeometry();
    padGeo.setAttribute('position', new THREE.Float32BufferAttribute(padVerts, 3));
    padGeo.setIndex(padIdx);
    padGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(padGeo, new THREE.MeshLambertMaterial({ color: 0x0d3318, side: THREE.DoubleSide })));

    // Yellow HR line
    const topVerts = [];
    for (const p of pts) topVerts.push(p.x, FENCE_HEIGHT + 0.05, -p.y);
    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
    this.group.add(new THREE.Line(topGeo, new THREE.LineBasicMaterial({ color: 0xffdd00 })));

    // Distance markers
    this._addMarker(0, -FENCE_CENTER, '400');
    const d = 0.707;
    this._addMarker(-FENCE_LEFT * d, -FENCE_LEFT * d, '330');
    this._addMarker(FENCE_RIGHT * d, -FENCE_RIGHT * d, '330');
    this._addMarker(-FENCE_CENTER * 0.38, -FENCE_CENTER * 0.92, '370');
    this._addMarker(FENCE_CENTER * 0.38, -FENCE_CENTER * 0.92, '370');
  }

  _addMarker(x, z, text) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text + ' ft', 64, 32);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0.5 });
    const s = new THREE.Sprite(mat);
    s.position.set(x, FENCE_HEIGHT + 1.5, z);
    s.scale.set(5, 2.5, 1);
    this.group.add(s);
  }

  // ── Bases ──────────────────────────────────────────────────────
  _buildBases() {
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const geo = new THREE.BoxGeometry(0.38, 0.05, 0.38);
    const d = BASE_DISTANCE;

    const positions = [
      [0, 0],                                           // home
      [d / Math.SQRT2, -d / Math.SQRT2],                // 1st
      [0, -d * Math.SQRT2],                              // 2nd
      [-d / Math.SQRT2, -d / Math.SQRT2],               // 3rd
    ];
    for (const [x, z] of positions) {
      const base = new THREE.Mesh(geo, mat);
      base.position.set(x, 0.025, z);
      this.group.add(base);
    }
  }

  // ── Pitcher's mound ────────────────────────────────────────────
  _buildMound() {
    const mound = new THREE.Mesh(
      new THREE.CylinderGeometry(2.7, 3.2, 0.25, 24),
      new THREE.MeshLambertMaterial({ color: 0x9B7530 })
    );
    mound.position.set(0, 0.125, -MOUND_DISTANCE);
    mound.receiveShadow = true;
    this.group.add(mound);

    // Rubber
    const rubber = new THREE.Mesh(
      new THREE.BoxGeometry(0.61, 0.05, 0.15),
      new THREE.MeshLambertMaterial({ color: 0xffffff })
    );
    rubber.position.set(0, 0.28, -MOUND_DISTANCE);
    this.group.add(rubber);
  }

  // ── Backstop ───────────────────────────────────────────────────
  _buildBackstop() {
    const netMat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x555555 });

    // Main net
    this.group.add(this._mesh(new THREE.PlaneGeometry(18, 8), netMat, [0, 4, 7]));
    // Side nets
    this.group.add(this._mesh(new THREE.PlaneGeometry(5, 8), netMat, [-9, 4, 4.5], [0, 0.4, 0]));
    this.group.add(this._mesh(new THREE.PlaneGeometry(5, 8), netMat, [9, 4, 4.5], [0, -0.4, 0]));

    // Poles
    const pGeo = new THREE.CylinderGeometry(0.06, 0.06, 9, 8);
    for (const px of [-9, -4.5, 0, 4.5, 9]) {
      this.group.add(this._mesh(pGeo, poleMat, [px, 4.5, 7]));
    }
  }

  // ── Dugouts ────────────────────────────────────────────────────
  _buildDugouts() {
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x333340 });
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x222230 });
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x8B6914 });
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

    for (const side of [-1, 1]) {
      const x = side * 13;
      const z = 3;
      this.group.add(this._mesh(new THREE.BoxGeometry(9, 0.1, 3.5), floorMat, [x, -0.3, z]));
      this.group.add(this._mesh(new THREE.BoxGeometry(9, 2.2, 0.2), wallMat, [x, 0.8, z + 1.7]));
      this.group.add(this._mesh(new THREE.BoxGeometry(0.2, 2.2, 3.5), wallMat, [x + side * 4.5, 0.8, z]));
      this.group.add(this._mesh(new THREE.BoxGeometry(9.5, 0.15, 4), roofMat, [x, 2.0, z]));
      this.group.add(this._mesh(new THREE.BoxGeometry(7, 0.15, 0.5), benchMat, [x, 0.15, z + 0.8]));

      // Railing
      const railMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
      this.group.add(this._mesh(new THREE.BoxGeometry(9, 0.06, 0.06), railMat, [x, 1.0, z - 1.5]));
    }
  }

  // ── Grandstands — MLB multi-deck wrapping around ────────────────
  _buildStands() {
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0xc8c0b0 });
    const structMat = new THREE.MeshLambertMaterial({ color: 0x888880 });
    const seatBlue = [0x1a3a8a, 0x223fa0, 0x1a3a8a, 0x2848b0];
    const seatGreen = [0x1a6a2a, 0x228833, 0x1a6a2a, 0x2a9940];

    // === OUTFIELD GRANDSTAND (the main visual, wraps behind the fence) ===
    // Multi-deck curved seating behind the outfield wall
    const FC = FENCE_CENTER;
    const deckConfigs = [
      { rows: 10, startR: FC + 2,  rowDepth: 2.2, rowH: 1.3, baseY: 0,    colors: seatBlue },    // Lower deck
      { rows: 3,  startR: FC + 24, rowDepth: 3.0, rowH: 0.6, baseY: 13.5, colors: null, isClub: true }, // Club level
      { rows: 8,  startR: FC + 33, rowDepth: 2.2, rowH: 1.3, baseY: 15.5, colors: seatBlue },    // Upper deck
    ];

    for (const deck of deckConfigs) {
      for (let row = 0; row < deck.rows; row++) {
        const r = deck.startR + row * deck.rowDepth;
        const y = deck.baseY + row * deck.rowH;
        // Arc from left foul pole to right foul pole
        const curve = new THREE.EllipseCurve(0, 0, r, r, Math.PI * 0.78, Math.PI * 0.22, true);
        const pts = curve.getPoints(48);

        // Build curved seating tier
        const tierVerts = [], tierIdx = [];
        const innerR2 = r - deck.rowDepth * 0.9;
        const innerCurve = new THREE.EllipseCurve(0, 0, innerR2, innerR2, Math.PI * 0.78, Math.PI * 0.22, true).getPoints(48);

        for (let i = 0; i < pts.length; i++) {
          tierVerts.push(innerCurve[i].x, y, -innerCurve[i].y);
          tierVerts.push(pts[i].x, y + deck.rowH, -pts[i].y);
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
          tierIdx.push(a, c, b, b, c, d);
        }

        const tierGeo = new THREE.BufferGeometry();
        tierGeo.setAttribute('position', new THREE.Float32BufferAttribute(tierVerts, 3));
        tierGeo.setIndex(tierIdx);
        tierGeo.computeVertexNormals();

        if (deck.isClub) {
          // Club/luxury level — dark glass
          this.group.add(new THREE.Mesh(tierGeo, new THREE.MeshLambertMaterial({ color: 0x334455, side: THREE.DoubleSide })));
        } else {
          const color = deck.colors[row % deck.colors.length];
          this.group.add(new THREE.Mesh(tierGeo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })));
        }
      }
    }

    // Facade / frieze between decks (white, Yankee Stadium style)
    const friezeR = FC + 23;
    const friezeCurve = new THREE.EllipseCurve(0, 0, friezeR, friezeR, Math.PI * 0.78, Math.PI * 0.22, true).getPoints(48);
    const friezeVerts = [], friezeIdx = [];
    for (const p of friezeCurve) {
      friezeVerts.push(p.x, 13, -p.y, p.x, 16, -p.y);
    }
    for (let i = 0; i < friezeCurve.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      friezeIdx.push(a, c, b, b, c, d);
    }
    const friezeGeo = new THREE.BufferGeometry();
    friezeGeo.setAttribute('position', new THREE.Float32BufferAttribute(friezeVerts, 3));
    friezeGeo.setIndex(friezeIdx);
    friezeGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(friezeGeo, new THREE.MeshLambertMaterial({ color: 0xe8e0d0, side: THREE.DoubleSide })));

    // Top rim / crown
    const crownR = FC + 50;
    const crownY = 15.5 + 8 * 1.3;
    const crownCurve = new THREE.EllipseCurve(0, 0, crownR, crownR, Math.PI * 0.78, Math.PI * 0.22, true).getPoints(48);
    const crownVerts = [], crownIdx = [];
    for (const p of crownCurve) {
      crownVerts.push(p.x, crownY, -p.y, p.x, crownY + 2, -p.y);
    }
    for (let i = 0; i < crownCurve.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      crownIdx.push(a, c, b, b, c, d);
    }
    const crownGeo = new THREE.BufferGeometry();
    crownGeo.setAttribute('position', new THREE.Float32BufferAttribute(crownVerts, 3));
    crownGeo.setIndex(crownIdx);
    crownGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(crownGeo, concreteMat.clone()));

    // === BEHIND HOME PLATE (smaller, less important) ===
    for (let row = 0; row < 8; row++) {
      const z = 10 + row * 2.5;
      const y = row * 1.4;
      const w = 28 + row * 2;
      this.group.add(this._mesh(new THREE.BoxGeometry(w, 1.4, 2.2), structMat, [0, y + 0.7, z]));
      const sm = new THREE.MeshLambertMaterial({ color: seatBlue[row % 4] });
      this.group.add(this._mesh(new THREE.BoxGeometry(w - 0.5, 0.3, 1.8), sm, [0, y + 1.55, z]));
    }

    // === SIDE STANDS (foul lines) ===
    for (const side of [-1, 1]) {
      for (let row = 0; row < 6; row++) {
        const bx = side * (14 + row * 2.2);
        const y = row * 1.3;
        this.group.add(this._mesh(new THREE.BoxGeometry(2, 1.3, 22), structMat, [bx, y + 0.65, -6]));
        const sm = new THREE.MeshLambertMaterial({ color: seatBlue[row % 4] });
        this.group.add(this._mesh(new THREE.BoxGeometry(1.8, 0.25, 21), sm, [bx, y + 1.4, -6]));
      }
    }
  }

  // ── Scoreboard (on top of outfield upper deck) ─────────────────
  _buildScoreboard() {
    const FC = FENCE_CENTER;
    const boardR = FC + 52;
    const boardY = 15.5 + 8 * 1.3 + 3;
    const boardZ = -boardR + 5;

    // Main board
    this.group.add(this._mesh(
      new THREE.BoxGeometry(35, 12, 1.5),
      new THREE.MeshLambertMaterial({ color: 0x111118 }),
      [0, boardY, boardZ]
    ));

    // Screen content
    const c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, 512, 192);
    // Title
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 56px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HOMERUN HERO', 256, 55);
    // Subtitle
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText('WELCOME TO THE SHOW', 256, 100);
    // Decorative line
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 130);
    ctx.lineTo(432, 130);
    ctx.stroke();
    ctx.fillStyle = '#44ff44';
    ctx.font = '20px Arial';
    ctx.fillText('HOMERUN HERO STADIUM', 256, 160);

    const tex = new THREE.CanvasTexture(c);
    this.group.add(this._mesh(
      new THREE.PlaneGeometry(33, 10),
      new THREE.MeshBasicMaterial({ map: tex }),
      [0, boardY, boardZ - 0.85]
    ));

    // Side ad boards on outfield wall
    this._addWallAd(-30, 'MLB', 0x1a3a8a);
    this._addWallAd(-15, 'HERO', 0x8a1a1a);
    this._addWallAd(15, 'POWER', 0x1a6a2a);
    this._addWallAd(30, 'SLUGGER', 0x6a4a1a);
  }

  _addWallAd(angle, text, bgColor) {
    const rad = angle * Math.PI / 180;
    const r = FENCE_CENTER;
    const x = Math.sin(rad) * r;
    const z = -Math.cos(rad) * r;

    const c = document.createElement('canvas');
    c.width = 256; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#' + bgColor.toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const ad = new THREE.Mesh(new THREE.PlaneGeometry(10, 2), mat);
    ad.position.set(x, FENCE_HEIGHT - 1.2, z - 0.15);
    ad.lookAt(0, FENCE_HEIGHT - 1.2, 0);
    this.group.add(ad);
  }

  // ── Light towers ───────────────────────────────────────────────
  _buildLightTowers() {
    // Foul poles
    const foulPoleMat = new THREE.MeshLambertMaterial({ color: 0xffdd00 });
    const foulPoleGeo = new THREE.CylinderGeometry(0.08, 0.08, FENCE_HEIGHT + 12, 8);
    const d = 0.707;
    this.group.add(this._mesh(foulPoleGeo, foulPoleMat, [-FENCE_LEFT * d, (FENCE_HEIGHT + 12) / 2, -FENCE_LEFT * d]));
    this.group.add(this._mesh(foulPoleGeo, foulPoleMat, [FENCE_RIGHT * d, (FENCE_HEIGHT + 12) / 2, -FENCE_RIGHT * d]));
  }

  // Helper
  _mesh(geo, mat, pos, rot) {
    const m = new THREE.Mesh(geo, mat);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    return m;
  }
}
