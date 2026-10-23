import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { NGUYEN_THUY as N } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { KitSpray } from './visual-kit-spray.js';
import { prepareNtArt } from './visual-nguyen-thuy-art.js';
import { NguyenThuyBanner } from './visual-nguyen-thuy-banner.js';
import { NguyenThuyRend, type RendPoint } from './visual-nguyen-thuy-rend.js';
import { NguyenThuyStatus } from './visual-nguyen-thuy-status.js';
import { NguyenThuyStreams } from './visual-nguyen-thuy-streams.js';
import { streamAim } from './visual-nguyen-thuy-timeline.js';

/** Banners 4 + streams 12 + rifts 24 + cracks 72 + breaks 4 + seals 24, with headroom. */
const PAINTED_CAPACITY = 200;
/** The normal attack stays with the legacy divine painter. */
export type NguyenThuyTraitPainter = (event: GameEvent, at: Vector3, reduced: boolean) => void;

/**
 * Nguyên Thủy Thiên Tôn (h014): Bàn Cổ Phướng: Phá Toái Hư Không, on the kit like Cộng Công.
 * Server events: `cast skill-h014` (0.5 s windup on the caster) → `ability skill-h014` (one resolve: 500 % true damage to the
 * zone's monsters in `targets`, Boss shield/armour cleared) → `blessing-h014` per ally → snapshot `primordialBlessing`
 * (6 s) and `divineImmortal` (2 s) → `trait-h014` normal attack (delegated). All timing follows events/snapshots.
 */
export class VisualNguyenThuy implements HeroVfx {
  readonly heroId = N.id;
  private art: KitPainted;
  private spray: KitSpray;
  private banner: NguyenThuyBanner;
  private streams: NguyenThuyStreams;
  private rend: NguyenThuyRend;
  private status: NguyenThuyStatus;

  constructor(scene: Scene, private paintTrait: NguyenThuyTraitPainter) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'nguyenthuy');
    this.spray = new KitSpray(scene, 'chaos');
    this.banner = new NguyenThuyBanner(scene, this.art, this.spray);
    this.streams = new NguyenThuyStreams(scene, this.art, this.spray);
    this.rend = new NguyenThuyRend(scene, this.art, this.spray);
    this.status = new NguyenThuyStatus(scene, this.art, this.spray);
  }

  prepare(): void { prepareNtArt(this.art); }

  /** The cast belongs to the caster himself; the event point is not a target. */
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${N.id}`) return false;
    this.prepare();
    this.banner.cast(event.source ?? 'unknown', origin ?? at, event.windup ?? N.windup, reduced);
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${N.id}`:
        if (event.kind !== 'ability') return false;
        this.resolve(event, extra?.hasOrigin ? origin : at, extra?.targets ?? [], extra?.main, reduced);
        return true;
      case `blessing-${N.id}`:
        this.status.pulse(at, reduced);
        return true;
      case `trait-${N.id}`:
        this.paintTrait(event, at, reduced);
        return true;
      default: return false;
    }
  }

  /** Snapshot: ally with `primordialBlessing`; `immortal` is the remaining `divineImmortal`. */
  markBlessing(id: string, at: Vector3, remaining: number, immortal: number, reduced: boolean): void {
    this.prepare();
    this.status.mark(id, at, remaining, immortal, reduced);
  }

  /** A real Boss lost its shield/armour buff to this resolve. */
  bossBreak(at: Vector3, reduced: boolean): void {
    this.prepare();
    this.rend.bossBreak(at, reduced);
  }

  tick(dt: number, time: number): void {
    this.banner.tick(dt, time);
    this.streams.tick(dt, time);
    this.rend.tick(dt);
    this.status.tick(dt, time);
  }

  clear(): void {
    this.banner.clear(); this.streams.clear(); this.rend.clear(); this.status.clear();
    this.spray.clear(); this.art.clear();
    debug('visual.nguyenthuy.clear', {});
  }

  /** One resolve: the banner splits, the streams leave along the proven lane, a rift opens on each listed monster. */
  private resolve(event: GameEvent, caster: Vector3, targets: readonly Vector3[], main: Vector3 | undefined, reduced: boolean): void {
    this.prepare();
    this.banner.release(event.source ?? 'unknown', caster, reduced);
    const aim = streamAim(caster, main, targets, event.direction);
    if (aim) this.streams.launch(caster, aim.dir, aim.reach, reduced);
    else debug('visual.nguyenthuy.streams.skip', { eventId: event.id, reason: 'no-direction' });
    const points: RendPoint[] = targets.map(at => ({ at, main: Boolean(main && Math.hypot(at.x - main.x, at.z - main.z) < .01) }));
    this.rend.sweep(caster, aim?.dir, aim?.reach ?? 16, points, reduced);
    debug('visual.nguyenthuy.impact', { eventId: event.id, targets: targets.length, reduced });
  }
}
