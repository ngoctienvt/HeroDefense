import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { advanceBowl, ADOPT_DISTANCE, BOWL_ANCHOR_Y, BOWL_COLUMNS, BOWL_ROWS, BOWL_SIZE, bowlDone, bowlLayerPose, budPose,
  type BowlClock, COLLAPSE_ANCHOR_Y, COLLAPSE_SECONDS, COLLAPSE_SHOWER, DROPS_PER_SECOND, ENDED_MEMORY, inwardDrop, markClock, MAX_BOWLS,
  REUSE_AGE, RING_LIFE, RING_PERIOD, showerDrop, SMALL_COLUMNS, SMALL_ROWS, startBowl, SUCTION_ALPHA, SUCTION_LIFT, SUCTION_OUTER_ALPHA, SUCTION_OUTER_LIFT,
  SUCTION_OUTER_SIZE, SUCTION_SIZE, suctionPose } from './visual-kimthien-timeline.js';

/** Draw order inside the world pass (all before every actor, so monsters stand over the rear wall and the swirl). */
const ORDER = { rear: 5, outer: 6, inner: 7, bud: 9 } as const;

interface Bowl {
  id?: string; at: Vector3; clock: BowlClock; reduced: boolean;
  /** Seconds until the next zone-edge pulse and the next drop batch. */
  ringIn: number; dropDebt: number; showered: boolean;
  meshes: { rear?: Mesh; front?: Mesh; inner?: Mesh; outer?: Mesh; bud?: Mesh };
}

/**
 * The golden bowl over a `golden-bowl` ground effect. Two registered layers of the same Codex bowl: the rear wall
 * (world pass: monsters draw over it) and the front lip (foreground pass: over monsters, under heroes), always on
 * the same frame so they open and close together and leave the middle free. An inward swirl of jade wind, stones
 * and leaves loops between them while the zone lasts, inward dust and petals run toward the centre, and when the
 * server's `remaining` runs out the bowl folds shut (bud sheet) and a few petals fall. Nothing here ever flies outward.
 */
export class KimthienBowls {
  private bowls: Bowl[] = [];
  /** Ground ids whose bowl already folded → seconds since their last (stale) mark. */
  private ended = new Map<string, number>();

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  get count(): number { return this.bowls.length; }

  /** The server resolved the cast at `at`: a bowl starts (confirmed later by the ground mark that follows). */
  begin(at: Vector3, swirlFrom: number, reduced: boolean): boolean {
    // The ground mark can be processed before the resolve event: reuse that young bowl instead of stacking a second one.
    const young = this.bowls.find(item => item.clock.phase !== 'collapse' && item.clock.age < REUSE_AGE
      && Math.hypot(item.at.x - at.x, item.at.z - at.z) <= ADOPT_DISTANCE);
    if (young) {
      young.clock = { ...startBowl({ swirlFrom }), confirmed: young.clock.confirmed, remaining: young.clock.remaining };
      young.reduced = reduced;
      return true;
    }
    if (this.bowls.length >= MAX_BOWLS) { debug('visual.kimthien.cap', { bowls: this.bowls.length }); return false; }
    this.bowls.push(this.create(at, startBowl({ swirlFrom }), reduced));
    return true;
  }

