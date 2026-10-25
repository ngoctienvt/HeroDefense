/**
 * GPU warm-up: creates textures before they are first drawn, so a summon, deploy, boss entrance or
 * first skill cast does not stall on decode + upload. The lobby preloader already put the bytes in the
 * HTTP cache; this step turns the ones that will certainly be drawn soon into GPU textures.
 *
 * Scope is bounded on purpose (one stylized sheet is ~9.4 MB of VRAM):
 * - this player's whole collection (bench included) and every player's deployed heroes;
 * - the monster atlases, hero-skinned enemies and bosses of the next wave, during the break before it;
 * - the pig (wave 1) and Bàn Cổ glb models.
 */
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { archetypeById } from '../../../packages/game-core/src/enemy-archetypes.js';
import { wavePlanFor } from '../../../packages/game-core/src/wave-plan.js';
import { debug } from './debug.js';
import { isMonsterAssetId, loadMonsterMotionManifest } from './monster-motion.js';
import type { VisualMaterials } from './visual-materials.js';
import { preloadPanguModel } from './visual-pangu-model.js';
import { preloadPigModel } from './visual-pig-model.js';

/** 1536² RGBA without mipmaps; only used for the running estimate in the log. */
const SHEET_VRAM_MB = 1536 * 1536 * 4 / 1048576;
const LONG_FRAME_MS = 50;
const LONG_FRAME_LOG_GAP_MS = 2000;

export interface WarmupTargets { prepareHero(heroId: string): void }

/** Own collection (bench included: deploys are ours to make) plus everyone's deployed heroes. */
export function warmupHeroIds(state: Pick<GameState, 'units'>, selfId: string): string[] {
  return [...new Set(Object.values(state.units)
    .filter(unit => unit.owner === selfId || unit.slot >= 0).map(unit => unit.heroId))];
}

export function waveArt(wave: number): { skins: string[]; monsters: string[] } {
  const plan = wavePlanFor(wave);
  const ids = [...plan.spawns.map(group => group.archetypeId), ...(plan.bosses ?? [])];
  const skins = new Set<string>(), monsters = new Set<string>();
  for (const id of ids) {
    const archetype = archetypeById(id);
    if (archetype.skinHeroId) skins.add(archetype.skinHeroId);
    else if (archetype.monsterId && isMonsterAssetId(archetype.monsterId)) monsters.add(archetype.monsterId);
  }
  return { skins: [...skins], monsters: [...monsters] };
}

export class VisualWarmup {
  private heroes = new Set<string>();
  private monsters = new Map<string, () => void>();
  private waves = new Set<number>();
  private lastLongFrameLog = 0;
  private readonly removeFrameWatch: () => void;

  constructor(private readonly scene: Scene, private readonly palette: VisualMaterials, private readonly targets: WarmupTargets) {
    // Evidence for any hitch that remains: one line per long frame, rate limited.
    const observer = scene.onAfterRenderObservable.add(() => {
      const ms = scene.getEngine().getDeltaTime();
      const now = performance.now();
      if (ms > LONG_FRAME_MS && now - this.lastLongFrameLog > LONG_FRAME_LOG_GAP_MS) {
        this.lastLongFrameLog = now;
        debug('visual.long-frame', { ms: Math.round(ms), warmedSheets: this.heroes.size });
      }
    });
    this.removeFrameWatch = () => scene.onAfterRenderObservable.remove(observer);
  }

  /** Called from every snapshot; cheap when nothing new appears. */
  update(state: GameState, selfId: string): void {
    for (const heroId of warmupHeroIds(state, selfId)) this.hero(heroId);
    // Lobby (wave 0) and the preparation break warm the coming wave; combat keeps the current one warm.
    this.wave(state.phase === 'combat' ? state.wave : state.wave + 1);
  }

  private hero(heroId: string): void {
    if (this.heroes.has(heroId)) return;
    this.heroes.add(heroId);
    this.palette.heroMotion(heroId);
    this.targets.prepareHero(heroId);
    if (heroId === 'h01B') preloadPanguModel(this.scene);
    debug('visual.warmup.hero', { heroId, sheets: this.heroes.size, estimatedVramMb: Math.round(this.heroes.size * SHEET_VRAM_MB) });
  }

  private wave(wave: number): void {
    if (wave < 1 || this.waves.has(wave)) return;
    this.waves.add(wave);
    const art = waveArt(wave);
    for (const skin of art.skins) this.hero(skin);
    for (const monsterId of art.monsters) this.monster(monsterId);
    if (wave === 1) preloadPigModel(this.scene);
    debug('visual.warmup.wave', { wave, skins: art.skins.length, monsters: art.monsters.length });
  }

  private monster(monsterId: string): void {
    if (this.monsters.has(monsterId)) return;
    this.monsters.set(monsterId, () => undefined);
    void loadMonsterMotionManifest(monsterId).then(manifest => {
      if (!manifest || this.scene.isDisposed) return;
      // Retained for the session: five monster atlases are small next to hero sheets.
      this.monsters.set(monsterId, this.palette.retainMonsterMotionPages(monsterId, manifest.pages.length));
    }).catch(error => debug('visual.warmup.monster-failed', { monsterId, error: String(error) }));
  }

  dispose(): void {
    this.removeFrameWatch();
    for (const release of this.monsters.values()) release();
    this.monsters.clear();
  }
}
