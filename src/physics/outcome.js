import { FENCE_CENTER, FENCE_LEFT, FENCE_RIGHT, FENCE_HEIGHT, M_TO_FT } from '../constants.js';

/**
 * Get the fence distance at a given angle from center field.
 * angle: 0 = center, positive = right field, negative = left field
 */
function fenceDistanceAt(angleDeg) {
  const t = Math.abs(angleDeg) / 45; // 0 at center, 1 at foul line
  // Interpolate from center distance to corner distance
  const cornerDist = angleDeg >= 0 ? FENCE_RIGHT : FENCE_LEFT;
  return FENCE_CENTER * (1 - t) + cornerDist * t;
}

export function determineOutcome(ballFlight, launchAngle, exitSpeed, contactQuality) {
  const landing = ballFlight.landingPosition;
  if (!landing) return { type: 'STRIKE', label: 'Strike' };

  const dist = ballFlight.getDistance();
  const distFt = dist * M_TO_FT;

  // Spray angle (degrees from center, negative = left field, positive = right field)
  const sprayAngle = Math.atan2(landing.x, -landing.z) * (180 / Math.PI);

  // Foul ball check
  if (Math.abs(sprayAngle) > 45) {
    return { type: 'FOUL', label: 'Foul Ball', distanceFt: distFt };
  }

  // Check if ball cleared the fence (home run)
  const fenceDist = fenceDistanceAt(sprayAngle);
  const fenceReached = dist >= fenceDist;
  // Estimate height at fence distance (was the ball still high enough?)
  const heightAtFence = ballFlight.maxHeight > FENCE_HEIGHT;

  if (fenceReached && heightAtFence && launchAngle > 10) {
    // Project total distance if ball hadn't been stopped
    const projectedDistFt = distFt; // landing already simulated beyond fence
    return {
      type: 'HOME_RUN',
      label: 'HOME RUN!',
      distanceFt: Math.round(projectedDistFt),
    };
  }

  // Ground ball (low launch angle)
  if (launchAngle < 10) {
    if (dist < 10) {
      return { type: 'OUT', label: 'Ground Out', distanceFt: Math.round(distFt) };
    }
    if (exitSpeed > 35 && contactQuality > 0.5) {
      return { type: 'SINGLE', label: 'Single!', distanceFt: Math.round(distFt) };
    }
    // Slow grounder
    const outChance = 0.7 - (exitSpeed / 50) * 0.3;
    if (Math.random() < outChance) {
      return { type: 'OUT', label: 'Ground Out', distanceFt: Math.round(distFt) };
    }
    return { type: 'SINGLE', label: 'Infield Single!', distanceFt: Math.round(distFt) };
  }

  // Pop-up / fly ball
  if (launchAngle > 45) {
    if (dist < 50) {
      return { type: 'OUT', label: 'Pop Out', distanceFt: Math.round(distFt) };
    }
    return { type: 'OUT', label: 'Fly Out', distanceFt: Math.round(distFt) };
  }

  // Fly ball / line drive outcomes based on distance
  if (dist < 50) {
    // Shallow - infield area
    if (launchAngle > 25) {
      return { type: 'OUT', label: 'Fly Out', distanceFt: Math.round(distFt) };
    }
    if (exitSpeed > 38) {
      return { type: 'SINGLE', label: 'Line Drive Single!', distanceFt: Math.round(distFt) };
    }
    return { type: 'OUT', label: 'Line Out', distanceFt: Math.round(distFt) };
  }

  if (dist < 75) {
    // Shallow outfield
    if (launchAngle > 30 && exitSpeed < 40) {
      return { type: 'OUT', label: 'Fly Out', distanceFt: Math.round(distFt) };
    }
    return { type: 'SINGLE', label: 'Single!', distanceFt: Math.round(distFt) };
  }

  if (dist < 100) {
    // Mid outfield
    if (launchAngle > 32 && exitSpeed < 42) {
      return { type: 'OUT', label: 'Fly Out', distanceFt: Math.round(distFt) };
    }
    if (exitSpeed > 42) {
      return { type: 'DOUBLE', label: 'Double!', distanceFt: Math.round(distFt) };
    }
    return { type: 'SINGLE', label: 'Single!', distanceFt: Math.round(distFt) };
  }

  if (dist < fenceDist * 0.95) {
    // Deep outfield, didn't quite clear fence
    if (exitSpeed > 44) {
      return { type: 'TRIPLE', label: 'Triple!', distanceFt: Math.round(distFt) };
    }
    return { type: 'DOUBLE', label: 'Double!', distanceFt: Math.round(distFt) };
  }

  // Off the wall
  return { type: 'DOUBLE', label: 'Off the Wall - Double!', distanceFt: Math.round(distFt) };
}
