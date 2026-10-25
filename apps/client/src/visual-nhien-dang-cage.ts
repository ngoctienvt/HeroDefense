import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { activeLook, ARRAY_SIZE, arrayAlpha, CAGE_LIFT, CAGE_RADIUS, CAGE_SECONDS, CAST_GRACE, CHARGE_LIFT, chargeLook, FLAME_FOOT, FLAME_SIZE,
  flameFrame, PEARL_ASPECT, PEARL_COUNT, PEARL_HEIGHT, type PearlLook, RELEASE_SECONDS, releaseLook, SLOTS,
  UNMARKED_GRACE } from './visual-nhien-dang-timeline.js';

type Cell = { pearl?: Mesh; flame?: Mesh; frame: number };
type Cage = {
  source: string; center: Vector3; phase: 'charge' | 'active' | 'release'; age: number; windup: number; activeAge: number;
  releaseAge: number; remaining?: number; scale: number; marked: boolean; touched: boolean; reduced: boolean; joined: number;
  cells: Cell[]; decal?: Mesh;
};
/** Two casters at once is already unusual; each cage is 24 pearls + 24 flames + one decal. */
const MAX_CAGES = 2;

/**
 * The 24 Định Hải Thần Châu as meshes of their own (one painted plane per pearl and per lamp flame, pooled), never one
 * billboard pasted over the field. Windup (`begin`, followed by the `caster` marker): the lamps light one after another
 * round the two rings and the pearls brighten. Resolve (`resolve`): pearls lift into the cage, the array decal marks the
 * 24 slots on the ground. Held by the server's `lantern-cage` ground snapshot (`mark`, every frame); when it stops,
 * the pearls come down and draw in to the centre in 0.35 s while the flames fold. An unconfirmed cast fades after its
 * windup + `CAST_GRACE` with no impact. Foreground pass: over monsters, under heroes.
 */
export class NhienDangCage {
  private cages = new Map<string, Cage>();
  private up = new Vector3(0, 1, 0);

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  has(source: string): boolean { return this.cages.has(source); }

  begin(source: string, center: Vector3, windup: number, reduced: boolean): void {
    this.free(this.cages.get(source));
    if (this.cages.size >= MAX_CAGES) { debug('visual.nhiendang.cap', { layer: 'cage' }); return; }
    this.cages.set(source, this.make(source, center, 'charge', reduced, Math.max(.05, windup)));
  }

  /** The caster shifted during the windup: the lit array shifts with him. */
  follow(source: string, at: Vector3): void {
    const cage = this.cages.get(source);
    if (cage?.phase === 'charge') cage.center.copyFrom(at);
  }

  /** Server resolve; true when a cast was running. Without one (lobby, reconnect) the cage forms from rest at the point. */
  resolve(source: string, center: Vector3, reduced: boolean): boolean {
    const cage = this.cages.get(source);
    if (cage?.phase === 'charge') {
      cage.phase = 'active'; cage.activeAge = 0; cage.center.copyFrom(center); cage.reduced = reduced;
      return true;
    }
    if (cage?.phase === 'active') return false;
    this.free(cage);
    if (this.cages.size >= MAX_CAGES) { debug('visual.nhiendang.cap', { layer: 'cage' }); return false; }
    const made = this.make(source, center, 'active', reduced, 0);
    made.joined = 0;
    this.cages.set(source, made);
    return false;
  }

  /** Ground snapshot `lantern-cage` (every frame): keeps the cage alive; joins late (reconnect) with the cage already formed. */
  mark(source: string, at: Vector3, remaining: number, radius: number, reduced: boolean): void {
    let cage = this.cages.get(source);
    if (!cage || cage.phase === 'release') {
      this.free(cage);
      if (this.cages.size >= MAX_CAGES) return;
      cage = this.make(source, at, 'active', reduced, 0);
      cage.activeAge = 1; cage.joined = 0;
      this.cages.set(source, cage);
      debug('visual.nhiendang.status', { phase: 'late-join', remaining: +remaining.toFixed(2) });
    }
    if (!cage.marked) cage.center.copyFrom(at);
    cage.marked = true; cage.touched = true; cage.remaining = remaining;
    // The array is drawn for R7; a different snapshot radius scales it so nothing leaves the gameplay edge.
    cage.scale = Math.max(.5, Math.min(1.5, radius / CAGE_RADIUS));
  }

  /** World position of the pearl of `source`'s cage nearest to `to`; undefined without a formed cage. */
  pearlNear(source: string, to: Vector3): Vector3 | undefined {
    const cage = this.cages.get(source);
    if (!cage || cage.phase === 'release') return undefined;
    let best: Vector3 | undefined, bestDistance = Infinity;
    for (const slot of SLOTS) {
      const feet = new Vector3(cage.center.x + slot.dx * cage.scale, 0, cage.center.z + slot.dz * cage.scale);
      const d = Vector3.DistanceSquared(feet, to);
      if (d < bestDistance) { bestDistance = d; best = billboardCenter(feet, 0, .5, this.up, cage.phase === 'charge' ? CHARGE_LIFT + .25 : CAGE_LIFT[slot.ring]); }
    }
    return best;
  }

