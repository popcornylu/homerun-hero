import { MPH_TO_MS, RPM_TO_RADS } from '../constants.js';

// Break vectors from batter's POV (camera behind plate):
// +dx = RIGHT (inside to RHB), -dx = LEFT (outside)
// +dy = UP, -dy = DOWN
const PITCH_DEFS = {
  fourSeamFastball: {
    name: 'Four-Seam Fastball',
    speed: [48, 55],
    spinRate: [2200, 2500],
    spinAxis: { x: 1, y: 0, z: 0 },
    break: { dx: 0, dy: 0.06 },       // slight upward hop
    weight: 25,
  },
  twoSeamFastball: {
    name: 'Two-Seam Fastball',
    speed: [47, 54],
    spinRate: [2000, 2300],
    spinAxis: { x: 0.8, y: 0.3, z: 0 },
    break: { dx: -0.06, dy: 0.02 },   // slight LEFT (outside) fade
    weight: 20,
  },
  cutter: {
    name: 'Cutter',
    speed: [46, 52],
    spinRate: [2000, 2400],
    spinAxis: { x: 0.7, y: 0.5, z: 0 },
    break: { dx: 0.10, dy: 0.02 },    // cuts RIGHT (inside)
    weight: 7,
  },
  slider: {
    name: 'Slider',
    speed: [42, 50],
    spinRate: [2200, 2600],
    spinAxis: { x: -0.5, y: -0.7, z: 0 },
    break: { dx: 0.15, dy: -0.05 },   // RIGHT (inside) + slight drop
    weight: 20,
  },
  curveball: {
    name: 'Curveball',
    speed: [38, 46],
    spinRate: [2400, 2900],
    spinAxis: { x: -1, y: 0, z: 0 },
    break: { dx: 0.12, dy: -0.22 },   // RIGHT (inside) + big drop
    weight: 15,
  },
  changeup: {
    name: 'Changeup',
    speed: [40, 48],
    spinRate: [1400, 1800],
    spinAxis: { x: 0.8, y: -0.3, z: 0 },
    break: { dx: -0.04, dy: -0.10 },  // slight LEFT + drop
    weight: 10,
  },
  splitter: {
    name: 'Splitter',
    speed: [42, 50],
    spinRate: [1200, 1600],
    spinAxis: { x: 0, y: 0.7, z: 0 },
    break: { dx: 0, dy: -0.15 },      // straight DOWN
    weight: 15,
  },
  sinker: {
    name: 'Sinker',
    speed: [44, 50],
    spinRate: [1800, 2200],
    spinAxis: { x: 0.5, y: -0.5, z: 0 },
    break: { dx: -0.10, dy: -0.12 },  // LEFT (outside) + down
    weight: 12,
  },
  knuckleball: {
    name: 'Knuckleball',
    speed: [35, 42],
    spinRate: [100, 300],
    spinAxis: { x: 0, y: 0, z: 1 },
    break: { dx: 0, dy: 0 },          // overridden per-pitch with 3 segments
    weight: 15,
    isKnuckleball: true,
  },
};

// Difficulty presets
const DIFFICULTIES = {
  easy: {
    label: 'EASY',
    breakMul: 0.4,
    pitches: ['fourSeamFastball', 'slider', 'splitter'],
    speeds: {
      fourSeamFastball: [48, 53], slider: [45, 50], splitter: [45, 49],
    },
  },
  normal: {
    label: 'NORMAL',
    breakMul: 1.0,
    pitches: ['fourSeamFastball', 'twoSeamFastball', 'cutter', 'slider', 'curveball', 'changeup', 'splitter', 'sinker'],
    speeds: {
      fourSeamFastball: [68, 75], twoSeamFastball: [66, 73], cutter: [65, 72],
      slider: [58, 65], curveball: [52, 58], changeup: [55, 60],
      splitter: [58, 63], sinker: [60, 67],
    },
  },
  hard: {
    label: 'HARD',
    breakMul: 1.5,
    pitches: ['fourSeamFastball', 'twoSeamFastball', 'cutter', 'slider', 'curveball', 'changeup', 'splitter', 'sinker'],
    speeds: {
      fourSeamFastball: [95, 101], twoSeamFastball: [92, 98], cutter: [88, 95],
      slider: [78, 85], curveball: [62, 68], changeup: [60, 66],
      splitter: [80, 86], sinker: [88, 94], knuckleball: [55, 62],
    },
  },
};

let currentDifficulty = 'easy';
let knuckleballerMode = false;

export function setDifficulty(key) {
  currentDifficulty = key;
}

export function getDifficulty() {
  return currentDifficulty;
}

export function getDifficultyLabel() {
  return DIFFICULTIES[currentDifficulty].label;
}

/** Roll for knuckleballer at game start. Returns true if knuckleballer. */
export function rollKnuckleballer() {
  if (currentDifficulty === 'hard') {
    knuckleballerMode = Math.random() < 1 / 3;
  } else {
    knuckleballerMode = false;
  }
  return knuckleballerMode;
}

export function isKnuckleballer() {
  return knuckleballerMode;
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function normalizeAxis(a) {
  const len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
  return { x: a.x / len, y: a.y / len, z: a.z / len };
}

export function selectPitch(recentTypes = []) {
  // Knuckleballer: 80% knuckleball, 20% four-seam
  if (knuckleballerMode) {
    return generatePitch(Math.random() < 0.8 ? 'knuckleball' : 'fourSeamFastball');
  }

  const diff = DIFFICULTIES[currentDifficulty];
  let pool = diff.pitches.map(k => ({ key: k, ...PITCH_DEFS[k] }));

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
  return generatePitch(diff.pitches[0]);
}

function generatePitch(key) {
  const def = PITCH_DEFS[key];
  const diff = DIFFICULTIES[currentDifficulty];

  const spdRange = diff.speeds[key] || def.speed;
  const speedMph = rand(spdRange[0], spdRange[1]);
  const speedMs = speedMph * MPH_TO_MS;
  const spinRpm = rand(def.spinRate[0], def.spinRate[1]);
  const spinRads = spinRpm * RPM_TO_RADS;
  const axis = normalizeAxis(def.spinAxis);

  // 100% strikes: aim inside the zone
  const targetX = rand(-0.15, 0.15);
  const targetY = rand(0.60, 0.95);

  const pitch = {
    key,
    name: def.name,
    speedMph,
    speedMs,
    spinRpm,
    spinRads,
    spinAxis: axis,
    targetX,
    targetY,
  };

  if (def.isKnuckleball) {
    // Knuckleball: 3 random break segments (zig-zag)
    pitch.breakSegments = [
      { dx: rand(-0.08, 0.08) * diff.breakMul, dy: rand(-0.08, 0.08) * diff.breakMul },
      { dx: rand(-0.08, 0.08) * diff.breakMul, dy: rand(-0.08, 0.08) * diff.breakMul },
      { dx: rand(-0.08, 0.08) * diff.breakMul, dy: rand(-0.08, 0.08) * diff.breakMul },
    ];
    // Total break = sum of segments (used for final position)
    pitch.breakX = pitch.breakSegments.reduce((s, seg) => s + seg.dx, 0);
    pitch.breakY = pitch.breakSegments.reduce((s, seg) => s + seg.dy, 0);
  } else {
    const breakDx = (def.break.dx + rand(-0.02, 0.02)) * diff.breakMul;
    const breakDy = (def.break.dy + rand(-0.02, 0.02)) * diff.breakMul;
    pitch.breakX = breakDx;
    pitch.breakY = breakDy;
  }

  return pitch;
}
