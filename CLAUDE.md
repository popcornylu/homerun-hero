# Homerun Hero

## Project Overview
Pawapuro-style web baseball hitting game built with Three.js. The player faces a pitcher and tries to hit home runs by clicking/tapping on the strike zone.

## Tech Stack
- **Three.js** for 3D rendering
- **Vite** for dev server and build
- **Vanilla JS** ES modules (no framework)
- Deployed to **GitHub Pages** via GitHub Actions

## Dev Commands
```bash
npm run dev    # Start dev server on port 8134
npm run build  # Production build to dist/
```

## Architecture
- Fixed-timestep game loop (120Hz physics, requestAnimationFrame render)
- State machine: TITLE -> WAITING -> PITCHING -> SWING_EVAL -> BALL_IN_PLAY -> RESULT -> GAME_OVER
- Pawapuro-style 2D break vectors on the strike zone plane (separate from 3D ball physics)

## Key Source Files
- `src/main.js` — Game integration, state transitions, input handling
- `src/physics/pitch-types.js` — Pitch definitions, difficulty presets, knuckleballer mode
- `src/physics/hit-physics.js` — Swing evaluation (world-space click vs marker)
- `src/physics/ball-flight.js` — Post-contact ball physics with stadium collision
- `src/physics/pitch-trajectory.js` — 3D pitch flight (gravity only, aimed at target+break)
- `src/physics/outcome.js` — Determine HR/hit/out from ball flight data
- `src/scene/stadium.js` — MLB-style stadium with outfield grandstands, scoreboard
- `src/scene/crowd.js` — 10,000+ spectators via InstancedMesh, celebrate on HR
- `src/scene/batter.js` — Pawapuro-style 5-step swing animation
- `src/scene/pitcher.js` — Windup animation, cap color changes for knuckleballer
- `src/scene/strike-zone.js` — 3D zone grid, ball marker, click marker, hit radius ring
- `src/constants.js` — Physics, field dimensions, difficulty (HIT_TOLERANCE)
- `src/game/score-tracker.js` — Strikes, hits, HR tracking

## Deployment
Use `/deploy` skill or manually:
1. Bump version in `index.html` (#version div)
2. Commit and push to main
3. GitHub Actions builds and deploys to Pages

## Conventions
- Break vectors: +dx = RIGHT (inside to RHB), -dx = LEFT, +dy = UP, -dy = DOWN
- All pitches are 100% strikes (target inside zone)
- Swing evaluation compares click world position vs marker world position (both on Z=0 plane)
- HIT_TOLERANCE scales both position and timing thresholds
