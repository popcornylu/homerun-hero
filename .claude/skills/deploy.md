---
name: deploy
description: Build, version bump, commit, push, and deploy to GitHub Pages
user_invocable: true
---

# Deploy to GitHub Pages

Follow these steps exactly:

1. **Bump version**: Read the current version from `index.html` (the `#version` div content, e.g. `v1.0.0`). Advance the **minor** version number (e.g. `v1.0.0` → `v1.1.0`, `v1.3.0` → `v1.4.0`). Update the version string in `index.html`.

2. **Commit**: Stage all changes and create a commit with message: `Release vX.Y.0`

3. **Push**: Push to `origin main`.

4. **Wait for deploy**: Poll `gh run list --repo popcornylu/homerun-hero --limit 1` until the latest run shows `completed` and `success`. Check every 15 seconds, up to 3 minutes.

5. **Report**: Show the new version and the live URL: `https://popcornylu.github.io/homerun-hero/`
