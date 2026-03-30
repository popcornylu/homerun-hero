import * as THREE from 'three';
import {
  MAX_EXIT_VELO, MIN_EXIT_VELO,
  CONTACT_PERFECT, CONTACT_GOOD, CONTACT_WEAK, CONTACT_FOUL,
  TIMING_IDEAL_Z, TIMING_WINDOW, RPM_TO_RADS,
} from '../constants.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Evaluate a swing based on click position vs ball position.
 * Returns null for a whiff, or contact data for a hit.
 */
export function evaluateSwing(clickNDC, ballScreenPos, ballWorldZ, pitchSpeedMs) {
  // Screen-space offset between click and ball
  const offsetX = clickNDC.x - ballScreenPos.x;
  const offsetY = clickNDC.y - ballScreenPos.y;
  const contactDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

  // Timing quality based on ball's Z position (how close to plate)
  const timingOffset = Math.abs(ballWorldZ - TIMING_IDEAL_Z);
  const timingQuality = 1.0 - clamp(timingOffset / TIMING_WINDOW, 0, 1);

  // Too far from ball = whiff
  if (contactDistance >= CONTACT_FOUL || timingQuality <= 0.05) {
    return { isContact: false, isWhiff: true };
  }

  // Contact quality (0-1, 1 = perfect center)
  const contactQuality = 1.0 - clamp(contactDistance / CONTACT_FOUL, 0, 1);
  const overallQuality = contactQuality * timingQuality;

  // Classify contact
  let contactType;
  if (contactDistance < CONTACT_PERFECT) contactType = 'perfect';
  else if (contactDistance < CONTACT_GOOD) contactType = 'good';
  else if (contactDistance < CONTACT_WEAK) contactType = 'weak';
  else contactType = 'glancing';

  // Exit velocity
  const pitchSpeedFactor = 0.3 + 0.7 * clamp(pitchSpeedMs / 45, 0, 1);
  const exitSpeed = lerp(MIN_EXIT_VELO, MAX_EXIT_VELO, overallQuality * pitchSpeedFactor);

  // Launch angle from vertical offset
  // Positive offsetY = clicked above ball = undercut = fly ball
  // Negative offsetY = clicked below = topped = grounder
  const baseLaunchAngle = 12; // ideal line drive
  const launchAngle = clamp(baseLaunchAngle + offsetY * 400, -10, 55);

  // Spray angle from horizontal offset
  // Positive offsetX = clicked right of ball = pull to left field
  const sprayAngle = clamp(-offsetX * 300, -45, 45);

  // Spin from off-center contact
  const backspinRPM = offsetY * 4000;
  const sidespinRPM = -offsetX * 3000;
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
