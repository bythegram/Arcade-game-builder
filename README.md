<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Dragon's Twilight

Retro-inspired arcade side-scroller built with React + Vite.

You play as a dragon flying through scrolling stages, defeating witches and level bosses while managing momentum and lives.

## Gameplay Overview

- Start with 3 lives and survive as long as possible.
- Defeat normal enemies for +100 points.
- Defeat bosses for +1000 points.
- Progress through themed levels as your score increases.
- High score is saved in localStorage (`dragon-strike-highscore`).

## Controls

### Desktop

- `Space`: Shoot fire projectile
- `W`, `ArrowUp`, or `K`: Flap / gain lift
- `Space` or `Enter` on start/game over screens: Start or restart

### Mobile

- Tap/click the game canvas: Flap
- Tap the on-screen `FIRE` button: Shoot

## Level + Balance System

Game progression is data-driven through `src/theme.json`.

Each level defines:

- `threshold`: score required to unlock
- `assets`: player, enemy, background, projectile color
- `ui`: title/subtitle/HUD style
- `balance`: gravity, lift, spawn rate, scroll speed, and boss stats

Boss behavior:

- Boss spawns when score reaches `level.balance.boss.spawnThreshold`
- While boss is active, scroll speed is reduced by `slowFactor`
- Boss has HP and a rendered health bar

## Sprite + Asset Pipeline

`SpriteManager` in `src/App.tsx` handles both:

- External assets from `public/images`
- Procedural fallback sprites if an image fails to load

Important project conventions:

- Keep runtime image assets in `public/images/`
- Keep balancing/level tuning in `src/theme.json`
- If adding graphics behavior, follow the existing `SpriteManager` pattern

## Project Structure

```text
.
├── AGENTS.md                 # Agent-facing maintenance rules
├── SKILLS.md                 # Architecture and gameplay patterns
├── public/
│   └── images/
│       ├── background-img.png
│       ├── dragon-sprite.png
│       └── witch.png
├── src/
│   ├── App.tsx               # Main game loop, entities, rendering, controls
│   ├── theme.json            # Level config, assets, and balance data
│   ├── index.css             # Global styles (pixel rendering)
│   └── main.tsx              # React entrypoint
└── .github/workflows/deploy.yml
```

## Run Locally

Prerequisites: Node.js 20+

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start development server:

   ```bash
   npm run dev
   ```

3. Open:

   ```text
   http://localhost:3000
   ```

## Scripts

- `npm run dev`: Start Vite dev server on port 3000
- `npm run build`: Build production bundle into `dist/`
- `npm run preview`: Serve production build locally
- `npm run lint`: TypeScript type check (`tsc --noEmit`)
- `npm run clean`: Remove `dist/`

## Deployment

GitHub Pages deployment is configured in `.github/workflows/deploy.yml`.

On push to `main`, the workflow:

1. Installs dependencies
2. Builds the app
3. Uploads `dist/` as the Pages artifact
4. Deploys via `actions/deploy-pages`

`vite.config.ts` uses `base: './'` to support relative asset paths for Pages hosting.

## Notes on Environment Variables

This game runs client-side as currently implemented and does not call Gemini APIs from `src/`.

`.env.example` is included from the AI Studio template and can remain for compatibility, but a Gemini key is not required for the current gameplay build.
