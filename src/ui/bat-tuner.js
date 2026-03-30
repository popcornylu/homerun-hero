/**
 * Debug panel for tuning bat position/rotation in real-time.
 * Toggle with the button in the upper-right corner.
 * Opens tuner mode: pauses game, enables orbit camera + sliders.
 */
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { HIT_TOLERANCE, setHitTolerance } from '../constants.js';

export function createBatTuner(batter, gameLoop, gameScene) {
  const panel = document.createElement('div');
  panel.id = 'bat-tuner';
  panel.innerHTML = `
    <style>
      #bat-tuner-toggle {
        position: fixed; top: 50px; right: 20px; z-index: 200;
        background: #333; color: #fff; border: 1px solid #888;
        padding: 6px 14px; cursor: pointer; font-size: 13px; border-radius: 4px;
        pointer-events: auto;
      }
      #bat-tuner-toggle.active { background: #c44; border-color: #f66; }
      #bat-tuner-panel {
        position: fixed; top: 90px; right: 20px; z-index: 200;
        background: rgba(0,0,0,0.92); color: #fff; padding: 12px;
        border-radius: 6px; font-size: 12px; width: 280px;
        max-height: 80vh; overflow-y: auto; display: none;
        pointer-events: auto;
      }
      #bat-tuner-panel label { display: flex; justify-content: space-between; margin: 3px 0; align-items: center; }
      #bat-tuner-panel input[type=range] { width: 120px; }
      #bat-tuner-panel .section { color: #ffcc00; font-weight: bold; margin-top: 10px; margin-bottom: 4px; }
      #bat-tuner-panel .val { width: 45px; text-align: right; font-family: monospace; font-size: 11px; }
      #bat-tuner-panel button { margin-top: 6px; margin-right: 4px; padding: 4px 10px; cursor: pointer; }
      #bat-tuner-panel .hint { color: #aaa; font-size: 10px; margin-top: 8px; }
    </style>
    <button id="bat-tuner-toggle">🔧 Bat</button>
    <div id="bat-tuner-panel"></div>
  `;
  document.body.appendChild(panel);

  const toggleBtn = document.getElementById('bat-tuner-toggle');
  const panelEl = document.getElementById('bat-tuner-panel');
  let open = false;
  let renderRAF = null;
  let orbitControls = null;

  // Prevent panel interactions from reaching the game canvas
  panelEl.addEventListener('pointerdown', (e) => e.stopPropagation());
  panelEl.addEventListener('click', (e) => e.stopPropagation());
  toggleBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

  let paused = false;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    open = !open;
    panelEl.style.display = open ? 'block' : 'none';
    toggleBtn.classList.toggle('active', open);
  });

  function setPaused(p) {
    paused = p;
    const btn = document.getElementById('bt_pause');
    if (btn) btn.textContent = paused ? '▶ Continue' : '⏸ Pause';
    if (paused) {
      gameLoop.stop();
      enableOrbitControls();
      startRenderLoop();
    } else {
      disableOrbitControls();
      stopRenderLoop();
      gameScene.camera.position.copy(gameScene.defaultCamPos);
      gameScene.camera.lookAt(gameScene.defaultCamTarget);
      gameLoop.start();
    }
  }

  function enableOrbitControls() {
    const cam = gameScene.camera;
    orbitControls = new OrbitControls(cam, gameScene.renderer.domElement);
    // Focus on the batter area
    orbitControls.target.set(
      batter.group.position.x,
      1.0,
      batter.group.position.z
    );
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.1;
    orbitControls.update();
  }

  function disableOrbitControls() {
    if (orbitControls) {
      orbitControls.dispose();
      orbitControls = null;
    }
  }

  function startRenderLoop() {
    function frame() {
      if (orbitControls) orbitControls.update();
      gameScene.render();
      renderRAF = requestAnimationFrame(frame);
    }
    renderRAF = requestAnimationFrame(frame);
  }
  function stopRenderLoop() {
    if (renderRAF) cancelAnimationFrame(renderRAF);
    renderRAF = null;
  }

  // --- Objects to tune ---
  const bat = batter._bat;
  const pivot = batter._batPivot;
  const group = batter.group;

  const sliders = [
    { section: 'Batter Group' },
    { label: 'group.pos.x', obj: group.position, prop: 'x', min: -1, max: 2, step: 0.05 },
    { label: 'group.pos.y', obj: group.position, prop: 'y', min: -1, max: 1, step: 0.05 },
    { label: 'group.pos.z', obj: group.position, prop: 'z', min: -1, max: 2, step: 0.05 },
    { label: 'group.rot.y', obj: group.rotation, prop: 'y', min: -1.5, max: 1.5, step: 0.05 },
    { section: 'Bat Pivot' },
    { label: 'pivot.pos.x', obj: pivot.position, prop: 'x', min: -0.5, max: 0.5, step: 0.02 },
    { label: 'pivot.pos.y', obj: pivot.position, prop: 'y', min: 0.5, max: 2.0, step: 0.02 },
    { label: 'pivot.pos.z', obj: pivot.position, prop: 'z', min: -0.5, max: 0.5, step: 0.02 },
    { label: 'pivot.rot.y', obj: pivot.rotation, prop: 'y', min: -1.5, max: 2.5, step: 0.05 },
    { section: 'Bat (relative to pivot)' },
    { label: 'bat.pos.x', obj: bat.position, prop: 'x', min: -0.8, max: 0.8, step: 0.02 },
    { label: 'bat.pos.y', obj: bat.position, prop: 'y', min: -0.5, max: 1.0, step: 0.02 },
    { label: 'bat.pos.z', obj: bat.position, prop: 'z', min: -0.5, max: 0.5, step: 0.02 },
    { label: 'bat.rot.x', obj: bat.rotation, prop: 'x', min: -3.14, max: 3.14, step: 0.05 },
    { label: 'bat.rot.y', obj: bat.rotation, prop: 'y', min: -3.14, max: 3.14, step: 0.05 },
    { label: 'bat.rot.z', obj: bat.rotation, prop: 'z', min: -3.14, max: 3.14, step: 0.05 },
  ];

  let html = '';
  const ids = [];
  sliders.forEach((s, i) => {
    if (s.section) {
      html += `<div class="section">${s.section}</div>`;
      return;
    }
    const id = `bt_${i}`;
    ids.push({ id, ...s });
    const val = s.obj[s.prop].toFixed(2);
    html += `<label>${s.label} <input type="range" id="${id}" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}"><span class="val" id="${id}_v">${val}</span></label>`;
  });
  html += `<div class="section">Difficulty</div>`;
  html += `<label>Hit Tolerance <input type="range" id="bt_tolerance" min="0.3" max="5.0" step="0.1" value="${HIT_TOLERANCE.toFixed(1)}"><span class="val" id="bt_tolerance_v">${HIT_TOLERANCE.toFixed(1)}</span></label>`;
  html += `<div style="color:#aaa;font-size:10px;margin-bottom:4px">1.0=default, 2.0=2x easier, 0.5=harder</div>`;
  html += `<div style="margin-top:8px">
    <button id="bt_pause">⏸ Pause</button>
    <button id="bt_swing">Swing</button>
    <button id="bt_dump">Dump Values</button>
  </div>`;
  html += `<div class="hint">
    Pause to enable orbit camera:<br>
    🖱 Drag=rotate, Right=pan, Scroll=zoom<br>
    Camera resets on Continue.
  </div>`;
  panelEl.innerHTML += html;

  // Wire up sliders
  ids.forEach(({ id, obj, prop }) => {
    const input = document.getElementById(id);
    const valEl = document.getElementById(id + '_v');
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      obj[prop] = v;
      valEl.textContent = v.toFixed(2);
      // Update orbit target when batter moves
      if (orbitControls && obj === group.position) {
        orbitControls.target.set(group.position.x, 1.0, group.position.z);
      }
    });
  });

  // Hit tolerance slider
  const tolInput = document.getElementById('bt_tolerance');
  const tolVal = document.getElementById('bt_tolerance_v');
  tolInput.addEventListener('input', () => {
    const v = parseFloat(tolInput.value);
    setHitTolerance(v);
    tolVal.textContent = v.toFixed(1);
  });

  // Pause/Continue button
  document.getElementById('bt_pause').addEventListener('click', (e) => {
    e.stopPropagation();
    setPaused(!paused);
  });

  // Swing button
  document.getElementById('bt_swing').addEventListener('click', (e) => {
    e.stopPropagation();
    batter.swing();
    let elapsed = 0;
    const dt = 1 / 60;
    function animateSwing() {
      batter.update(dt);
      if (orbitControls) orbitControls.update();
      gameScene.render();
      elapsed += dt;
      if (elapsed < 0.6) requestAnimationFrame(animateSwing);
    }
    animateSwing();
  });

  // Dump button
  document.getElementById('bt_dump').addEventListener('click', (e) => {
    e.stopPropagation();
    dumpValues();
  });

  function dumpValues() {
    const out = {
      'group.position': { x: +group.position.x.toFixed(3), y: +group.position.y.toFixed(3), z: +group.position.z.toFixed(3) },
      'group.rotation.y': +group.rotation.y.toFixed(3),
      'pivot.position': { x: +pivot.position.x.toFixed(3), y: +pivot.position.y.toFixed(3), z: +pivot.position.z.toFixed(3) },
      'pivot.rotation.y': +pivot.rotation.y.toFixed(3),
      'bat.position': { x: +bat.position.x.toFixed(3), y: +bat.position.y.toFixed(3), z: +bat.position.z.toFixed(3) },
      'bat.rotation': { x: +bat.rotation.x.toFixed(3), y: +bat.rotation.y.toFixed(3), z: +bat.rotation.z.toFixed(3) },
    };
    console.log('[BAT TUNER] Current values:', JSON.stringify(out, null, 2));
    return out;
  }

  window._batTunerDump = dumpValues;
}
