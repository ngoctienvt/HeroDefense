import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { VothuongChain } from './visual-vothuong-chain.js';
import { vothuongKills } from './visual-vothuong-kills.js';
import { VothuongMarks } from './visual-vothuong-marks.js';
import { VothuongReap } from './visual-vothuong-reap.js';
import { VothuongSoul } from './visual-vothuong-soul.js';
import { DEFAULT_WINDUP, VOTHUONG_ATLAS, VOTHUONG_ID, VOTHUONG_SKILL } from './visual-vothuong-timeline.js';

/**
 * Vô Thường (h00H) skill VFX on the kit. "Hắc Bạch Đoạt Mệnh Xích": a talisman ring tightens around the victim
 * during the windup (`cast`), the sickle-and-chain flies from his hand and the cut/burst lands (`ability`), and a
 * victim the server killed gives up its soul, which flies back to him on the Nộ refund beat. A yin-yang mark sits
 * under the enemy the snipe will pick while the server's crit condition holds (snapshot marker `mark`). His basic
 * shot (`trait-h00H`) and any other event/marker go to `fallback` (the tier recipe painter).
 */
export class VisualVothuong implements HeroVfx {
  readonly heroId = VOTHUONG_ID;
  private reap: VothuongReap;
  private chain: VothuongChain;
  private soul: VothuongSoul;
  private marks: VothuongMarks;

  constructor(scene: Scene, private flipbooks: KitFlipbooks, private fallback?: HeroVfx) {
    this.soul = new VothuongSoul(flipbooks);
    this.reap = new VothuongReap(flipbooks, (at, origin, reduced) => this.soul.release(at, origin, reduced));
    this.chain = new VothuongChain(scene);
    this.marks = new VothuongMarks(scene);
  }

  prepare(): void {
    for (const id of Object.values(VOTHUONG_ATLAS)) this.flipbooks.ensure(id);
    this.fallback?.prepare();
  }

  /** `cast skill-h00H` (server windup): the victim is `event.x/z` (the caller passes the caster as `at`). */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== VOTHUONG_SKILL) return this.fallback?.cast?.(event, at, reduced) ?? false;
    if (event.x === undefined || event.z === undefined) { debug('visual.vothuong.cast.skip', { reason: 'no-target' }); return true; }
    const windup = event.windup ?? DEFAULT_WINDUP;
    this.reap.cast(event.source ?? 'unknown', at.clone().set(event.x, 0, event.z), windup, reduced);
    debug('visual.vothuong.cast', { eventId: event.id, windup, reduced });
    return true;
  }

  /** `ability skill-h00H` (origin = Vô Thường, `at` = the victim's position from the event). */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    if (event.kind !== 'ability' || event.skillId !== VOTHUONG_SKILL) return this.fallback?.ability?.(event, origin, at, reduced, extra) ?? false;
    const killed = vothuongKills.consume(event.target);
    const thrown = this.chain.throwAt(origin, at, reduced);
    this.reap.strike(event.source ?? 'unknown', at, origin, killed, reduced);
    debug('visual.vothuong.ability', { eventId: event.id, killed, chain: thrown, reduced });
    return true;
  }

  /** Snapshot marker `mark` on the pending victim; anything else belongs to the recipe painter. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'mark') this.marks.mark(id, at, reduced);
    else this.fallback?.mark?.(kind, id, at, reduced);
  }

  /** The fallback painter is registered on its own (as in the other Huyền modules), so it ticks and clears itself. */
  tick(dt: number): void {
    this.reap.tick(dt);
    this.chain.tick(dt);
    this.soul.tick(dt);
    this.marks.tick(dt);
  }

  clear(): void {
    this.reap.clear();
    this.chain.clear();
    this.soul.clear();
    this.marks.clear();
    vothuongKills.clear();
  }
}
