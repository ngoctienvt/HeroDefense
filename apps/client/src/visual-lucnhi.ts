import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { LUCNHI as L } from '../../../content/lucnhi-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { LucnhiBoundary } from './visual-lucnhi-boundary.js';
import { LucnhiExposed } from './visual-lucnhi-exposed.js';
import { LucnhiReplay } from './visual-lucnhi-replay.js';
import { LucnhiSmoke } from './visual-lucnhi-smoke.js';
import { LucnhiStrikes } from './visual-lucnhi-strikes.js';
import { DEFAULT_WINDUP } from './visual-lucnhi-timeline.js';

/** Painted planes alive at once: ≤96 hits + 48 cudgels + smoke (8+8) + boundary arcs (12) + 80 seals + 60 split strokes. */
const PAINTED_CAPACITY = 320;

/**
 * Lục Nhĩ Mỹ Hầu Hỗn Thế Ma Côn (h03Y) on the kit, Codex art from tier56-codex-art (palette/spray `lucnhi`).
 * `cast`: R6.5 lock boundary at the server's locked point (event x/z) + ink smoke gathering on the caster.
 * `ability skill-h03Y`: the smoke disperses as the sprite vanishes (battlefield hides it through `shadowAssault`;
 * no image teleport) and the boundary fades. `shadow-hit-h03Y` (strikeIndex 1..6): cudgel + hit sheet + ground mark +
 * shards only on that pulse's server target list. Marker `assault` (every frame): its loss plays the 0.25 s return.
 * Marker `exposed`: crit-vulnerability seal per monster, splitting into six strokes when it ends. Basic `trait-h03Y`:
 * one cudgel along the pierce line. Armour break comes from the shared red body tint. Presentation only.
 */
export class VisualLucnhi implements HeroVfx {
  readonly heroId = L.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private smoke: LucnhiSmoke;
  private boundary: LucnhiBoundary;
  private strikes: LucnhiStrikes;
  private exposed: LucnhiExposed;
  private preview = new LucnhiReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'lucnhi');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.smoke = new LucnhiSmoke(this.art, this.bank);
    this.boundary = new LucnhiBoundary(this.art, this.bank);
    this.strikes = new LucnhiStrikes(scene, this.art, this.bank);
    this.exposed = new LucnhiExposed(this.art);
    debug('visual.lucnhi.layout', { radius: L.strikeRadius, strikes: L.strikes, duration: L.strikeDuration });
  }

  /** Idempotent; art still loading keeps the kit rim ring, and the next use retries. */
  prepare(): void {
    for (const id of ['vanish', 'return', 'hit', 'staff']) this.art.prepare(id, `/assets/vfx-lucnhi-${id}.webp`, { foreground: true });
    this.art.prepare('boundary', '/assets/vfx-lucnhi-boundary.webp');
    this.art.prepare('weakness', '/assets/vfx-lucnhi-weakness.webp');
    this.art.prepare('split', '/assets/vfx-lucnhi-weakness-split.webp');
  }

  /** `at` is the caster (battlefield passes his position); the locked point is the event's own x/z. */
  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${L.id}`) return false;
    this.prepare();
    const caster = origin ?? at, windup = event.windup ?? DEFAULT_WINDUP, source = event.source ?? '';
    const point = event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : caster;
    this.smoke.begin(source, caster, windup, reduced);
    this.boundary.begin(source, point, windup, reduced);
    debug('visual.lucnhi.cast', { eventId: event.id, windup, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, _at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${L.id}`: {
        if (event.kind !== 'ability') return false;
        const source = event.source ?? '';
        const hadCast = this.smoke.resolve(source, extra?.hasOrigin ? origin : undefined, reduced);
        this.boundary.resolve(source);
        debug('visual.lucnhi.resolve', { eventId: event.id, hadCast, targets: event.targets?.length ?? 0, reduced });
        return true;
      }
      case `shadow-hit-${L.id}`:
        this.strikes.pulse(event.strikeIndex ?? 1, extra?.targets ?? [], reduced);
        return true;
      case `trait-${L.id}`: {
        const direction = unitDirection(event, origin);
        if (!direction) { debug('visual.lucnhi.basic.skip', { eventId: event.id, reason: 'no-direction' }); return true; }
        this.strikes.basic(origin, direction, L.waveLength, extra?.targets ?? [], Boolean(event.isCrit), reduced);
        return true;
      }
      default: return false;
    }
  }

  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'assault') this.smoke.mark(id, at, reduced);
    else if (kind === 'exposed') this.exposed.mark(id, at, reduced);
  }

  /** The replay drives its markers first so the sweeps below never see them as lost. */
  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.smoke.tick(dt, up);
    this.boundary.tick(dt);
    this.strikes.tick(dt, up);
    this.exposed.tick(dt, time);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.smoke.clear(); this.boundary.clear(); this.strikes.clear(); this.exposed.clear();
    this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }
}
