// Physics
export const GRAVITY = 9.81;
export const AIR_DENSITY = 1.225;
export const DRAG_COEFFICIENT = 0.3;
export const MAGNUS_COEFFICIENT = 0.000045;

// Baseball
export const BALL_RADIUS = 0.0366; // meters
export const BALL_MASS = 0.145; // kg
export const BALL_CROSS_SECTION = Math.PI * BALL_RADIUS * BALL_RADIUS;
export const BALL_VISUAL_SCALE = 3.0; // scale up for visibility

// Field dimensions (meters)
export const MOUND_DISTANCE = 18.44; // 60'6"
export const BASE_DISTANCE = 27.43; // 90'
export const FENCE_CENTER = 121.92; // ~400ft
export const FENCE_LEFT = 100.58; // ~330ft
export const FENCE_RIGHT = 100.58; // ~330ft
export const FENCE_HEIGHT = 2.44; // ~8ft
export const FOUL_ANGLE = 45; // degrees from center

// Strike zone (meters, from ground)
export const STRIKE_ZONE = {
  xMin: -0.22,
  xMax: 0.22,
  yMin: 0.50,
  yMax: 1.05,
  zMin: -0.15,
  zMax: 0.30,
};

// Hitting thresholds (screen-space distance)
export const CONTACT_PERFECT = 0.03;
export const CONTACT_GOOD = 0.08;
export const CONTACT_WEAK = 0.15;
export const CONTACT_FOUL = 0.25;

// Timing
export const TIMING_IDEAL_Z = 0.075; // sweet spot Z
export const TIMING_WINDOW = 0.3; // Z range for any contact

// Exit velocity
export const MAX_EXIT_VELO = 50.0; // m/s (~112 mph)
export const MIN_EXIT_VELO = 15.0; // m/s (~34 mph)

// Game
export const MAX_STRIKES = 10;
export const PHYSICS_DT = 1 / 120;

// Conversion
export const MS_TO_MPH = 2.23694;
export const M_TO_FT = 3.28084;
export const RPM_TO_RADS = (2 * Math.PI) / 60;
export const MPH_TO_MS = 0.44704;
