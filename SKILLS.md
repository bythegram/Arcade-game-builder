# Game Development Skills for AI Agents

This document describes the architecture and patterns used in this arcade game to help future agents update it efficiently.

## 1. Level System (`src/theme.json`)
The game is data-driven. Most balancing and asset definitions are in `theme.json`.
- **Levels**: Array of objects defining `threshold` (score to unlock), `assets`, `ui` styles, and `balance`.
- **Balance**: Controls `gravity`, `lift`, `spawnRate`, and `scrollSpeed`.
- **Boss**: Each level can define boss stats (`hp`, `width`, `height`, `spawnThreshold`, `slowFactor`).

## 2. Sprite Management (`src/App.tsx` -> `SpriteManager`)
The `SpriteManager` class handles both procedural fallback sprites and external image assets.
- Use `spriteManager.getSprite(key)` to retrieve a canvas pattern/image.
- Sprites are updated via `loadLevelAssets(level)` when moving between levels.

## 3. Boss Logic
- **Spawning**: Triggered when `score >= level.balance.boss.spawnThreshold`.
- **State**: When a boss is active (`gameRef.current.bossActive`), the game `scrollSpeed` is multiplied by `slowFactor`.
- **HP**: Bosses have health bars and take multiple hits to defeat.

## 4. Entity System
All game objects (Player, Enemy, Projectile, Particle) extend the `Entity` interface.
- **Physics**: Calculated in the `update` loop inside `useEffect`.
- **Rendering**: Handled in the `ctx` drawing section of the loop.

## 5. Deployment
- The game is set up for **GitHub Pages** via `.github/workflows/deploy.yml`.
- Assets MUST be in `/public/images` to be correctly served in the production build.
- `vite.config.ts` uses `base: './'` for relative path compatibility.
