import * as THREE from 'three';
import { GameScene } from './scene/game-scene.js';
import { Stadium } from './scene/stadium.js';
import { BallVisual } from './scene/ball-visual.js';
import { Pitcher } from './scene/pitcher.js';
import { Batter } from './scene/batter.js';
import { StrikeZoneVisual } from './scene/strike-zone.js';
import { PitchTrajectory } from './physics/pitch-trajectory.js';
import { BallFlight } from './physics/ball-flight.js';
import { selectPitch } from './physics/pitch-types.js';
import { evaluateSwing } from './physics/hit-physics.js';
import { determineOutcome } from './physics/outcome.js';
import { GameLoop } from './game/game-loop.js';
import { GameState, State } from './game/game-state.js';
import { ScoreTracker } from './game/score-tracker.js';
import { InputManager } from './input/input-manager.js';
import { HUD } from './ui/hud.js';
import { PitchTracker } from './ui/pitch-tracker.js';
import { M_TO_FT, MS_TO_MPH, STRIKE_ZONE } from './constants.js';
import { createBatTuner } from './ui/bat-tuner.js';

// --- Init ---
const canvas = document.getElementById('game-canvas');
const gameScene = new GameScene(canvas);
const stadium = new Stadium(gameScene.scene);
const ballVisual = new BallVisual(gameScene.scene);
const pitcher = new Pitcher(gameScene.scene);
const batter = new Batter(gameScene.scene);
const strikeZone = new StrikeZoneVisual(gameScene.scene);
const pitchTraj = new PitchTrajectory();
const ballFlight = new BallFlight();
const gameState = new GameState();
const score = new ScoreTracker();
const input = new InputManager(canvas);
const hud = new HUD();
const pitchTracker = new PitchTracker();
// (bat tuner initialized after game loop is created)

// State
let currentPitch = null;
let recentPitchTypes = [];
let swingResult = null;
let currentOutcome = null;
let pitchFlightTime = 0;     // how long the ball has been in flight
let pitchTotalFlightTime = 0; // estimated total flight duration
let lastMarkerX = 0;         // current marker position on zone face
let lastMarkerY = 0.75;
let swungAndMissed = false;  // true after whiff, ball keeps flying

// UI elements
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over');
const finalStatsEl = document.getElementById('final-stats');

// --- Title screen ---
function startGame() {
  score.reset();
  recentPitchTypes = [];
  hud.update(score);
  titleScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  pitchTracker.show();
  gameState.transition(State.WAITING);
}

/** Convert screen click NDC to world position on the strike zone plane (Z=0) */
function clickToStrikeZonePlane(clickNDC) {
  const ndc = new THREE.Vector3(clickNDC.x, clickNDC.y, 0.5);
  ndc.unproject(gameScene.camera);
  const dir = ndc.sub(gameScene.camera.position).normalize();
  const camPos = gameScene.camera.position;
  // Intersect with Z=0 plane
  if (Math.abs(dir.z) < 0.001) return null;
  const t = -camPos.z / dir.z;
  if (t < 0) return null;
  return new THREE.Vector3(
    camPos.x + dir.x * t,
    camPos.y + dir.y * t,
    0
  );
}

