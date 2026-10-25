import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { KitPainted } from './visual-kit-painted.js';
import { prepareFuxiArt } from './visual-fuxi-assets.js';
import { FuxiArray } from './visual-fuxi-array.js';
import { FuxiLinks } from './visual-fuxi-links.js';
import { FuxiReplay } from './visual-fuxi-replay.js';
import { DEFAULT_WINDUP } from './visual-fuxi-timeline.js';
import { FuxiWake } from './visual-fuxi-wake.js';

/** Painted planes alive at once: wake (3) + held zones (3) + ropes (24 + 24 knots). */
const PAINTED_CAPACITY = 64;
const MAX_STRIKE_POINTS = 6;

/**
 * Phục Hy (h01D) on the kit: Tiên Thiên Bát Quái Càn Khôn Trận and the guqin strike.
 * Server events: `cast skill-h01D` (0.25 s windup, at the locked point) → `ability skill-h01D` (everything in R9.5 takes 440 %,
 * slow, sunder and a 60 % soul link) → snapshot `fuxi-bagua` (radius / remaining, 6 s, pulls monsters inward) and `soulLink`
 * pairs (rope between linked monsters). `trait-h01D` is the normal guqin strike (35 % link, not an ultimate link).
 * Layers (each its own module): FuxiWake opening, FuxiArray hold/close, FuxiLinks rope. The VisualEffects marker and adapter
 * entry points keep their signatures; the adapter routes `skill-h01D` here with the real target list.
 */
export class VisualFuxi {
  private readonly art: KitPainted;
  private readonly bank: KitFxBank;
  private readonly wake: FuxiWake;
  private readonly array: FuxiArray;
  private readonly links: FuxiLinks;
  private readonly preview = new FuxiReplay(this);
  private time = 0;

  constructor(scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'fuxi');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.wake = new FuxiWake(scene, this.art, this.bank);
    this.array = new FuxiArray(scene, this.art, this.bank);
    this.links = new FuxiLinks(scene, this.art);
  }

  /** Atlases load only once a Phục Hy is on the field (idempotent). */
  prepare(): void { prepareFuxiArt(this.art); }

  /** `at` is the locked point (the cast event is placed on the target), where the array will stand. */
  cast(event: GameEvent, at: Vector3, reduced = false): void {
    this.prepare();
    this.wake.cast(event.source ?? String(event.id), at, event.windup ?? DEFAULT_WINDUP, reduced);
  }

  impact(event: GameEvent, at: Vector3, reduced: boolean, targets: readonly Vector3[] = []): void {
    this.prepare();
    this.wake.impact(event.source ?? String(event.id), at, targets, reduced);
  }

  /** Normal guqin strike: a jade qi line chains from the player through up to six linked monsters. */
  attack(event: GameEvent, from: Vector3, targets: Vector3[], reduced: boolean): void {
    if (!targets.length) return;
    this.prepare();
    const points = [from, ...targets.slice(0, reduced ? 2 : MAX_STRIKE_POINTS)];
    for (let i = 1; i < points.length; i++)
      this.bank.ribbon(points[i - 1], points[i], 'bagua', { life: reduced ? .2 : .38, width: reduced ? .45 : .7, wave: .6, height: 1.2, reduced });
    debug('visual.fuxi.attack', { eventId: event.id, targets: points.length - 1, reduced });
  }

  /** Snapshot marker: `fuxi-bagua` radius / remaining (called every frame the zone exists). */
  markZone(id: string, at: Vector3, radius: number, remaining: number, reduced = false): void {
    this.prepare();
    this.array.mark(id, at, radius, remaining, reduced);
  }

  /** Caller provides current snapshot endpoints and only ultimate-strength soulLink pairs. */
  markLink(id: string, from: Vector3, to: Vector3, remaining: number, reduced = false): void {
    this.prepare();
    this.links.mark(id, from, to, remaining, reduced);
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.time += dt;
    this.preview.tick(dt);
    this.wake.tick(dt, this.time);
    this.array.tick(dt, this.time);
    this.links.tick(dt, this.time);
    this.bank.tick(dt, this.time);
  }

  clear(): void {
    this.preview.clear();
    this.wake.clear(); this.array.clear(); this.links.clear();
    this.bank.clear(); this.art.clear(); this.time = 0;
  }

  /** `?debug=1` replay (`__vfxReplay('h01D', kind?)`); presentation only. */
  replay(kind: string, caster: Vector3, point: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, caster, point, reduced);
  }
}
