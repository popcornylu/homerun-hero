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
import { Crowd } from './scene/crowd.js';
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
const crowd = new Crowd(gameScene.scene);
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
let didSwing = false;        // true if batter swung during this pitch
let plateArrived = false;    // true once ball crosses plate
let plateTimer = 0;          // wait 200ms after plate before judging
let plateFinalX = 0;
let plateFinalY = 0;
let hitBallClone = null;     // independent clone for batted ball
let landedTimer = 0;         // time since ball landed

// UI elements
const titleScreen = document.getElementById('title-screen');
const gameOverScreen = document.getElementById('game-over');
const finalStatsEl = document.getElementById('final-stats');

function updateStats() {
  hud.update(score);
  stadium.updateScoreboard(score);
}

// --- Title screen ---
function startGame() {
  score.reset();
  recentPitchTypes = [];
  updateStats();
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
      if (st === State.PITCHING) didSwing = true;

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
          updateStats();
          hud.showStrikeFlash('Swinging Strike!');
          // Ball and marker keep animating until reachedPlate
        } else {
          // Contact! Spawn independent hit ball, free main ball for next pitch
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
          // Clone ball for independent flight, hide pitch ball
          if (hitBallClone) hitBallClone.dispose();
          hitBallClone = ballVisual.spawnHitBall();
          ballVisual.hide();
          gameScene.startTrackingBall(hitBallClone.mesh);
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
        didSwing = false;
        plateArrived = false;
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

    // Ball reached plate — record position, wait 200ms before judging
    if (pitchTraj.reachedPlate && !plateArrived) {
      plateFinalX = pitchTraj.position.x;
      plateFinalY = pitchTraj.position.y;
      pitchTracker.setCrossingPosition(plateFinalX, plateFinalY);
      pitchTracker.clearBall();
      strikeZone.updateBallMarker(plateFinalX, plateFinalY);
      pitchTraj.active = false;
      pitchTraj.reachedPlate = false;
      ballVisual.hide();
      plateArrived = true;
      plateTimer = 0;
    }

    // Wait 200ms after plate crossing to allow late swings
    if (plateArrived && gameState.current === State.PITCHING) {
      plateTimer += dt;
      if (plateTimer >= 0.2) {
        const inZone = plateFinalX >= -0.25 && plateFinalX <= 0.25 && plateFinalY >= 0.45 && plateFinalY <= 1.1;

        if (swungAndMissed) {
          swungAndMissed = false;
        } else if (didSwing) {
          score.addStrike();
          updateStats();
          hud.showStrikeFlash('Swinging Strike!');
        } else if (inZone) {
          score.addStrike();
          updateStats();
          hud.showStrikeFlash('Called Strike!');
        } else {
          hud.showStrikeFlash('Ball');
        }
        didSwing = false;
        plateArrived = false;
        gameState.transition(State.RESULT);
      }
    }
  }

  if (st === State.BALL_IN_PLAY) {
    ballFlight.step(dt);

    if (ballFlight.active && hitBallClone) {
      hitBallClone.update(ballFlight.position);
    }

    // Wait for ball to land, then show result with real distance
    if (ballFlight.landed && !currentOutcome) {
      currentOutcome = determineOutcome(
        ballFlight,
        swingResult.launchAngle,
        swingResult.exitSpeed,
        swingResult.contactQuality
      );
      score.addResult(currentOutcome);
      updateStats();
      const distFt = ballFlight.getDistance() * M_TO_FT;
      hud.showResultOverlay(currentOutcome, swingResult.exitSpeed, swingResult.launchAngle, distFt);
      if (currentOutcome.type === 'HOME_RUN') crowd.celebrate();
      landedTimer = 0;
    }

    // After landing, keep ball rolling for 1 second then transition
    if (ballFlight.landed) {
      landedTimer += dt;
      if (landedTimer >= 1.0) {
        gameState.transition(State.RESULT);
      }
    }
  }

  // Keep hit ball rolling during RESULT state
  if (st === State.RESULT && ballFlight.active && hitBallClone) {
    ballFlight.step(dt);
    hitBallClone.update(ballFlight.position);
  }

  if (st === State.RESULT) {
    if (gameState.stateTime > 1.0) {
      hud.hideResultOverlay();
      ballVisual.hide();
      gameScene.stopTrackingBall();
      if (hitBallClone) { hitBallClone.dispose(); hitBallClone = null; }
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
  crowd.update(dt);
  gameScene.render();
}

function showGameOver() {
  finalStatsEl.innerHTML = [
    `Home Runs: ${score.homeRuns}`,
    `Hits: ${score.hits}`,
    `Best Distance: ${Math.round(score.bestDistance)} ft`,
  ].join('<br>');

  // Save to leaderboard
  const entry = {
    hr: score.homeRuns,
    hits: score.hits,
    best: Math.round(score.bestDistance),
    date: new Date().toLocaleDateString(),
  };
  const board = JSON.parse(localStorage.getItem('homerun-hero-leaderboard') || '[]');
  board.push(entry);
  // Sort by HR desc, then hits desc, then best distance desc
  board.sort((a, b) => b.hr - a.hr || b.hits - a.hits || b.best - a.best);
  // Keep top 10
  board.length = Math.min(board.length, 10);
  localStorage.setItem('homerun-hero-leaderboard', JSON.stringify(board));

  // Find current game's rank
  const currentIdx = board.findIndex(e => e === entry);

  // Render leaderboard
  const lbEl = document.getElementById('leaderboard');
  let rows = '';
  board.forEach((e, i) => {
    const cls = i === currentIdx ? ' class="current"' : '';
    rows += `<tr${cls}><td>${i + 1}</td><td>${e.hr}</td><td>${e.hits}</td><td>${e.best} ft</td></tr>`;
  });
  lbEl.innerHTML = `
    <h2>LEADERBOARD</h2>
    <table>
      <tr><th>#</th><th>HR</th><th>HITS</th><th>BEST</th></tr>
      ${rows}
    </table>
  `;

  gameOverScreen.classList.remove('hidden');
}

// --- Start ---
const loop = new GameLoop(physicsTick, renderFrame);
loop.start();
// createBatTuner(batter, loop, gameScene); // debug UI hidden
