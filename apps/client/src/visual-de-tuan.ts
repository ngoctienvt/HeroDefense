import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { DE_TUAN as D } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { prepareDeTuanArt } from './visual-de-tuan-assets.js';
import { DeTuanBlast } from './visual-de-tuan-blast.js';
import { DeTuanForm } from './visual-de-tuan-form.js';
import { DeTuanReplay } from './visual-de-tuan-replay.js';
import { DeTuanStrike } from './visual-de-tuan-strike.js';
import { DeTuanSword } from './visual-de-tuan-sword.js';
import { DeTuanUltimate } from './visual-de-tuan-ultimate.js';

/** Painted planes alive at once: ultimate (3 × 2) + sword (3) + blast (28) + wreath (4 × 2) + bursts (3) + streaks (4). */
const PAINTED_CAPACITY = 56;

/**
 * Đế Tuấn (h01I) on the kit: Đế Tuấn Thập Nhật Đồng Thăng and everything it spawns.
 * Server events: `cast skill-h01I` (0.5 s windup on the caster) → `ability skill-h01I` (main = highest-HP monster in R8.5
 * takes 520 %, the rest 200 %, caster transforms) → snapshot `berserk.remaining` (6.5 s wreath) → per transformed strike
 * `crow-burst-h01I` (R2.5 around the target) + `trait-h01I` with `isCrit`; a normal strike is `trait-h01I` alone.
 * The ten Kim Ô are one motif of ONE resolve, not ten hits, and are unrelated to the three passive aura crows.
 * Registered after the divine adapter, so this module serves every h01I skill id (the registry keeps the last registration).
 */
export class VisualDeTuan implements HeroVfx {
  readonly heroId = D.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private sword: DeTuanSword;
  private blast: DeTuanBlast;
  private ultimate: DeTuanUltimate;
  private form: DeTuanForm;
  private strike: DeTuanStrike;
  private preview = new DeTuanReplay(this);

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'detuan');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    const spray = this.bank.spray('solar');
    this.sword = new DeTuanSword(scene, this.art, spray);
    this.blast = new DeTuanBlast(scene, this.art, this.bank);
    this.ultimate = new DeTuanUltimate(scene, this.art, spray, this.sword, this.blast);
    this.form = new DeTuanForm(scene, this.art, spray);
    this.strike = new DeTuanStrike(scene, this.art, this.bank);
  }

  /** Atlases load only once a Đế Tuấn is on the field (idempotent). */
  prepare(): void { prepareDeTuanArt(this.art); }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${D.id}`) return false;
    this.prepare();
    // The cast point may be the target; the flock gathers over the caster himself.
    this.ultimate.cast(event.source ?? 'unknown', origin ?? at, event.windup ?? D.windup, reduced);
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${D.id}`:
        if (event.kind !== 'ability') return false;
        this.prepare();
        this.ultimate.impact(event.source ?? 'unknown', origin, extra?.targets ?? [], extra?.main, reduced);
        return true;
      case `crow-burst-${D.id}`:
        this.prepare();
        this.strike.crowBurst(at, reduced);
        return true;
      case `trait-${D.id}`:
        this.prepare();
        this.strike.basic(extra?.hasOrigin ? origin : undefined, at, Boolean(event.isCrit), reduced);
        debug('visual.detuan.trait', { eventId: event.id, crit: Boolean(event.isCrit), reduced });
        return true;
      default: return false;
    }
  }

  /** Snapshot marker: `berserk.remaining` of a transformed caster (called every frame while it lasts). */
  markForm(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare();
    this.form.mark(id, at, remaining, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    this.sword.tick(dt);
    this.ultimate.tick(dt, time);
    this.blast.tick(dt);
    this.form.tick(dt, time);
    this.strike.tick(dt);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear();
    this.ultimate.clear(); this.sword.clear(); this.blast.clear(); this.form.clear(); this.strike.clear();
    this.bank.clear(); this.art.clear();
  }

  /** `?debug=1` replay (`__vfxReplay('h01I', kind?)`); presentation only. */
  replay(kind: string, caster: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, reduced);
  }
}
