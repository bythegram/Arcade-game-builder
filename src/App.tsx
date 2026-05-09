/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, RefreshCw, Trophy, Heart } from 'lucide-react';
import gameTheme from './theme.json';

// --- Constants & Types ---
const PROJECTILE_SPEED = 8;
const MAX_LIVES = 3;

type GameState = 'START' | 'PLAYING' | 'LEVEL_UP' | 'GAMEOVER';

interface LevelConfig {
  id: number;
  name: string;
  threshold: number;
  assets: {
    player: string;
    enemy: string;
    background: string;
    projectile: string;
  };
  ui: {
    title: string;
    subtitle: string;
    hudText: string;
  };
  balance: {
    player: { gravity: number; lift: number };
    enemy: { width: number; height: number; spawnRate: number };
    scrollSpeed: number;
    boss: {
      hp: number;
      width: number;
      height: number;
      spawnThreshold: number;
      slowFactor: number;
    };
  };
}

interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
}

interface Player extends Entity {
  velocity: number;
}

interface Enemy extends Entity {
  type: 'witch' | 'boss';
  speed: number;
  hp: number;
  maxHp: number;
}

interface Projectile extends Entity {
  speed: number;
}

interface Particle extends Entity {
  text: string;
  opacity: number;
  life: number;
}

// --- Pixel Art Sprite Manager ---
class SpriteManager {
  private sprites: { [key: string]: HTMLCanvasElement } = {};
  private dragonSheet: HTMLImageElement | null = null;
  private backgroundImg: HTMLImageElement | null = null;
  private witchImg: HTMLImageElement | null = null;
  private pixelSize = 1.5;

  constructor() {
    this.initSprites();
  }

  private resolveAssetPath(asset: string) {
    if (/^(https?:|data:)/.test(asset) || asset.startsWith('/')) {
      return asset;
    }
    if (asset.startsWith('images/')) {
      return `/${asset}`;
    }
    return `/images/${asset}`;
  }

  loadLevelAssets(level: LevelConfig) {
    // Resolve asset URLs from theme config to the public directory.
    const playerSrc = this.resolveAssetPath(level.assets.player);
    const bgSrc = this.resolveAssetPath(level.assets.background);
    const enemySrc = this.resolveAssetPath(level.assets.enemy);

    // Load Player Sprite/Spritesheet
    const img = new Image();
    img.onload = () => { this.dragonSheet = img; };
    img.onerror = (e) => {
      console.warn("Failed to load player asset:", playerSrc, e);
      this.dragonSheet = null;
    };
    img.src = playerSrc;

    // Load Background
    const bg = new Image();
    bg.onload = () => { this.backgroundImg = bg; };
    bg.onerror = (e) => {
      console.warn("Failed to load background asset:", bgSrc, e);
      this.backgroundImg = null;
    };
    bg.src = bgSrc;

    // Load Enemy
    const enemy = new Image();
    enemy.onload = () => { this.witchImg = enemy; };
    enemy.onerror = (e) => {
      console.warn("Failed to load enemy asset:", enemySrc, e);
      this.witchImg = null;
    };
    enemy.src = enemySrc;
  }

