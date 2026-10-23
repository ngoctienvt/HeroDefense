import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HANGNGA as H } from '../../../content/hangnga-design.js';
import { debug } from './debug.js';
import { HangngaFreeze } from './visual-hangnga-freeze.js';
import { HangngaMoon } from './visual-hangnga-moon.js';
import { HangngaReplay } from './visual-hangnga-replay.js';
import { HangngaSilk } from './visual-hangnga-silk.js';
import { DEFAULT_WINDUP, SELF_DISTANCE } from './visual-hangnga-timeline.js';
import { HangngaWrap } from './visual-hangnga-wrap.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import type { SharedStatusFx } from './visual-shared-status.js';

/** Painted planes alive at once: 6 moon sheets, 16 flights, 24 wraps, 32 frozen drops, basic beams. */
const PAINTED_CAPACITY = 96;
/** The basic moonbeam is the same silk, smaller. */
const BEAM_SCALE = .55;

/**
 * Hằng Nga (h018) on the kit, Codex art from tier56-codex-art (palette/spray `moon`).
 * Windup (`cast skill-h018`): the R9,5 heal edge lights at the caster and the moon-and-silk sheet opens above her.
 * Resolve (`ability skill-h018`, `targets` = allies of the same owner in R9,5, the caster included): a silk flies to
 * every other ally and lands as the heal (shared heal sheet, footprint, moon motes, frost dust); the caster is healed
 * in place. The shield bubble is the shared layer; a silk wraps each listed ally while the snapshot still shows a shield
 * and unwinds in .3 s when it is gone (no timer). `freeze-h018` is its own branch over the whole zone: a silk falls on each
 * monster the server froze. Basic `trait-h018`: one smaller silk to the single target. Presentation only.
 */
export class VisualHangnga implements HeroVfx {
  readonly heroId = H.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private moon: HangngaMoon;
  private silk: HangngaSilk;
  private wrap: HangngaWrap;
  private freeze: HangngaFreeze;
  private preview = new HangngaReplay(this);

  constructor(private scene: Scene, status: SharedStatusFx) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'hangnga');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.moon = new HangngaMoon(scene, this.art, this.bank);
    this.silk = new HangngaSilk(scene, this.art, this.bank, status);
    this.wrap = new HangngaWrap(scene, this.art);
    this.freeze = new HangngaFreeze(scene, this.art, this.bank);
    debug('visual.hangnga.layout', { radius: H.allyRadius, freezeSeconds: H.freezeSeconds });
  }

  /** Idempotent; art still loading keeps the shader ring and the shared sheets, and the next use retries. */
  prepare(): void {
    this.art.prepare('moon', '/assets/vfx-hangnga-moon.webp', { foreground: true });
    this.art.prepare('silk', '/assets/vfx-hangnga-silk.webp', { foreground: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${H.id}`) return false;
    this.prepare();
    this.moon.begin(at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.hangnga.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${H.id}`:
        if (event.kind !== 'ability') return false;
        this.resolve(event, extra?.hasOrigin ? origin : at, extra?.targets ?? [], reduced);
        return true;
      case `trait-${H.id}`:
        this.beam(event, origin, extra?.targets[0] ?? at, extra?.hasOrigin ?? false, reduced);
        return true;
      case `freeze-${H.id}`:
        this.freeze.strike(extra?.targets ?? [], reduced);
        debug('visual.hangnga.freeze', { eventId: event.id, frozen: event.targets?.length ?? 0, shown: extra?.targets.length ?? 0, reduced });
        return true;
      default: return false;
    }
  }

  /** Snapshot marker `shield` (every frame an ally shows a shield); only Hằng Nga's listed recipients get the wrap. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'shield') this.wrap.mark(id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    this.moon.tick(dt);
    this.silk.tick(dt);
    this.wrap.tick(dt);
    this.freeze.tick(dt);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.moon.clear(); this.silk.clear(); this.wrap.clear(); this.freeze.clear();
    this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** `ids` are the server's recipients (keyed by actor); `positions` are the same allies in this zone (flights only). */
  private resolve(event: GameEvent, caster: Vector3, positions: readonly Vector3[], reduced: boolean): void {
    const ids = event.targets ?? [];
    const hadCast = this.moon.resolve(event.source, caster, reduced);
    this.wrap.register(ids);
    let selfSeen = false;
    for (const ally of positions) {
      if (Math.hypot(ally.x - caster.x, ally.z - caster.z) < SELF_DISTANCE) { selfSeen = true; this.silk.receive(ally, reduced); continue; }
      this.silk.send(caster, ally, reduced, () => this.silk.receive(ally, reduced));
    }
    if (!selfSeen && event.source !== undefined && ids.includes(event.source)) this.silk.receive(caster, reduced);
    debug('visual.hangnga.heal', { eventId: event.id, allies: ids.length, shown: positions.length, hadCast, reduced });
  }

  /** One smaller silk from her to the one monster the server hit; frost dust where it lands (the slow mark is shared). */
  private beam(event: GameEvent, origin: Vector3, target: Vector3, hasOrigin: boolean, reduced: boolean): void {
    const land = () => {
      this.bank.ring(target, .9, 'ice', { life: .28, fill: .25, rim: 1, alpha: .8, hold: true, reduced, order: 5 });
      if (!reduced) this.bank.spray('frost').ring(new Vector3(target.x, 0, target.z), .3, 8, .3, 1.2, 2.2);
    };
    if (!hasOrigin) { land(); return; }
    this.silk.send(origin, target, reduced, land, BEAM_SCALE);
    debug('visual.hangnga.beam', { eventId: event.id, reduced });
  }
}