  /** Ground snapshot marker (every frame): binds to its bowl, adopts a just-resolved one at the same point, or joins late. */
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (this.ended.has(id)) { this.ended.set(id, 0); return; }
    let bowl = this.bowls.find(item => item.id === id);
    if (!bowl) {
      bowl = this.bowls.find(item => !item.id && item.clock.phase !== 'collapse'
        && Math.hypot(item.at.x - at.x, item.at.z - at.z) <= ADOPT_DISTANCE);
      if (bowl) bowl.id = id;
    }
    if (!bowl) {
      if (remaining <= COLLAPSE_SECONDS) return; // nothing left to show for a zone first seen at its very end
      if (this.bowls.length >= MAX_BOWLS) { debug('visual.kimthien.cap', { bowls: this.bowls.length, id }); return; }
      bowl = this.create(at, startBowl({ late: true, swirlFrom: 1 }), reduced);
      bowl.id = id;
      this.bowls.push(bowl);
      debug('visual.kimthien.status', { id, remaining: +remaining.toFixed(2), late: true });
    }
    bowl.clock = markClock(bowl.clock, remaining);
    bowl.reduced = reduced;
  }

  tick(dt: number, up: Vector3): void {
    for (const [id, quiet] of this.ended) {
      if (quiet + dt > ENDED_MEMORY) this.ended.delete(id); else this.ended.set(id, quiet + dt);
    }
    for (let i = this.bowls.length - 1; i >= 0; i--) {
      const bowl = this.bowls[i];
      const before = bowl.clock.phase;
      bowl.clock = advanceBowl(bowl.clock, dt, bowl.reduced);
      if (before !== 'collapse' && bowl.clock.phase === 'collapse') this.fold(bowl);
      if (bowlDone(bowl.clock, bowl.reduced)) {
        this.release(bowl); this.bowls.splice(i, 1);
        if (bowl.id) this.ended.set(bowl.id, 0);
        continue;
      }
      this.rhythm(bowl, dt);
      this.draw(bowl, up);
    }
  }

  clear(): void { for (const bowl of this.bowls) this.freeMeshes(bowl); this.bowls.length = 0; this.ended.clear(); }

  private create(at: Vector3, clock: BowlClock, reduced: boolean): Bowl {
    const bowl: Bowl = { at: new Vector3(at.x, 0, at.z), clock, reduced, ringIn: 0, dropDebt: 0, showered: false, meshes: {} };
    debug('visual.kimthien.impact', { x: +at.x.toFixed(2), z: +at.z.toFixed(2), reduced });
    return bowl;
  }

  /** Zone-edge pulses on the ground and the continuous inward drops, only while the zone is held. */
  private rhythm(bowl: Bowl, dt: number): void {
    if (bowl.clock.phase === 'collapse') return;
    bowl.ringIn -= dt;
    if (bowl.ringIn <= 0) {
      bowl.ringIn += RING_PERIOD;
      this.bank.ring(bowl.at, K.zoneRadius, 'jade', { life: RING_LIFE, fill: .1, rim: 1, alpha: .55, hold: true, reduced: bowl.reduced, order: 4 });
    }
    if (bowl.reduced) return;
    bowl.dropDebt += dt * DROPS_PER_SECOND;
    const spray = this.bank.spray('bagua');
    for (; bowl.dropDebt >= 1; bowl.dropDebt -= 1) {
      const drop = inwardDrop(Math.random);
      spray.trail(new Vector3(bowl.at.x + drop.x, .2, bowl.at.z + drop.z), new Vector3(drop.vx, drop.vy, drop.vz), 1);
    }
  }

  /** A soft shower of petals and dust over the folding bowl: it falls, it does not burst. */
  private fold(bowl: Bowl): void {
    debug('visual.kimthien.release', { id: bowl.id ?? 'unconfirmed', remaining: bowl.clock.remaining ?? null });
    if (bowl.reduced || bowl.showered) return;
    bowl.showered = true;
    const spray = this.bank.spray('kunlun');
    for (let i = 0; i < COLLAPSE_SHOWER; i++) {
      const drop = showerDrop(Math.random);
      spray.trail(new Vector3(bowl.at.x + drop.x, drop.y, bowl.at.z + drop.z), Vector3.Zero(), 1);
    }
  }

  private draw(bowl: Bowl, up: Vector3): void {
    const { clock, reduced, meshes } = bowl;
    const layers = bowlLayerPose(clock, reduced);
    if (layers.alpha > 0) {
      this.layer(bowl, 'rear', 'rear', layers.frame, layers.alpha, BOWL_SIZE, BOWL_ANCHOR_Y, 0, up, BOWL_COLUMNS, BOWL_ROWS, ORDER.rear);
      this.layer(bowl, 'front', 'front', layers.frame, layers.alpha, BOWL_SIZE, BOWL_ANCHOR_Y, 0, up, BOWL_COLUMNS, BOWL_ROWS);
    } else { this.art.release(meshes.rear); this.art.release(meshes.front); meshes.rear = meshes.front = undefined; }
    const inner = suctionPose(clock, reduced, SUCTION_ALPHA);
    const outer = suctionPose(clock, reduced, SUCTION_OUTER_ALPHA);
    if (inner.alpha > .01) {
      this.layer(bowl, 'inner', 'suction', inner.frame, inner.alpha, SUCTION_SIZE, .5, SUCTION_LIFT, up, SMALL_COLUMNS, SMALL_ROWS, ORDER.inner);
      if (!reduced) this.layer(bowl, 'outer', 'suction', (outer.frame + 4) % 8, outer.alpha, SUCTION_OUTER_SIZE, .5,
        SUCTION_OUTER_LIFT, up, SMALL_COLUMNS, SMALL_ROWS, ORDER.outer);
    } else { this.art.release(meshes.inner); this.art.release(meshes.outer); meshes.inner = meshes.outer = undefined; }
    const bud = budPose(clock, reduced);
    if (bud) this.layer(bowl, 'bud', 'collapse', bud.frame, bud.alpha, BOWL_SIZE * bud.scale, COLLAPSE_ANCHOR_Y, 0, up,
      SMALL_COLUMNS, SMALL_ROWS, ORDER.bud);
  }

  /** Acquire on demand (art still loading retries next frame) and pose one plane. */
  private layer(bowl: Bowl, slot: keyof Bowl['meshes'], art: string, frame: number, alpha: number, size: number,
    anchorY: number, lift: number, up: Vector3, columns: number, rows: number, order?: number): void {
    const mesh = bowl.meshes[slot] ??= this.art.acquire(art);
    if (!mesh) return;
    if (order !== undefined) mesh.alphaIndex = GROUND_ALPHA_INDEX + order;
    mesh.position.copyFrom(billboardCenter(new Vector3(bowl.at.x, 0, bowl.at.z), size, anchorY, up, lift));
    mesh.scaling.setAll(size);
    mesh.visibility = alpha;
    this.art.frame(mesh, frame, columns, rows);
  }

  private release(bowl: Bowl): void {
    this.freeMeshes(bowl);
    debug('visual.kimthien.status', { id: bowl.id ?? 'unconfirmed', ended: true });
  }

  private freeMeshes(bowl: Bowl): void {
    for (const mesh of Object.values(bowl.meshes)) this.art.release(mesh);
    bowl.meshes = {};
  }
}
