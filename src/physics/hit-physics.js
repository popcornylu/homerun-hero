import * as THREE from 'three';
import {
  MAX_EXIT_VELO, MIN_EXIT_VELO,
  CONTACT_PERFECT, CONTACT_GOOD, CONTACT_WEAK, CONTACT_FOUL,
  TIMING_IDEAL_Z, TIMING_WINDOW, RPM_TO_RADS, HIT_TOLERANCE,
} from '../constants.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Evaluate a swing based on click world position vs marker world position.
 * Both positions are on the Z=0 strike zone plane (world-space meters).
 * ballWorldZ is the 3D ball's current Z for timing quality.
 */
export function evaluateSwing(clickWorld, markerWorld, ballWorldZ, pitchSpeedMs) {
  // World-space offset between click and marker on the zone face
  const offsetX = clickWorld.x - markerWorld.x;
  const offsetY = clickWorld.y - markerWorld.y;
  const contactDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

  // Apply tolerance multiplier to both position AND timing thresholds
  const tol = HIT_TOLERANCE;
  const foul = Math.min(CONTACT_FOUL * tol, 0.22); // cap at ~half zone width
  const perfect = CONTACT_PERFECT * tol;
  const good = CONTACT_GOOD * tol;
  const weak = CONTACT_WEAK * tol;

  // Timing quality — window also scales with tolerance (easier = more forgiving timing)
  const timingOffset = Math.abs(ballWorldZ - TIMING_IDEAL_Z);
  const timingWindow = TIMING_WINDOW * tol;
  const timingQuality = 1.0 - clamp(timingOffset / timingWindow, 0, 1);

  // Too far from marker = whiff (very lenient timing threshold)
  if (contactDistance >= foul || timingQuality <= 0.01) {
    return { isContact: false, isWhiff: true };
  }

  // Contact quality (0-1, 1 = perfect center)
  const contactQuality = 1.0 - clamp(contactDistance / foul, 0, 1);
  const overallQuality = contactQuality * timingQuality;

  // Classify contact
  let contactType;
  if (contactDistance < perfect) contactType = 'perfect';
  else if (contactDistance < good) contactType = 'good';
  else if (contactDistance < weak) contactType = 'weak';
  else contactType = 'glancing';

  // Exit velocity — boosted 1.5x for fun
  const pitchSpeedFactor = 0.3 + 0.7 * clamp(pitchSpeedMs / 45, 0, 1);
  const exitSpeed = lerp(MIN_EXIT_VELO, MAX_EXIT_VELO, overallQuality * pitchSpeedFactor) * 2.25;

  // Launch angle: good contact clusters around 20-30° (HR sweet spot)
  // Only extreme off-center hits produce grounders or pop-ups
  const normalizedDist = clamp(contactDistance / foul, 0, 1);
  let launchAngle;
  if (normalizedDist < 0.6) {
    // Good contact → 20-30° range (long ball territory)
    launchAngle = 25 + offsetY * 40;
  } else {
    // Poor contact → wider spread based on offset
    launchAngle = 15 + offsetY * 200;
  }
  launchAngle = clamp(launchAngle, -10, 55);

  // Spray angle from horizontal offset
  // Positive offsetX = clicked right of marker = pull to left field
  const sprayAngle = clamp(-offsetX * 150, -45, 45);

  // Spin from off-center contact
  const backspinRPM = offsetY * 2000;
  const sidespinRPM = -offsetX * 1500;
  const spinVector = new THREE.Vector3(
    backspinRPM * RPM_TO_RADS,
    sidespinRPM * RPM_TO_RADS,
    0
  );

  // Compute initial velocity vector
  const launchRad = THREE.MathUtils.degToRad(launchAngle);
  const sprayRad = THREE.MathUtils.degToRad(sprayAngle);

  const exitVelocity = new THREE.Vector3(
    exitSpeed * Math.sin(sprayRad) * Math.cos(launchRad),
    exitSpeed * Math.sin(launchRad),
    -exitSpeed * Math.cos(sprayRad) * Math.cos(launchRad) // toward outfield (-Z)
  );

  return {
    isContact: true,
    isWhiff: false,
    contactType,
    contactQuality: overallQuality,
    exitSpeed,
    launchAngle,
    sprayAngle,
    spinVector,
    exitVelocity,
    backspinRPM,
    sidespinRPM,
  };
}