// --- Physics tick ---
function physicsTick(dt) {
  gameState.tick(dt);
  pitcher.update(dt);
  batter.update(dt);
  // (click marker managed manually, no auto-fade)

  const st = gameState.current;

  // --- Handle all clicks through canvas ---
  const swing = input.consumeSwing();
  if (swing) {
    // Title / game over: any click starts the game
    if (st === State.TITLE || st === State.GAME_OVER) {
      startGame();
    } else {
      // Always trigger swing animation
      batter.swing();

      // Convert click to world position on the zone face
      const clickWorld = clickToStrikeZonePlane(swing);
      if (clickWorld) {
        // Show click position on both 2D tracker and 3D zone
        pitchTracker.setClickPosition(clickWorld.x, clickWorld.y);
        strikeZone.showClickMarker(clickWorld.x, clickWorld.y);
      }

      // Only evaluate contact if pitching, ball active, and haven't already whiffed
      if (st === State.PITCHING && pitchTraj.active && clickWorld && !swungAndMissed) {
        // Compare click world pos vs marker world pos (both on Z=0 plane)
        const result = evaluateSwing(
          { x: clickWorld.x, y: clickWorld.y },
          { x: lastMarkerX, y: lastMarkerY },
          pitchTraj.position.z,
          currentPitch.speedMs
        );

        if (result.isWhiff) {
          // Swinging strike — let ball keep flying to the plate
          swungAndMissed = true;
          score.addStrike();
          hud.update(score);
          hud.showStrikeFlash('Swinging Strike!');
          // Ball and marker keep animating until reachedPlate
        } else {
          // Contact!
          swingResult = result;
          ballFlight.launch(
            pitchTraj.position.clone(),
            result.exitVelocity,
            result.spinVector
          );
          pitchTraj.active = false;
          pitchTracker.clearBall();
          strikeZone.hideBallMarker();
          strikeZone.hideClickMarker();
          currentOutcome = null;
          gameScene.startTrackingBall(ballVisual.mesh);
          gameState.transition(State.BALL_IN_PLAY);
        }
      }
    }
  }

  if (st === State.WAITING) {
    if (gameState.stateTime > 1.0) {
      // Start next pitch
      currentPitch = selectPitch(recentPitchTypes);
      recentPitchTypes.push(currentPitch.key);
      if (recentPitchTypes.length > 5) recentPitchTypes.shift();
      score.totalPitches++;

      pitcher.startWindup(() => {
        // On release
        const releasePoint = pitcher.getReleasePoint();
        swungAndMissed = false;
        pitchTraj.launch(currentPitch, releasePoint);
        ballVisual.show(releasePoint);
        hud.showPitchInfo(currentPitch);
        pitchTracker.clearTrail();

        // Calculate estimated flight time for marker animation
        const dist = releasePoint.distanceTo(new THREE.Vector3(currentPitch.targetX, currentPitch.targetY, 0));
        pitchTotalFlightTime = dist / currentPitch.speedMs;
        pitchFlightTime = 0;

        // Init marker at starting position (aim point)
        lastMarkerX = currentPitch.targetX;
        lastMarkerY = currentPitch.targetY;
        strikeZone.updateBallMarker(lastMarkerX, lastMarkerY);
      });

      gameState.transition(State.PITCHING);
    }
  }

  if (st === State.PITCHING) {
    pitchTraj.step(dt);

    if (pitchTraj.active) {
      pitchFlightTime += dt;

      ballVisual.update(
        pitchTraj.position,
        new THREE.Vector3(currentPitch.spinAxis.x, currentPitch.spinAxis.y, currentPitch.spinAxis.z),
        currentPitch.spinRads,
        dt
      );

      // Animate marker on 3D strike zone: lerp from target to target+break
      const t = Math.min(pitchFlightTime / pitchTotalFlightTime, 1);
      // Use ease-in curve so break accelerates (like real pitches - break is late)
      const eased = t * t;
      lastMarkerX = currentPitch.targetX + currentPitch.breakX * eased;
      lastMarkerY = currentPitch.targetY + currentPitch.breakY * eased;

      strikeZone.updateBallMarker(lastMarkerX, lastMarkerY);

      // Also update 2D pitch tracker overlay
      pitchTracker.setBallPosition(lastMarkerX, lastMarkerY);
    }

    // Ball reached plate without swing = called strike or ball
    if (pitchTraj.reachedPlate && gameState.current === State.PITCHING) {
      // Use 3D ball's actual crossing position (aligned with marker endpoint)
      const finalX = pitchTraj.position.x;
      const finalY = pitchTraj.position.y;
      const inZone = finalX >= -0.25 && finalX <= 0.25 && finalY >= 0.45 && finalY <= 1.1;

      // Show crossing position on tracker and keep yellow marker visible
      pitchTracker.setCrossingPosition(finalX, finalY);
      pitchTracker.clearBall();
      strikeZone.updateBallMarker(finalX, finalY);

      pitchTraj.active = false;
      pitchTraj.reachedPlate = false;
      ballVisual.hide();

      if (swungAndMissed) {
        // Already counted as strike when they swung; just show result
        swungAndMissed = false;
      } else if (inZone) {
        score.addStrike();
        hud.update(score);
        hud.showStrikeFlash('Called Strike!');
      } else {
        hud.showStrikeFlash('Ball');
      }
      gameState.transition(State.RESULT);
    }
  }

  if (st === State.BALL_IN_PLAY) {
    ballFlight.step(dt);

    if (ballFlight.active) {
      const spinAxis = swingResult.spinVector.clone().normalize();
      const spinSpeed = swingResult.spinVector.length();
      ballVisual.update(ballFlight.position, spinAxis, spinSpeed, dt);
    }

    // Show result early at 0.5s (don't wait for landing)
    if (!currentOutcome && ballFlight.flightTime >= 0.5) {
      currentOutcome = determineOutcome(
        ballFlight,
        swingResult.launchAngle,
        swingResult.exitSpeed,
        swingResult.contactQuality
      );
      score.addResult(currentOutcome);
      hud.update(score);
      const distFt = ballFlight.getDistance() * M_TO_FT;
      hud.showResultOverlay(currentOutcome, swingResult.exitSpeed, swingResult.launchAngle, distFt);
    }

    // End ball flight at landing or 2s max
    if (ballFlight.landed) {
      gameScene.stopTrackingBall();
      if (!currentOutcome) {
        // Landed before 0.5s (very short hit)
        currentOutcome = determineOutcome(
          ballFlight,
          swingResult.launchAngle,
          swingResult.exitSpeed,
          swingResult.contactQuality
        );
        score.addResult(currentOutcome);
        hud.update(score);
        const distFt = ballFlight.getDistance() * M_TO_FT;
        hud.showResultOverlay(currentOutcome, swingResult.exitSpeed, swingResult.launchAngle, distFt);
      }
      gameState.transition(State.RESULT);
    }
  }

  if (st === State.RESULT) {
    if (gameState.stateTime > 1.5) {
      hud.hideResultOverlay();
      ballVisual.hide();
      strikeZone.hideBallMarker();
      strikeZone.hideClickMarker();

      if (score.isGameOver()) {
        pitchTracker.hide();
        showGameOver();
        gameState.transition(State.GAME_OVER);
      } else {
        gameScene.resetCamera();
        gameState.transition(State.WAITING);
      }
    }
  }
}

// --- Render ---
function renderFrame(dt) {
  gameScene.updateCamera(dt);
  ballVisual.updateTrail(dt);
  pitchTracker.update(dt);
  gameScene.render();
}

function showGameOver() {
  finalStatsEl.innerHTML = [
    `Hits: ${score.hits}`,
    `Home Runs: ${score.homeRuns}`,
    `Singles: ${score.singles} | Doubles: ${score.doubles} | Triples: ${score.triples}`,
    `Outs: ${score.outs}`,
    `Best Distance: ${Math.round(score.bestDistance)} ft`,
    `Pitches Seen: ${score.totalPitches}`,
  ].join('<br>');
  gameOverScreen.classList.remove('hidden');
}

// --- Start ---
const loop = new GameLoop(physicsTick, renderFrame);
loop.start();
createBatTuner(batter, loop, gameScene);
