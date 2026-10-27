import { PANGU_ATTACK_SECONDS, PANGU_IMPACT_PROGRESS, PANGU_RAISED_PROGRESS } from './pangu-model-motion.js';
import { GENERATED_HERO_MODELS, GENERATED_MONSTER_MODELS } from './hero-models.generated.js';
import type { KitPaletteName } from './visual-kit-palettes.js';

/**
 * Heroes drawn as real-time skinned 3D models instead of sprite sheets.
 * Every GLB carries `idle`, `walk` and `attack` clips, faces glTF +Z, has rest height 1 and its origin between the
 * feet; the actor root scales it by `height`. Attack phases are fractions of the attack clip. Presentation only:
 * damage and cadence stay on the server.
 */
export interface HeroModelSpec {
  heroId: string;
  /** Short name used in node names and `visual.hero-model.*` logs. */
  key: string;
  url: string;
  /** Visible rest body height in world units (excluding a raised weapon). */
  height: number;
  /** Longest attack clip shown at 1×; shortened to fit faster attack cadences. */
  attackSeconds: number;
  /** Wind-up peak held by `cast`, and the hit frame shown under reduced motion. */
  raisedProgress: number;
  impactProgress: number;
  /** Where the GLB came from, for the load log. */
  source: string;
  /** Kit palette of the weapon trail; only models whose GLB carries `trail_tip_i`/`trail_base_i` sockets draw one. */
  trailPalette?: KitPaletteName;
  /** Same rig and clips at ~5k triangles and a 512 texture, for crowds of hero-skinned minions and elites. */
  liteUrl?: string;
}

/**
 * Hand-tuned models first; the rest come from the studio's batch (animation2d/tools/studio/hero_phase2.py writes
 * hero-models.generated.ts; set `enabled: false` in studio/heroes_batch/phase2.json and rerun it to drop a hero back
 * to sprites).
 */
export const HERO_MODELS: Readonly<Record<string, HeroModelSpec>> = {
  ...GENERATED_HERO_MODELS,
  h01B: {
    heroId: 'h01B', key: 'pangu', url: '/assets/models/pangu.glb', height: 4.8,
    attackSeconds: PANGU_ATTACK_SECONDS, raisedProgress: PANGU_RAISED_PROGRESS, impactProgress: PANGU_IMPACT_PROGRESS,
    source: 'standing-walk-forward-2026-10-24-grip-up-blade-forward',
  },
  // Thiên Binh: studio Pixal3D model + procedural spear; attack = Thrust_Slash.fbx frames 1–40 plus a 10-frame
  // return to the guard pose (50 frames at 30 fps). Spear pulled back at 15/49, full extension at 26.5/49.
  h004: {
    heroId: 'h004', key: 'thien-binh', url: '/assets/models/thien-binh.glb', height: 4.2,
    attackSeconds: .9, raisedProgress: 15 / 49, impactProgress: 26.5 / 49,
    source: 'studio-pixal3dmv-2026-10-25-thrust-spear',
  },
};

/** Enemies with `skinHeroId` (chieftains, bosses, hero-skinned minions) borrow that hero's model. Off = their sprites. */
export const ENEMY_SKIN_MODELS = true;
/** Corrupted enemies swing violet trails. */
export const ENEMY_TRAIL_PALETTE: KitPaletteName = 'netherfire';

/**
 * Model for an enemy wearing a hero skin, scaled by its rank (same factor as its sprite). `lite` (minions, elites: the
 * crowd) takes the low-poly copy when the hero has one; chieftains and bosses keep the full model.
 */
export function enemySkinModelSpec(skinHeroId: string | undefined, rankScale: number, lite = false): HeroModelSpec | undefined {
  const spec = ENEMY_SKIN_MODELS ? heroModelSpec(skinHeroId) : undefined;
  if (!spec) return undefined;
  const useLite = lite && Boolean(spec.liteUrl);
  return { ...spec, key: useLite ? `${spec.key}-lite` : spec.key, url: useLite ? spec.liteUrl! : spec.url,
    height: spec.height * rankScale, trailPalette: spec.trailPalette ? ENEMY_TRAIL_PALETTE : undefined };
}

/**
 * HeroDefense's own monsters (m001-m004, b001) as 3D models, by `monsterId` (`heroId` holds the monster id). Made by the
 * studio from the current monster sprites (monster_batch.py + hero_phase2.py; the bat's wing rig by bat_rig.py).
 * `height` is at rank scale 1; the round-one pig keeps its own model. Off = the authored sprites.
 */
export const MONSTER_MODELS_ENABLED = true;
export const MONSTER_MODELS: Readonly<Record<string, HeroModelSpec>> = GENERATED_MONSTER_MODELS;

/** Model for an authored monster, scaled by its rank; minions and elites take the lite copy when there is one. */
export function monsterModelSpec(monsterId: string | undefined, rankScale: number, lite = false): HeroModelSpec | undefined {
  const spec = MONSTER_MODELS_ENABLED && monsterId ? MONSTER_MODELS[monsterId] : undefined;
  if (!spec) return undefined;
  const useLite = lite && Boolean(spec.liteUrl);
  return { ...spec, key: useLite ? `${spec.key}-lite` : spec.key, url: useLite ? spec.liteUrl! : spec.url,
    height: spec.height * rankScale };
}

export function heroModelSpec(heroId: string | undefined): HeroModelSpec | undefined {
  return heroId ? HERO_MODELS[heroId] : undefined;
}

/** Fit the whole clip between confirmed attacks, including 2×/4× and haste (same rule as Pangu). */
export function heroModelAttackDuration(spec: HeroModelSpec, interval: number, gameSpeed: number): number {
  const cadence = Number.isFinite(interval) && interval > 0 ? interval : .9;
  const speed = Number.isFinite(gameSpeed) && gameSpeed > 0 ? gameSpeed : 1;
  return Math.min(spec.attackSeconds, cadence * .95) / speed;
}
