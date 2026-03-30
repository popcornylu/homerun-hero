import { MPH_TO_MS, RPM_TO_RADS } from '../constants.js';

// Each pitch type has a 2D "break" vector (dx, dy) on the strike zone plane.
// The marker starts at the aim point and shifts by this amount during flight.
// Units are meters on the strike zone face.
const PITCH_DEFS = {
  fourSeamFastball: {
    name: 'Four-Seam Fastball',
    speed: [65, 72],
    spinRate: [2200, 2500],
    spinAxis: { x: 1, y: 0, z: 0 },
    break: { dx: 0, dy: 0.06 },   // slight upward hop
    weight: 30,
  },
  curveball: {
    name: 'Curveball',
    speed: [52, 60],
    spinRate: [2400, 2900],
    spinAxis: { x: -1, y: 0, z: 0 },
    break: { dx: 0.03, dy: -0.18 }, // drops down, slight right
    weight: 18,
  },
  slider: {
    name: 'Slider',
    speed: [58, 65],
    spinRate: [2200, 2600],
    spinAxis: { x: -0.5, y: -0.7, z: 0 },
    break: { dx: -0.15, dy: -0.05 }, // sweeps LEFT, slight drop
    weight: 20,
  },
  changeup: {
    name: 'Changeup',
    speed: [55, 62],
    spinRate: [1400, 1800],
    spinAxis: { x: 0.8, y: -0.3, z: 0 },
    break: { dx: -0.04, dy: -0.10 }, // drops, slight left fade
    weight: 10,
  },
  splitter: {
    name: 'Splitter',
    speed: [58, 64],
    spinRate: [1200, 1600],
    spinAxis: { x: -0.3, y: 0.7, z: 0 },
    break: { dx: 0.10, dy: -0.12 }, // shifts RIGHT, drops
    weight: 15,
  },
  cutter: {
    name: 'Cutter',
    speed: [62, 68],
    spinRate: [2000, 2400],
    spinAxis: { x: 0.7, y: 0.5, z: 0 },
    break: { dx: 0.10, dy: 0.02 },  // cuts RIGHT, barely rises
    weight: 7,
  },
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeAxis(a) {
  const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export function selectPitch(recentTypes = []) {
  const types = Object.keys(PITCH_DEFS);
  let pool = types.map(k => ({ key: k, ...PITCH_DEFS[k] }));

  if (recentTypes.length >= 2) {
    const last = recentTypes[recentTypes.length - 1];
    const secondLast = recentTypes[recentTypes.length - 2];
    if (last === secondLast) {
      pool = pool.map(p => p.key === last ? { ...p, weight: p.weight * 0.1 } : p);
    }
  }

  const totalWeight = pool.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalWeight;
  for (const p of pool) {
    r -= p.weight;
    if (r <= 0) {
      return generatePitch(p.key);
    }
  }
  return generatePitch('fourSeamFastball');
}

function generatePitch(key) {
  const def = PITCH_DEFS[key];
  const speedMph = rand(def.speed[0], def.speed[1]);
  const speedMs = speedMph * MPH_TO_MS;
  const spinRpm = rand(def.spinRate[0], def.spinRate[1]);
  const spinRads = spinRpm * RPM_TO_RADS;
  const axis = normalizeAxis(def.spinAxis);

  // Add slight random variation to break
  const breakDx = def.break.dx + rand(-0.02, 0.02);
  const breakDy = def.break.dy + rand(-0.02, 0.02);

  // 100% strikes: aim inside the zone
  const targetX = rand(-0.15, 0.15);
  const targetY = rand(0.60, 0.95);

  return {
    key,
    name: def.name,
    speedMph,
    speedMs,
    spinRpm,
    spinRads,
    spinAxis: axis,
    targetX,
    targetY,
    breakX: breakDx,  // 2D break on zone plane
    breakY: breakDy,
  };
}
