import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { KimthienBowls } from './visual-kimthien-bowls.js';
import { KimthienReplay } from './visual-kimthien-replay.js';
import { KimthienWindup } from './visual-kimthien-windup.js';
import { BOWL_SIZE, DEFAULT_WINDUP } from './visual-kimthien-timeline.js';

/** Painted planes alive at once: 4 bowls × (rear, front, 2 swirls, bud) + 4 windup swirls. */
const PAINTED_CAPACITY = 32;

/**
 * Kim Thiền Tử (h013) Tử Kim Bát Vu Thu Yêu Trận on the kit, Codex art from tier56-codex-art (palettes `jade`, sprays `bagua`/`kunlun`).
 * Windup (`cast skill-h013`, locked point): the R7 edge lights and a jade-gold swirl gathers at the point.
 * Resolve (`ability skill-h013`): the rear wall (under monsters) and the front lip (over them) open together over the
 * point, an inward swirl of wind, stones and leaves loops between them, dust and petals run toward the centre for as
 * long as the `golden-bowl` ground effect reports `remaining`; when it runs out the bowl folds shut and a few petals fall.
 * There is no end blast (the server deals none). Basic `trait-h013`: a small jade contact ring on the hit monster.
 * Presentation only; the server pulls and hurts.
 */
export class VisualKimthien implements HeroVfx {
  readonly heroId = K.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private windup: KimthienWindup;
  private bowls: KimthienBowls;
  private preview = new KimthienReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'kimthien');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.windup = new KimthienWindup(this.art, this.bank);
    this.bowls = new KimthienBowls(this.art, this.bank);
    debug('visual.kimthien.layout', { radius: K.zoneRadius, bowl: +BOWL_SIZE.toFixed(2) });
  }

  /** Idempotent; art still loading keeps the shader ring and the next use retries. */
  prepare(): void {
    // Rear wall, swirl and bud draw before every actor (monsters over them); `depthAlways` stops the ground clipping the base.
    this.art.prepare('rear', '/assets/vfx-kimthien-bowl-rear.webp', { depthAlways: true });
    this.art.prepare('suction', '/assets/vfx-kimthien-suction.webp', { depthAlways: true });
    this.art.prepare('collapse', '/assets/vfx-kimthien-collapse.webp', { depthAlways: true });
    // Front lip: over monsters, under heroes and health.
    this.art.prepare('front', '/assets/vfx-kimthien-bowl-front.webp', { foreground: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${K.id}`) return false;
    this.prepare();
    this.windup.begin(at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.kimthien.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, _origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${K.id}`: {
        if (event.kind !== 'ability') return false;
        const lead = this.windup.take(event.source ?? '');
        const started = this.bowls.begin(at, lead?.alpha ?? 0, reduced);
        debug('visual.kimthien.impact', { eventId: event.id, hadCast: Boolean(lead), started, reduced });
        return true;
      }
      case `trait-${K.id}`:
        this.basic(event, at, extra?.targets ?? [at], reduced);
        return true;
      default: return false;
    }
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    this.preview.tick(dt);
    this.windup.tick(dt, up);
    this.bowls.tick(dt, up);
    this.bank.tick(dt, time);
  }

  /** Ground snapshot marker for `golden-bowl` (every frame while the zone exists): `remaining` is the server clock. */
  markBowl(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare();
    this.bowls.mark(id, at, remaining, reduced);
  }

  clear(): void {
    this.preview.clear(); this.windup.clear(); this.bowls.clear(); this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** The lotus lands on its one target: a small jade contact ring and a few petals, nothing wider. */
  private basic(event: GameEvent, at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const target = targets[0] ?? at;
    this.bank.ring(target, 1.3, 'jade', { life: .3, fill: .25, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
    if (!reduced) this.bank.spray('bagua').ring(new Vector3(target.x, 0, target.z), .3, 6, .2, 1.1, 2.2);
    debug('visual.kimthien.attack', { eventId: event.id, targets: event.targets?.length ?? 0, reduced });
  }
}