  tick(dt: number, time: number, up: Vector3): void {
    this.up = up;
    for (const cage of [...this.cages.values()]) {
      cage.joined += dt;
      if (cage.phase === 'charge') {
        cage.age += dt;
        if (cage.age >= cage.windup + CAST_GRACE) { debug('visual.nhiendang.cast.timeout', { windup: +cage.windup.toFixed(2) }); this.free(cage); continue; }
      } else if (cage.phase === 'active') {
        cage.activeAge += dt;
        const lost = cage.marked ? !cage.touched : cage.activeAge > CAGE_SECONDS + UNMARKED_GRACE;
        cage.touched = false;
        if (lost) { cage.phase = 'release'; cage.releaseAge = 0; debug('visual.nhiendang.release', { marked: cage.marked }); }
      } else {
        cage.releaseAge += dt;
        if (cage.releaseAge >= RELEASE_SECONDS) { this.free(cage); continue; }
      }
      this.draw(cage, time);
      if (!cage.reduced && cage.phase !== 'release' && Math.random() < dt * 20) this.ember(cage);
    }
  }

  clear(): void { for (const cage of [...this.cages.values()]) this.free(cage); }

  private make(source: string, center: Vector3, phase: Cage['phase'], reduced: boolean, windup: number): Cage {
    return { source, center: center.clone(), phase, age: 0, windup, activeAge: 0, releaseAge: 0, scale: 1, marked: false, touched: false,
      reduced, joined: 1, cells: SLOTS.map(() => ({ frame: -1 })) };
  }

  private look(cage: Cage, i: number, time: number): PearlLook {
    const slot = SLOTS[i];
    if (cage.phase === 'charge') return chargeLook(cage.age, cage.windup, slot, cage.reduced);
    if (cage.phase === 'active') return activeLook(cage.activeAge, time, slot, cage.remaining, cage.reduced);
    return releaseLook(cage.releaseAge, slot, cage.reduced);
  }

  private draw(cage: Cage, time: number): void {
    const fade = Math.min(1, cage.joined / .25);
    for (let i = 0; i < PEARL_COUNT; i++) {
      const slot = SLOTS[i], cell = cage.cells[i], look = this.look(cage, i, time);
      const pull = (1 - look.pull) * cage.scale;
      const feet = new Vector3(cage.center.x + slot.dx * pull, 0, cage.center.z + slot.dz * pull);
      cell.flame ??= this.art.acquire('flame');
      if (cell.flame) {
        const size = FLAME_SIZE * Math.max(.01, look.flameScale);
        cell.flame.position.copyFrom(billboardCenter(feet, size, FLAME_FOOT, this.up));
        cell.flame.scaling.set(size, size, 1);
        cell.flame.visibility = look.flameAlpha * fade;
        const frame = flameFrame(time, slot, cage.reduced);
        if (frame !== cell.frame) { cell.frame = frame; this.art.frame(cell.flame, frame, 4, 2); }
      }
      cell.pearl ??= this.art.acquire('pearl');
      if (cell.pearl) {
        const height = PEARL_HEIGHT * Math.max(.01, look.scale);
        cell.pearl.position.copyFrom(billboardCenter(feet, height, .5, this.up, look.lift));
        cell.pearl.scaling.set(height * PEARL_ASPECT, height, 1);
        cell.pearl.visibility = look.alpha * fade;
        cell.pearl.alphaIndex = GROUND_ALPHA_INDEX + 9; // pearls over their own lamp flame
      }
    }
    this.drawDecal(cage);
  }

  private drawDecal(cage: Cage): void {
    if (cage.phase === 'charge') return;
    cage.decal ??= this.art.acquire('array', true);
    if (!cage.decal) return;
    cage.decal.position.set(cage.center.x, .05, cage.center.z);
    cage.decal.scaling.setAll(ARRAY_SIZE * cage.scale);
    cage.decal.visibility = arrayAlpha(cage.activeAge, cage.phase === 'release' ? cage.releaseAge : undefined);
  }

  /** One ivory-amber mote rising off a random lamp. */
  private ember(cage: Cage): void {
    const slot = SLOTS[Math.floor(Math.random() * PEARL_COUNT)];
    this.bank.spray('lantern').trail(new Vector3(cage.center.x + slot.dx * cage.scale, .6, cage.center.z + slot.dz * cage.scale), new Vector3(0, 2.2, 0), 1);
  }

  private free(cage: Cage | undefined): void {
    if (!cage) return;
    for (const cell of cage.cells) { this.art.release(cell.pearl); this.art.release(cell.flame); }
    this.art.release(cage.decal);
    this.cages.delete(cage.source);
  }
}