  private initSprites() {
    // Arcade Style Dragon (Procedural Fallback)
    this.createSprite('dragon', 64, 40, [
      "................................................................",
      "................................LLLLLLLL........................",
      "..............................LLGGGGGGGGLL......................",
      "............................LLGGHHHHHHHHGGLL....................",
      "...........................LGGHHHHHHHHHHHHGGLL..................",
      "..........................LGHHHHHHHHHHHHHHHHGGL.................",
      ".........................LGHHHHHHHHHHHHHHHHHHHGL................",
      ".........................LGHHHHHWWBBHHHHHHHHHHGL................",
      ".........................LGHHHHHWBBHHHHHHHHHHHGL................",
      ".........................LGHHHHHHHHHHHHHHHHHHHGL................",
      "..........................LGGHHHHHHHHHHHHHHHHGGL................",
      "...........................LLGGGGGGGGGGGGGGGGL..................",
      ".............YYYYYY.........LLGGGGGGGGGGGGGLL...................",
      "..........YYYSSSSSSYY.........LLLLLLLLLLLLL.....................",
      "........YYSSSSSSSSSSSSY.......LGGGGGGGGGGGL.....................",
      ".......YSSSSSSSSSSSSSSSY.....LGGGGGGGGGGGGL.....................",
      "......YSSSSSSSSSSSSSSSSSY...LGGGGGGGGGGGGGL.....................",
      ".....YSSSSSSSSSSSSSSSSSSSY..LGGGGGGGGGGGGGL.....................",
      "....YSSSSSSSSSSSSSSSSSSSSSYLGGGGGGGGGGGGGGL.....................",
      "...YSSSSSSSSSSSSSSSSSSSSSSYLGGGGGGGGGGGGGGL.....................",
      "..YSSSSSSSSSSSSSSSSSSSSSSSYLGGGGGGGGGGGGGGL.....................",
      "..YSSSSSSSSSSSSSSSSSSSSSSSYLGGGGGGGGGGGGGGL.....................",
      ".YSSSSSSSSSSSSSSSSSSSSSSSSSYLGGGGGGGGGGGGGL.....................",
      "YSSSSSSS YYYYYYYY SSSSSSSSSSYLGGGGGGGGGGGGL.....................",
      "YSSSSSS YYLLLLLLYY SSSSSSSS SYLGGGGGGGGGGGL.....................",
      "YSSSSSY YLGGGGGGGLY SSSSSSS SYLGGGGGGGGGGL......................",
      "YSSSSY YLGGGGGGGGLY SSSSSSS SYLGGGGGGGGGGL......................",
      "YSSS SYYLGGHHHHHGGLY S SSSSSS SYLGGGGGGGGGGL......................",
      "YSS SYYYLGGHHHHHGGLY SSSSSS SYLGGGGGGGGGGL......................",
      ".YSSYYYLLGGHHHHHGGLY SSSSS SYLGGGGGGGGGGL.......................",
      "..YYY YLLGGGGGGGGLYY SSSSS SYLGGGGGGGGGL........................",
      "......LLGGGGGGGGLLLLSSSSSYLGGGGGGGGGGL..........................",
      ".......LLGGGGGGLLLLLLLLLLYLGGGGGGGGGL...........................",
      "........LLLLLLLLGGGGGGGGGGGGGGGGGGL.............................",
      "..........LLGGGGGGGGGGGGGGGGGGGGGL..............................",
      "...........LLGGGGGGGGGGGGGGGGGGGLL..............................",
      ".............LLLLLLLLLLLLLLLLLLL................................",
      "..................LLLL....LLLL..................................",
      "..................LLLL....LLLL..................................",
      "................................................................"
    ], { 
      'L': '#064e3b', 
      'G': '#10b981', 
      'H': '#6ee7b7', 
      'B': '#000000', 
      'W': '#ffffff', 
      'Y': '#facc15', 
      'S': '#ca8a04', 
      '.': 'transparent' 
    });

    // Arcade Style Witch (40x48)
    this.createSprite('witch', 40, 48, [
      "................KKKKKKKK................",
      "...............KKKKKKKKKK...............",
      "..............KKKKKKKKKKKK..............",
      ".............KKKKKKKKKKKKKK.............",
      "............KKKKKKKKKKKKKKKK............",
      "...........KKKKKKKKKKKKKKKKKK...........",
      "..........KKKKKKKKKKKKKKKKKKKK..........",
      ".........KKKKKKKKKKKKKKKKKKKKKK.........",
      "........KKKKKKKKKKKKKKKKKKKKKKKK........",
      ".......KKKKKK KKKKKKKKKKKK KKKKKK.......",
      "......KKKKKKKKKKKKKKKKKKKKKKKKKKKK......",
      ".........KKKKKKKKKKKKKKKKKKKK...........",
      ".........GGGGGGGGGGGGGGGGGGGG...........",
      "........GGGGGGGGGGGGGGGGGGGGGG..........",
      ".......GGGGGGGGSSHHHHSSGGGGGGGG.........",
      ".......GGGGGGGGSSHHHHSSGGGGGGGG.........",
      ".......GGGGGGGGHHHHHHHHGGGGGGGG.........",
      ".......GGGGGGGGHHHHHHHHGGGGGGGG.........",
      ".......GGGGGGGGGGGGGGGGGGGGGGGG.........",
      "......GGGGGGGGGGGGGGGGGGGGGGGGGG........",
      ".....GGGGGGGGGGGGGGGGGGGGGGGGGGGG.......",
      "....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG......",
      "....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG......",
      "....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG......",
      "....BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
      "....TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDGGGGGGGGGGGGDDDDDDDD.......",
      ".....DDDDDDDDDDDDDDDDDDDDDDDDDDDD.......",
      "......DDDDDDDDDDDDDDDDDDDDDDDDDD........",
      ".......DDDDDDDDDDDDDDDDDDDDDDDD.........",
      "........................................"
    ], { 
      'K': '#1e1b4b', // Black Hat
      'G': '#4338ca', // Robe Green (Mid)
      'D': '#312e81', // Robe Dark
      'S': '#fcd34d', // Face highlight
      'H': '#fde68a', // Face light
      'B': '#78350f', // Broom Wood
      'T': '#451a03', // Broom Shadow
      '.': 'transparent' 
    });

    this.createSprite('fire', 12, 12, [
      "......W.....",
      ".....WWW....",
      "....WWYWW...",
      "...WWYYYWW..",
      "..WWYYYYYWW.",
      ".WWYYYYYYYWW",
      ".WWYYYYYYYWW",
      "..WWYYYYYWW.",
      "...WWYYYWW..",
      "....WWYWW...",
      ".....WWW....",
      "......W....."
    ], { 'W': '#ef4444', 'Y': '#fbbf24', '.': 'transparent' });
  }

