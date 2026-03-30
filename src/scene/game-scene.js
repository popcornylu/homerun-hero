import * as THREE from 'three';

export class GameScene {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5dadec);
    this.scene.fog = new THREE.Fog(0x7ec8e3, 120, 350);

    // TV broadcast camera - behind home plate, elevated, telephoto
    this.camera = new THREE.PerspectiveCamera(
      35,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    // Pull camera back and down to show full batter body including legs
    this.defaultCamPos = new THREE.Vector3(0, 1.8, 5.5);
    this.defaultCamTarget = new THREE.Vector3(0, 0.8, -18.44);
    this.camera.position.copy(this.defaultCamPos);
    this.camera.lookAt(this.defaultCamTarget);

    this._camTarget = this.defaultCamTarget.clone();
    this._camPos = this.defaultCamPos.clone();
    this._trackingBall = false;

    this._setupLights();

    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('orientationchange', () => setTimeout(() => this._onResize(), 100));
  }

  _setupLights() {
    // Bright daytime ambient (blue sky bounce)
    const ambient = new THREE.AmbientLight(0x8ebbdd, 0.8);
    this.scene.add(ambient);

    // Sun — high and warm
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.camera.far = 150;
    this.scene.add(sun);

    // Fill (blue sky light from above)
    const fill = new THREE.DirectionalLight(0xaaddff, 0.5);
    fill.position.set(-20, 40, -10);
    this.scene.add(fill);

    // Hemisphere light (sky/ground)
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7a3a, 0.4);
    this.scene.add(hemi);
  }

  startTrackingBall(ballMesh) {
    this._trackingBall = true;
    this._trackedBall = ballMesh;
  }

  stopTrackingBall() {
    this._trackingBall = false;
    this._trackedBall = null;
  }

  resetCamera() {
    this._camPos.copy(this.defaultCamPos);
    this._camTarget.copy(this.defaultCamTarget);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camTarget);
  }

  updateCamera(dt) {
    if (this._trackingBall && this._trackedBall) {
      const bp = this._trackedBall.position;
      // Camera stays near home plate, just looks at the ball
      // Don't chase past infield (~40m from home)
      const camZ = Math.max(bp.z + 15, -25);
      this._camPos.lerp(
        new THREE.Vector3(bp.x * 0.15, Math.max(bp.y * 0.3 + 4, 5), camZ),
        dt * 2.0
      );
      this._camTarget.lerp(bp, dt * 4.0);
    } else {
      // Fast return to default - use higher lerp factor
      this._camPos.lerp(this.defaultCamPos, Math.min(dt * 6.0, 1));
      this._camTarget.lerp(this.defaultCamTarget, Math.min(dt * 6.0, 1));
    }

    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camTarget);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
