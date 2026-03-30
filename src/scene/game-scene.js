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
    this.scene.background = new THREE.Color(0x1a2a4a);
    this.scene.fog = new THREE.Fog(0x1a2a4a, 80, 250);

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
    // Ambient
    const ambient = new THREE.AmbientLight(0x6688bb, 0.6);
    this.scene.add(ambient);

    // Main stadium light (sun-like for night game feel)
    const main = new THREE.DirectionalLight(0xffffff, 1.2);
    main.position.set(20, 40, -10);
    main.castShadow = true;
    main.shadow.mapSize.set(1024, 1024);
    main.shadow.camera.left = -50;
    main.shadow.camera.right = 50;
    main.shadow.camera.top = 50;
    main.shadow.camera.bottom = -50;
    main.shadow.camera.far = 100;
    this.scene.add(main);

    // Fill light from behind batter
    const fill = new THREE.DirectionalLight(0xaaccff, 0.4);
    fill.position.set(-10, 20, 15);
    this.scene.add(fill);

    // Rim light for depth
    const rim = new THREE.DirectionalLight(0xffddaa, 0.3);
    rim.position.set(0, 10, -30);
    this.scene.add(rim);
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
      // Elevated follow camera
      this._camPos.lerp(
        new THREE.Vector3(bp.x * 0.3, Math.max(bp.y + 5, 8), bp.z + 15),
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