  private createSprite(name: string, cols: number, rows: number, map: string[], colors: { [key: string]: string }) {
    const canvas = document.createElement('canvas');
    canvas.width = cols * this.pixelSize;
    canvas.height = rows * this.pixelSize;
    const ctx = canvas.getContext('2d')!;
    
    map.forEach((row, y) => {
      [...row].forEach((char, x) => {
        const color = colors[char];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
      });
    });
    this.sprites[name] = canvas;
  }

  getDragonFrame(frameIndex: number, destWidth: number, destHeight: number, ctx: CanvasRenderingContext2D, x: number, y: number) {
    if (this.dragonSheet) {
      // Each sprite in the sheet is roughly 1/4 width and 1/3 height of the sheet
      const frameWidth = this.dragonSheet.width / 4;
      const frameHeight = this.dragonSheet.height / 3;
      
      const row = Math.floor(frameIndex / 4);
      const col = frameIndex % 4;
      
      ctx.drawImage(
        this.dragonSheet,
        col * frameWidth, row * frameHeight, frameWidth, frameHeight,
        x, y, destWidth, destHeight
      );
    } else {
      // Fallback to procedural sprite
      const proceduralSprite = this.getSprite('dragon');
      if (proceduralSprite) {
        ctx.drawImage(proceduralSprite, x, y, destWidth, destHeight);
      }
    }
  }

  getSprite(name: string) {
    return this.sprites[name];
  }

  getBackground() {
    return this.backgroundImg;
  }

  getWitch() {
    return this.witchImg;
  }
}

const spriteManager = new SpriteManager();

