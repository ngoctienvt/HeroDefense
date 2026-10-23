import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KIMSI as K } from '../../../content/kimsi-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { KimsiBleed } from './visual-kimsi-bleed.js';
import { KimsiCuts } from './visual-kimsi-cuts.js';
import { KimsiGather } from './visual-kimsi-gather.js';
import { KimsiMantle } from './visual-kimsi-mantle.js';
import { KimsiReplay } from './visual-kimsi-replay.js';
import { KimsiStorm } from './visual-kimsi-storm.js';
import { BASIC_ARC, BASIC_LIFE, BASIC_REACH, CUT_BASIC_SIZE, CUT_CRIT_SIZE, CUT_SIZE, cutDelay, DEFAULT_WINDUP,
  DOUBLE_STRIKE_WINDOW, strikeDirection } from './visual-kimsi-timeline.js';

/** Painted planes alive at once: 2 casts × (14 feathers + bud), 3 storms, 24 cuts, 20 scars, 6 × 2 mantle bands. */
const PAINTED_CAPACITY = 110;
/** Targets that get a cut for one basic strike. */
const MAX_BASIC_HITS = 12;

/**
 * Kim Sí Đại Bằng Kim Dực Trảm Thiên (h016) on the kit, Codex art from tier56-codex-art (palette `goldwing`).
 * Windup (`cast`): the feather gather (storm-sheet bud + fourteen feathers swirling in from the R6.5 rim), following
 * the caster. Resolve (`ability skill-h016`): the storm burst flat over R6.5, one rim ring at the exact radius, four
 * ground crescents and ONE simultaneous wave of X cuts over the monsters the server listed (never a rain of hits).
 * Berserk (marker `berserk`, from `berserk.remaining`): two feather bands at shoulders and feet while it lasts, folded
 * back in 0.3 s when it ends. Bleed (marker `bleed`, from `bleed.remaining` of an h016 bleed): a small scar per
 * monster for exactly the server's 3 s. Basic `trait-h016`: a frontal crescent per strike plus a small cut on each
 * target. No fire ring, the actor never leaves the ground. Presentation only; the server decides hits and timers.
 */
export class VisualKimsi implements HeroVfx {
  readonly heroId = K.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private gather: KimsiGather;
  private storm: KimsiStorm;
  private cuts: KimsiCuts;
  private mantle: KimsiMantle;
  private bleed: KimsiBleed;
  private preview = new KimsiReplay(this);
  private lastStrike = new Map<string, { time: number; flip: boolean }>();
  private time = 0;
  private reduced = false;

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'kimsi');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.gather = new KimsiGather(this.art);
    this.storm = new KimsiStorm(this.art, this.bank);
    this.cuts = new KimsiCuts(this.art, this.bank);
    this.mantle = new KimsiMantle(this.art, this.bank);
    this.bleed = new KimsiBleed(this.art, this.bank);
    debug('visual.kimsi.layout', { radius: K.stormRadius, berserk: K.berserkSeconds, bleed: K.bleedSeconds });
  }

  /** Idempotent; art still loading keeps the rim ring and the next use retries. */
  prepare(): void {
    this.art.prepare('storm', '/assets/vfx-kimsi-storm.webp', { foreground: true });
    this.art.prepare('feather', '/assets/vfx-kimsi-feather.webp', { foreground: true });
    this.art.prepare('cut', '/assets/vfx-kimsi-cut.webp', { foreground: true });
    this.art.prepare('bleed', '/assets/vfx-kimsi-bleed.webp', { foreground: true });
    this.art.prepare('mantle', '/assets/vfx-kimsi-mantle.webp', { foreground: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${K.id}`) return false;
    this.prepare();
    this.gather.begin(origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.kimsi.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${K.id}`: {
        if (event.kind !== 'ability') return false;
        const center = event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : at;
        const hadCast = this.gather.release(event.source);
        this.storm.play(center, reduced);
        const targets = extra?.targets ?? [];
        for (const target of targets.slice(0, MAX_BASIC_HITS * 2))
          this.cuts.add(target, CUT_SIZE, cutDelay(Math.hypot(target.x - center.x, target.z - center.z), reduced), reduced);
        debug('visual.kimsi.impact', { eventId: event.id, hadCast, targets: event.targets?.length ?? 0, shown: targets.length, reduced });
        return true;
      }
      case `trait-${K.id}`:
        this.basic(event, origin, extra?.targets ?? [], reduced);
        return true;
      default: return false;
    }
  }

  /** Snapshot markers, every frame while the state is present: `caster`, `berserk`, `bleed`. */
  mark(kind: string, id: string, at: Vector3, reduced = false): void {
    this.reduced = reduced;
    if (kind === 'caster') this.gather.follow(id, at);
    else if (kind === 'berserk') this.mantle.mark(id, at);
    else if (kind === 'bleed' && !this.bleed.mark(id, at)) debug('visual.kimsi.cap', { layer: 'bleed' });
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.gather.tick(dt);
    this.storm.tick(dt);
    this.cuts.tick(dt, up);
    this.mantle.tick(dt, up, this.reduced);
    this.bleed.tick(dt, up, this.reduced);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.gather.clear(); this.storm.clear(); this.cuts.clear();
    this.mantle.clear(); this.bleed.clear(); this.bank.clear(); this.art.clear(); this.lastStrike.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** One frontal crescent per strike (the second of a double strike swings from the other side), a cut per target. */
  private basic(event: GameEvent, origin: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const dir = unitDirection(event, origin);
    if (!dir) { debug('visual.kimsi.attack.skip', { eventId: event.id, reason: 'no-direction' }); return; }
    const key = event.source ?? '';
    const previous = this.lastStrike.get(key);
    const followUp = Boolean(previous && this.time - previous.time < DOUBLE_STRIKE_WINDOW && this.time >= previous.time);
    const flip = followUp ? !previous!.flip : false;
    this.lastStrike.set(key, { time: this.time, flip });
    this.bank.slash(origin, strikeDirection(dir, followUp, flip), BASIC_REACH, BASIC_ARC, 'goldwing', BASIC_LIFE, reduced);
    for (const target of targets.slice(0, MAX_BASIC_HITS))
      this.cuts.add(target, event.isCrit ? CUT_CRIT_SIZE : CUT_BASIC_SIZE, reduced ? 0 : .04, reduced);
    debug('visual.kimsi.attack', { eventId: event.id, hits: targets.length, crit: Boolean(event.isCrit), followUp, reduced });
  }
}
