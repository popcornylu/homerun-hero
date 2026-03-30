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

// State
let currentPitch = null;
let recentPitchTypes = [];
let swingResult = null;
let currentOutcome = null;
let pitchFlightTime = 0;     // how long the ball has been in flight
let pitchTotalFlightTime = 0; // estimated total flight duration

// UI elements
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over');
const finalStatsEl = document.getElementById('final-stats');

// --- Title screen ---
function handleTitleClick(e) {
  e.stopPropagation();
  if (gameState.current === State.TITLE) {
    startGame();
  }
}
function handleGameOverClick(e) {
  e.stopPropagation();
  if (gameState.current === State.GAME_OVER) {
    startGame();
  }
}
titleScreen.addEventListener('pointerdown', handleTitleClick);
titleScreen.addEventListener('click', handleTitleClick);
gameOverScreen.addEventListener('pointerdown', handleGameOverClick);
gameOverScreen.addEventListener('click', handleGameOverClick);

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

  const st = gameState.current;

  // --- Allow swinging anytime (except title/gameover) ---
  if (st !== State.TITLE && st !== State.GAME_OVER) {
    const swing = input.consumeSwing();

    if (swing) {
      // Always trigger swing animation
      batter.swing();

      // Show click position on pitch tracker
      const clickWorld = clickToStrikeZonePlane(swing);
      if (clickWorld) {
        pitchTracker.setClickPosition(clickWorld.x, clickWorld.y);
      }

      // Only evaluate contact if pitching and ball is active
      if (st === State.PITCHING && pitchTraj.active && pitchTraj.position.z > -5) {
        // Project ball position to screen space
        const ballScreen = pitchTraj.position.clone().project(gameScene.camera);

        const result = evaluateSwing(
          { x: swing.x, y: swing.y },
          { x: ballScreen.x, y: ballScreen.y },
          pitchTraj.position.z,
          currentPitch.speedMs
        );

        // Show ball crossing position on tracker
        pitchTracker.setCrossingPosition(pitchTraj.position.x, pitchTraj.position.y);

        if (result.isWhiff) {
          // Swinging strike
          score.addStrike();
          hud.update(score);
          hud.showStrikeFlash('Swinging Strike!');
          ballVisual.hide();
          pitchTraj.active = false;
          pitchTracker.clearBall();
          strikeZone.hideBallMarker();
          gameState.transition(State.RESULT);
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
        pitchTraj.launch(currentPitch, releasePoint);
        ballVisual.show(releasePoint);
        hud.showPitchInfo(currentPitch);
        pitchTracker.clearTrail();

        // Calculate estimated flight time for marker animation
        const dist = releasePoint.distanceTo(new THREE.Vector3(currentPitch.targetX, currentPitch.targetY, 0));
        pitchTotalFlightTime = dist / currentPitch.speedMs;
        pitchFlightTime = 0;

        // Show marker at starting position (aim point)
        strikeZone.updateBallMarker(currentPitch.targetX, currentPitch.targetY);
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
      const markerX = currentPitch.targetX + currentPitch.breakX * eased;
      const markerY = currentPitch.targetY + currentPitch.breakY * eased;

      strikeZone.updateBallMarker(markerX, markerY);

      // Also update 2D pitch tracker overlay
      pitchTracker.setBallPosition(markerX, markerY);
    }

    // Ball reached plate without swing = called strike or ball
    if (pitchTraj.reachedPlate && gameState.current === State.PITCHING) {
      // Use marker final position (target + break) for strike zone check
      const finalX = currentPitch.targetX + currentPitch.breakX;
      const finalY = currentPitch.targetY + currentPitch.breakY;
      const inZone = finalX >= -0.25 && finalX <= 0.25 && finalY >= 0.45 && finalY <= 1.1;

      // Show final marker position on tracker
      pitchTracker.setCrossingPosition(finalX, finalY);
      pitchTracker.clearBall();
      strikeZone.hideBallMarker();

      pitchTraj.active = false;
      ballVisual.hide();

      if (inZone) {
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

    if (ballFlight.landed) {
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

      gameScene.stopTrackingBall();
      gameState.transition(State.RESULT);
    }
  }

  if (st === State.RESULT) {
    if (gameState.stateTime > 2.0) {
      hud.hideResultOverlay();
      ballVisual.hide();

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