// --- Main Component ---
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [levelIndex, setLevelIndex] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem('dragon-strike-highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [lives, setLives] = useState(MAX_LIVES);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const currentLevel = (gameTheme.levels[levelIndex] || gameTheme.levels[0]) as LevelConfig;
  
  // Update SpriteManager when level changes
  useEffect(() => {
    spriteManager.loadLevelAssets(currentLevel);
  }, [levelIndex, currentLevel]);
  
  // Game Refs for mutable state (no re-renders)
  const gameRef = useRef({
    player: { x: 100, y: 300, width: gameTheme.common.player.width, height: gameTheme.common.player.height, velocity: 0, id: 'player' } as Player,
    enemies: [] as Enemy[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    frameCount: 0,
    backgroundX: 0,
    shake: 0,
    fireTimer: 0,
    isFlapping: false,
    score: 0,
    lives: MAX_LIVES,
    currentLevelIndex: 0,
    bossActive: false,
    bossDefeatedInLevel: -1
  });

  // --- Game Actions ---
  const flap = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const level = (gameTheme.levels[gameRef.current.currentLevelIndex] || gameTheme.levels[0]) as LevelConfig;
    gameRef.current.player.velocity = level.balance.player.lift;
  }, [gameState]);

  const shoot = useCallback(() => {
    if (gameState !== 'PLAYING') return;
    const g = gameRef.current;
    const p = g.player;
    g.fireTimer = 15; // Set shooting frame for 15 frames
    g.projectiles.push({
      x: p.x + p.width - 20,
      y: p.y + p.height / 2 - 16,
      width: 48,
      height: 48,
      speed: PROJECTILE_SPEED,
      id: Math.random().toString(36).substr(2, 9)
    });
  }, [gameState]);

  const resetGame = useCallback(() => {
    const startLevel = gameTheme.levels[0] as LevelConfig;
    gameRef.current = {
      player: { x: 100, y: dimensions.height / 2, width: gameTheme.common.player.width, height: gameTheme.common.player.height, velocity: 0, id: 'player' },
      enemies: [],
      projectiles: [],
      particles: [],
      frameCount: 0,
      backgroundX: 0,
      shake: 0,
      isFlapping: false,
      score: 0,
      lives: MAX_LIVES,
      fireTimer: 0,
      currentLevelIndex: 0,
      bossActive: false,
      bossDefeatedInLevel: -1
    };
    setScore(0);
    setLevelIndex(0);
    setLives(MAX_LIVES);
    setGameState('PLAYING');
    spriteManager.loadLevelAssets(startLevel);
  }, [dimensions]);

  // --- Layout Handling ---
  useEffect(() => {
    const updateSize = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent) {
        setDimensions({ width: parent.clientWidth, height: parent.clientHeight });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // --- Keyboard Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow starting/restarting the game with Space or Enter
      if (gameState === 'START' || gameState === 'GAMEOVER') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          resetGame();
        }
        return;
      }

      if (gameState !== 'PLAYING') return;

      // Space to shoot as requested
      if (e.code === 'Space') {
        e.preventDefault();
        shoot();
      }
      // Use ArrowUp, W, or ArrowRight/K for flapping to give more desktop options
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyK') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, shoot, flap, resetGame]);

  // --- Game Loop ---
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const update = () => {
      const g = gameRef.current;
      const d = dimensions;
      const level = (gameTheme.levels[g.currentLevelIndex] || gameTheme.levels[0]) as LevelConfig;
      
      const speedMultiplier = g.bossActive ? level.balance.boss.slowFactor : 1.0;
      const currentScrollSpeed = level.balance.scrollSpeed * speedMultiplier;

      g.frameCount++;
      if (g.shake > 0) g.shake -= 0.5;
      if (g.fireTimer > 0) g.fireTimer--;

      // Background Scroll
      g.backgroundX = (g.backgroundX - currentScrollSpeed) % d.width;

      // Player Physics
      g.player.velocity += level.balance.player.gravity;
      g.player.y += g.player.velocity;

      // Bounds check
      if (g.player.y < 0) {
        g.player.y = 0;
        g.player.velocity = 0;
      }
      if (g.player.y + g.player.height > d.height) {
        g.lives--;
        setLives(g.lives);
        g.player.y = d.height - g.player.height;
        g.player.velocity = level.balance.player.lift;
        g.shake = 10;
        if (g.lives <= 0) {
          setGameState('GAMEOVER');
          if (g.score > highScore) {
            setHighScore(g.score);
            try {
              localStorage.setItem('dragon-strike-highscore', g.score.toString());
            } catch (e) {
              console.error("Failed to save high score", e);
            }
          }
        }
      }

      // Boss Spawning
      if (!g.bossActive && g.bossDefeatedInLevel < g.currentLevelIndex && g.score >= level.balance.boss.spawnThreshold) {
        g.bossActive = true;
        g.enemies.push({
          x: d.width,
          y: d.height / 2 - level.balance.boss.height / 2,
          width: level.balance.boss.width,
          height: level.balance.boss.height,
          speed: currentScrollSpeed * 0.5,
          type: 'boss',
          hp: level.balance.boss.hp,
          maxHp: level.balance.boss.hp,
          id: 'boss-' + g.currentLevelIndex
        });
      }

      // Enemy Spawning (only regular enemies if no boss or boss is active but we still want some challenge?)
      // Typically bosses stop regular spawns or reduce them. Let's stop them when boss is active.
      if (!g.bossActive && g.frameCount % level.balance.enemy.spawnRate === 0) {
        g.enemies.push({
          x: d.width,
          y: Math.random() * (d.height - (level.balance.enemy.height + 100)) + 50,
          width: level.balance.enemy.width,
          height: level.balance.enemy.height,
          speed: currentScrollSpeed + 2,
          type: 'witch',
          hp: 1,
          maxHp: 1,
          id: Math.random().toString(36).substr(2, 9)
        });
      }

      // Level Progression Check
      const nextLevelIndex = g.currentLevelIndex + 1;
      if (nextLevelIndex < gameTheme.levels.length) {
        const nextLevel = gameTheme.levels[nextLevelIndex] as LevelConfig;
        if (g.score >= nextLevel.threshold) {
          g.currentLevelIndex = nextLevelIndex;
          setLevelIndex(nextLevelIndex);
          // Optional: Add level up effect/sound
          g.particles.push({
            x: d.width / 2 - 50,
            y: d.height / 2,
            width: 0, height: 0,
            text: `LEVEL ${nextLevel.id} UP!`,
            opacity: 1,
            life: 120,
            id: 'level-up-' + Date.now()
          });
        }
      }

      // Updates
      g.enemies.forEach((en, i) => {
        en.x -= en.speed;
        // Collision with player (slight padding for fairness)
        if (
          g.player.x + 20 < en.x + en.width - 20 &&
          g.player.x + g.player.width - 20 > en.x + 20 &&
          g.player.y + 20 < en.y + en.height - 20 &&
          g.player.y + g.player.height - 20 > en.y + 20
        ) {
          g.enemies.splice(i, 1);
          g.lives--;
          setLives(g.lives);
          g.shake = 15;
          if (g.lives <= 0) {
            setGameState('GAMEOVER');
            if (g.score > highScore) {
              setHighScore(g.score);
              try {
                localStorage.setItem('dragon-strike-highscore', g.score.toString());
              } catch (e) {
                console.error("Failed to save high score", e);
              }
            }
          }
        }
      });
      g.enemies = g.enemies.filter(en => en.x + en.width > 0);

      g.projectiles.forEach((p, i) => {
        p.x += p.speed;
        // Collision with enemies
        g.enemies.forEach((en, ei) => {
          if (
            p.x < en.x + en.width &&
            p.x + p.width > en.x &&
            p.y < en.y + en.height &&
            p.y + p.height > en.y
          ) {
            // Hit!
            en.hp--;
            g.projectiles.splice(i, 1);
            g.shake = en.type === 'boss' ? 10 : 5;

            if (en.hp <= 0) {
              if (en.type === 'boss') {
                g.bossActive = false;
                g.bossDefeatedInLevel = g.currentLevelIndex;
                g.score += 1000;
              } else {
                g.score += 100;
              }
              
              g.enemies.splice(ei, 1);
              setScore(g.score);
              g.particles.push({
                x: en.x,
                y: en.y,
                width: 0, height: 0,
                text: en.type === 'boss' ? '+1000 BOSS CLEAR' : '+100',
                opacity: 1,
                life: 60,
                id: Math.random().toString(36).substr(2, 9)
              });
            } else {
              // Boss hit effect (flash)
              g.particles.push({
                x: p.x,
                y: p.y,
                width: 0, height: 0,
                text: 'HIT!',
                opacity: 1,
                life: 20,
                id: Math.random().toString(36).substr(2, 9)
              });
            }
          }
        });
      });
      g.projectiles = g.projectiles.filter(p => p.x < d.width);

      g.particles.forEach(p => {
        p.y -= 2;
        p.life--;
        p.opacity = p.life / 60;
      });
      g.particles = g.particles.filter(p => p.life > 0);
    };

    const draw = () => {
      const g = gameRef.current;
      const d = dimensions;
      
      ctx.save();
      if (g.shake > 0) {
        ctx.translate(Math.random() * g.shake - g.shake/2, Math.random() * g.shake - g.shake/2);
      }

      // Background
      const bg = spriteManager.getBackground();
      if (bg) {
        // Tiled scrolling background
        const scrollX = (g.backgroundX % d.width);
        ctx.drawImage(bg, scrollX, 0, d.width, d.height);
        ctx.drawImage(bg, scrollX + d.width, 0, d.width, d.height);
        ctx.drawImage(bg, scrollX - d.width, 0, d.width, d.height);
      } else {
        // Fallback Parallax 1: Sky
        const grad = ctx.createLinearGradient(0, 0, 0, d.height);
        grad.addColorStop(0, '#020617');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#701a75');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, d.width, d.height);

        // Fallback Parallax 2: Distant Stars/Clouds
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for(let i=0; i<20; i++) {
          const cx = (g.backgroundX * 0.1 + i * 200) % d.width;
          ctx.fillRect(cx, 50 + (i % 5)*60, 100, 4);
        }

        // Fallback Parallax 3: Distant Forest
        ctx.fillStyle = '#14532d';
        for(let i=0; i<3; i++) {
          const ox = (g.backgroundX * 0.4 + i * d.width/2) % (d.width * 1.5) - d.width/2;
          ctx.beginPath();
          ctx.moveTo(ox, d.height);
          ctx.lineTo(ox + 200, d.height - 300);
          ctx.lineTo(ox + 400, d.height);
          ctx.fill();
        }

        // Fallback Parallax 4: Ruins
        ctx.fillStyle = '#020617';
        const rx = (g.backgroundX * 0.8) % (d.width * 2);
        ctx.fillRect(rx, d.height - 180, 120, 180);
        ctx.fillRect(rx - 40, d.height - 100, 80, 100);
      }

      // Entities
      g.enemies.forEach(en => {
        const witchImg = spriteManager.getWitch();
        if (witchImg) {
          ctx.drawImage(witchImg, en.x, en.y, en.width, en.height);
        } else {
          ctx.drawImage(spriteManager.getSprite('witch'), en.x, en.y, en.width, en.height);
        }

        // Draw Health Bar for Boss
        if (en.type === 'boss') {
          const barWidth = en.width * 0.8;
          const barHeight = 10;
          const barX = en.x + (en.width - barWidth) / 2;
          const barY = en.y - 20;

          // Background
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          // HP
          const hpWidth = (en.hp / en.maxHp) * barWidth;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(barX, barY, hpWidth, barHeight);
          
          // Border
          ctx.strokeStyle = '#ffffff';
          ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
      });
      
      g.projectiles.forEach(p => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = currentLevel.assets.projectile;
        ctx.drawImage(spriteManager.getSprite('fire'), p.x, p.y, p.width, p.height);
        ctx.shadowBlur = 0;
      });

      // Dragon
      ctx.save();
      ctx.translate(g.player.x + g.player.width/2, g.player.y + g.player.height/2);
      ctx.rotate(g.player.velocity * 0.04);
      
      let dragonFrame = 0;
      if (gameState === 'GAMEOVER') {
        dragonFrame = 9; // Fallen frame
      } else if (g.fireTimer > 0) {
        dragonFrame = 6; // Fire breathing frame
      } else {
        // Animation loop for flying (4 frames)
        dragonFrame = Math.floor(g.frameCount / 8) % 4;
      }
      
      spriteManager.getDragonFrame(
        dragonFrame, 
        g.player.width * 1.5, // The new sprite is wider, adjust scale
        g.player.height * 1.5,
        ctx, 
        -g.player.width * 0.75, 
        -g.player.height * 0.75
      );
      ctx.restore();

      g.particles.forEach(p => {
        ctx.font = 'bold 32px "Courier New"';
        ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity})`;
        ctx.fillText(p.text, p.x, p.y);
      });

      ctx.restore();

      // Arcade CRT Filter Overlay
      ctx.fillStyle = 'rgba(18, 18, 18, 0.15)';
      for(let i=0; i<d.height; i+=4) {
        ctx.fillRect(0, i, d.width, 1);
      }
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, dimensions]);

  // --- Handlers ---
  const handleAction = (e: React.MouseEvent | React.TouchEvent) => {
    // If it's a mobile touch, we don't want it to double-trigger if we overlap the FIRE button
    // But HTML5 Canvas usually handles this via event.preventDefault if it were a full game.
    // Here we'll just simple flap
    flap();
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-mono select-none" style={{ touchAction: 'none' }}>
      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} onMouseDown={handleAction} onTouchStart={handleAction} className="block cursor-pointer image-pixelated" id="game-canvas" />

      {/* HUD: Score (Top Right) */}
      <div className="absolute top-8 right-8 pointer-events-none">
        <div className={`${gameTheme.common.hudGradient} p-6 rounded ${gameTheme.common.hudBorder} text-right flex flex-col gap-1`}>
          <div className={`${currentLevel.ui.hudText} text-4xl font-black italic tracking-tighter drop-shadow-[0_2px_0_rgba(0,0,0,1)]`}>
            {score.toLocaleString()} SCORE
          </div>
          <div className="text-white/40 text-sm font-bold uppercase tracking-widest italic">
            {currentLevel.name} • Best: {highScore.toLocaleString()}
          </div>
        </div>
      </div>

      {/* HUD: Lives (Top Left) */}
      <div className="absolute top-8 left-8 pointer-events-none">
        <div className={`${gameTheme.common.hudGradient} p-6 rounded ${gameTheme.common.hudBorder} flex gap-2`}>
          {[...Array(MAX_LIVES)].map((_, i) => (
            <Heart key={i} className={`w-8 h-8 ${i < lives ? 'text-red-500 fill-red-500 animate-pulse' : 'text-slate-800'}`} />
          ))}
        </div>
      </div>

      {/* Arcade FIRE Button */}
      {gameState === 'PLAYING' && (
        <button
          className="absolute bottom-12 right-12 w-28 h-28 bg-red-600 active:scale-90 rounded-full border-b-8 border-red-900 shadow-2xl flex flex-col items-center justify-center text-white ring-4 ring-red-500/20 transition-transform md:hidden"
          onClick={(e) => { e.stopPropagation(); shoot(); }}
          onTouchStart={(e) => { e.stopPropagation(); shoot(); }}
          id="fire-breath-button"
        >
          <Flame className="w-12 h-12" />
          <span className="text-xs font-black uppercase tracking-widest mt-1">FIRE</span>
        </button>
      )}

      {/* Overlays */}
      <AnimatePresence>
        {gameState === 'START' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white z-50 text-center px-4">
            <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 mb-4 italic tracking-tighter uppercase leading-none">{currentLevel.ui.title}</h1>
            <h2 className="text-2xl md:text-4xl font-black text-white/90 mb-12 tracking-[0.2em]">{currentLevel.ui.subtitle}</h2>
            <button className="px-12 py-6 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl rounded border-b-8 border-yellow-700 uppercase tracking-widest shadow-2xl hover:scale-105 transition-all" onClick={resetGame}>Insert Coin / Start</button>
            <div className="mt-12 text-sm text-white/40 font-bold uppercase tracking-[0.5em] animate-pulse flex flex-col items-center gap-2">
              <span>{gameTheme.common.instructions}</span>
              <span className="text-yellow-500/60 uppercase">Space to Shoot • W / Up to Jump</span>
            </div>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div initial={{ scale: 1.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-red-950/95 flex flex-col items-center justify-center text-white z-50 text-center">
            <div className="text-8xl font-black text-red-500 mb-4 italic animate-bounce">K.O.</div>
            <div className="text-2xl font-bold text-white/50 mb-12 uppercase tracking-widest">Your Legend Fades</div>
            <div className="text-5xl font-black text-yellow-400 mb-12">{score.toLocaleString()} PTS</div>
            <button className="px-12 py-6 bg-white text-black font-black text-2xl rounded border-b-8 border-gray-400 uppercase tracking-widest hover:scale-105 transition-all" onClick={resetGame}>Continue?</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
