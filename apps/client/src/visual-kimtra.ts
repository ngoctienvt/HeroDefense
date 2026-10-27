import { Constants } from '@babylonjs/core/Engines/constants.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { slashPlaneSize } from './visual-kit-recipe-timeline.js';
import { KitSpray } from './visual-kit-spray.js';
import { unitDirection } from './visual-kit-timeline.js';
import { DEFAULT_WINDUP, KIMTRA_ATLAS, KIMTRA_ID, SLASH_HALF_ANGLE, SLASH_LIFE, SLASH_MERGE, SLASH_REACH,
  slashSweep } from './visual-kimtra-timeline.js';
import { KimtraStatus } from './visual-kimtra-status.js';
import { KimtraUltimate } from './visual-kimtra-ultimate.js';
import { KimtraBell3D } from './visual-kimtra-bell3d.js';

/** `sum` adds every hit direction of the swing: the first event is often a side target, not the aimed one. */
type Slash = { layer: Layer; age: number; crit: boolean; sum: { x: number; z: number } };
const MAX_SLASHES = 8;
/** Waist height: a ground-level arc toward the far side hides behind the hero sprite. */
const SLASH_HEIGHT = 1.1;

/**
 * Kim Tra (h009) VFX on the kit. Ultimate "Kim Chung Phản Kích Trận": formation sigil + gold bell forming
 * (cast), bells dropping on Kim Tra and the weakest ally (ability), seated bell shells while the shield
 * holds (snapshot), bell shatter when it breaks, ring-out wave on the counter (`reflect-h009`).
 * Basic attack: heavy gold broadsword arc across the 120° frontal cleave; crits throw gold shards.
 */
export class VisualKimtra implements HeroVfx {
  readonly heroId = KIMTRA_ID;
  private spray: KitSpray;
  private ultimate: KimtraUltimate;
  private status: KimtraStatus;
  private bell3d: KimtraBell3D;
  private slashPool: LayerPool;
  private slashes: Slash[] = [];
  private lastSwing = new Map<string, { time: number; slash?: Slash }>();
  private time = 0;
  private serial = 0;

  constructor(scene: Scene, private flipbooks: KitFlipbooks) {
    this.spray = new KitSpray(scene, 'gold');
    this.bell3d = new KimtraBell3D(scene);
    this.ultimate = new KimtraUltimate(scene, flipbooks, this.spray, this.bell3d);
    this.status = new KimtraStatus(scene, flipbooks, this.spray, this.bell3d);
    this.slashPool = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitSlash', 'kimtra', `kimtra-slash-${this.serial++}`);
      layer.material.depthFunction = Constants.ALWAYS; // short swing must read in front of the hero billboard
      layer.material.setFloat('uArc', SLASH_HALF_ANGLE);
      return layer;
    }, MAX_SLASHES, 'kimtra-slash');
  }

  prepare(): void {
    for (const id of Object.values(KIMTRA_ATLAS)) this.flipbooks.ensure(id); // fallback while the 3D bell loads
    this.bell3d.prepare();
  }

  /** `cast skill-h009` (server windup) at Kim Tra himself. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${KIMTRA_ID}`) return false;
    this.ultimate.cast(event.source ?? 'unknown', at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.kimtra.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  /** `ability skill-h009` per recipient (at = recipient, origin = Kim Tra), `reflect-h009`, `trait-h009`. */
  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): boolean {
    if (event.kind === 'ability' && event.skillId === `skill-${KIMTRA_ID}`) {
      this.ultimate.impact(event.source ?? 'unknown', origin, at, reduced);
      return true;
    }
    if (event.skillId === `reflect-${KIMTRA_ID}`) { this.status.ring(event.source ?? 'unknown', origin, reduced); return true; }
    if (event.skillId === `trait-${KIMTRA_ID}`) { this.swing(event, origin, at, reduced); return true; }
    return false;
  }

  /** Snapshot marker `bell`: the unit still holds the shield Kim Tra's bell gave it. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'bell') this.status.markBell(id, at, reduced);
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.bell3d.tick(dt, time);
    this.ultimate.tick(dt, time);
    this.status.tick(dt, time);
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const slash = this.slashes[i];
      slash.age += dt;
      if (slash.age >= SLASH_LIFE) { this.slashPool.release(slash.layer); this.slashes.splice(i, 1); continue; }
      const { head, tail } = slashSweep(slash.age);
      const m = slash.layer.material;
      m.setFloat('uTime', time); m.setFloat('uHead', head); m.setFloat('uTail', tail);
      m.setFloat('uAlpha', (slash.crit ? 1 : .9) * (1 - Math.max(0, slash.age - SLASH_LIFE * .7) / (SLASH_LIFE * .3)));
    }
  }

  clear(): void {
    this.ultimate.clear();
    this.status.clear();
    this.bell3d.clear();
    this.spray.clear();
    this.slashes.length = 0;
    this.slashPool.releaseAll();
    this.lastSwing.clear();
  }

  /**
   * One frontal cleave sends one event per enemy hit and no direction: the first event of a swing draws the
   * arc (origin → its target), the rest only add hit sparks.
   */
  private swing(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean): void {
    const source = event.source ?? 'unknown';
    const last = this.lastSwing.get(source);
    const direction = unitDirection(event, origin);
    if (!reduced) this.spray.ring(new Vector3(at.x, .8, at.z), .25, event.isCrit ? 10 : 3, .3, event.isCrit ? 3.5 : 1.8, 2.2);
    if (last !== undefined && this.time - last.time < SLASH_MERGE) {
      // Same swing: re-aim the arc at the mean of every enemy it hit.
      if (last.slash && direction) {
        last.slash.sum.x += direction.x; last.slash.sum.z += direction.z;
        last.slash.layer.mesh.rotation.y = Math.atan2(last.slash.sum.x, last.slash.sum.z);
        if (event.isCrit) last.slash.crit = true;
      }
      return;
    }
    const entry: { time: number; slash?: Slash } = { time: this.time };
    this.lastSwing.set(source, entry);
    if (!direction) { debug('visual.kimtra.slash.skip', { eventId: event.id, reason: 'no-direction' }); return; }
    const layer = this.slashPool.acquire();
    if (!layer) return;
    layer.mesh.scaling.setAll(slashPlaneSize(SLASH_REACH) * (event.isCrit ? 1.12 : 1));
    layer.mesh.position.set(origin.x, SLASH_HEIGHT, origin.z);
    layer.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    entry.slash = { layer, age: reduced ? SLASH_LIFE * .5 : 0, crit: Boolean(event.isCrit), sum: { ...direction } };
    this.slashes.push(entry.slash);
    debug('visual.kimtra.slash', { eventId: event.id, crit: Boolean(event.isCrit),
      direction: { x: +direction.x.toFixed(2), z: +direction.z.toFixed(2) } });
  }
}
