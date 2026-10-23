import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import { debug } from './debug.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import type { VisualPangu } from './visual-pangu.js';
import { PanguCleaver } from './visual-pangu-cleaver.js';
import { PanguReplay } from './visual-pangu-replay.js';
import { PanguRift, type PanguRiftGround } from './visual-pangu-rift.js';

/** Painted planes live at once: charges + axe shadows/strikes + craters (≤ 4 each), 8 rifts × 2, 40 cracks. */
const PAINTED_CAPACITY = 80;

/**
 * Bàn Cổ (h01B) on the shared kit. Ultimate Khai Thiên Nhất Phủ (Codex art): windup chaos qi + falling great-axe
 * shadow on the locked point, strike + split rock banks + crater + R8.5 rim, cataclysm cracks under every zone-0
 * enemy the server hit, and the 14×4.5 fissure from the caster for the rift's server lifetime.
 * Normal sweep and third-strike rift (`trait-h01B`, `nth-h01B`) keep the accepted legacy painter, which also
 * still owns the game-wide stun icon and the camera shake.
 */
export class VisualPanguUltimate implements HeroVfx {
  readonly heroId = P.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private cleaver: PanguCleaver;
  private rift: PanguRift;
  private preview: PanguReplay;

  constructor(scene: Scene, private legacy: VisualPangu) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'pangu');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.cleaver = new PanguCleaver(this.art, this.bank, seconds => legacy.kick(seconds));
    this.rift = new PanguRift(this.art, this.bank);
    this.preview = new PanguReplay(this);
  }

  prepare(): void { this.cleaver.prepare(); this.rift.prepare(); }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== 'skill-h01B') return false;
    this.prepare();
    // The cast carries the locked point (the strike can't follow a target that walks away).
    const point = event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : at.clone();
    const windup = event.windup ?? P.windup;
    this.cleaver.cast(event.source ?? 'h01B', at, point, windup, reduced);
    debug('visual.pangu.windup', { eventId: event.id, windup, reduced,
      lockedDistance: +Math.hypot(point.x - at.x, point.z - at.z).toFixed(2) });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    const skillId = event.skillId ?? '';
    if (skillId === 'skill-h01B') {
      if (event.kind !== 'ability') return false;
      this.prepare();
      this.cleaver.impact(event.source ?? 'h01B', at, reduced);
      debug('visual.pangu.impact', { eventId: event.id, radius: P.blastRadius, targets: event.targets?.length ?? 0,
        direction: Boolean(event.direction), reduced });
      return true;
    }
    if (skillId === 'cataclysm-h01B') {
      this.prepare();
      this.rift.quake(extra?.targets ?? [], reduced);
      return true;
    }
    if (!skillId.endsWith('-h01B')) return false;
    this.legacy.show(event, at, origin, reduced);
    return true;
  }

  /** Every frame the server keeps a `pangu-rift` ground in the viewed zone. */
  markRift(ground: PanguRiftGround, reduced: boolean): void {
    if (!Number.isFinite(ground.remaining) || ground.remaining <= 0) return;
    this.prepare();
    this.rift.mark(ground, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    this.legacy.tick(dt);
    this.cleaver.tick(dt);
    this.rift.tick(dt);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.cleaver.clear(); this.rift.clear();
    this.bank.clear(); this.art.clear(); this.legacy.clear();
  }

  /** `?debug=1` replay: 'ultimate' (default) or 'rift'; `point` = locked target. */
  replay(kind: string, caster: Vector3, point: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, point, reduced);
  }
}
