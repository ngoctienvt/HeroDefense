import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { bloomPose, CANOPY_ANCHOR_Y, CANOPY_COLUMNS, CANOPY_LIFE, CANOPY_LIFT, CANOPY_ROWS, CANOPY_SIZE, CAST_GRACE,
  gatherPose, HEAL_RADIUS } from './visual-bodhi-timeline.js';

type Slot = {
  source?: string; origin: Vector3; windup: number; reduced: boolean; age: number;
  phase: 'gather' | 'bloom'; bloomAge: number; mesh?: Mesh;
};
const MAX_SLOTS = 4;

/**
 * The sparse jade canopy over the caster. Windup (`cast`, .35 s): leaves and whisk threads gather into a canopy above his
 * head (art frames 0-3) while the R10 heal circle (server radius, centred on him) is outlined; it follows him until the
 * resolve (`caster` marker, every frame). Resolve (`ability`): the canopy opens in ~.2 s (frames 4-7), then the leaves
 * scatter and thin out (8-15) with leaves thrown from the circle's edge. A cast the server never resolves fades after its
 * windup + `CAST_GRACE` with no impact. Foreground pass: over monsters, under heroes; the canopy never hides a character.
 */
export class BodhiCanopy {
  private slots: Slot[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  begin(origin: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.bodhi.cap', { layer: 'canopy' }); return; }
    const length = Math.max(.05, windup);
    this.slots.push({ source, origin: origin.clone(), windup: length, reduced, age: 0, phase: 'gather', bloomAge: 0 });
    this.bank.ring(origin, HEAL_RADIUS, 'jade', { life: length + CAST_GRACE + .25, fill: .03, rim: 1, alpha: .55, hold: true,
      reduced, order: 4 });
    if (!reduced) this.bank.spray('jade').rise(origin, 1.8, 14);
  }

  /** The caster moved: the gathering canopy moves with him. */
  follow(source: string, at: Vector3): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'gather');
    if (slot) slot.origin.copyFrom(at);
  }

  /** Server resolve: returns true when a cast was running. */
  bloom(source: string | undefined, at: Vector3, reduced: boolean): boolean {
    let slot = this.slots.find(s => s.source === source && s.phase === 'gather');
    const hadCast = Boolean(slot);
    if (!slot) {
      if (this.slots.length >= MAX_SLOTS) { debug('visual.bodhi.cap', { layer: 'canopy' }); return false; }
      slot = { source, origin: at.clone(), windup: .25, reduced, age: 0, phase: 'gather', bloomAge: 0 };
      this.slots.push(slot);
    }
    slot.phase = 'bloom'; slot.bloomAge = 0; slot.reduced = reduced;
    this.bank.ring(slot.origin, HEAL_RADIUS, 'gold', { life: .5, fill: .02, rim: 1, alpha: .75, reduced, order: 5 });
    if (!reduced) {
      this.bank.spray('jade').ring(slot.origin, HEAL_RADIUS * .55, 46, 1.2, 4.2, 3.2);
      this.bank.spray('gold').ring(slot.origin, .8, 16, 1.8, 2.2, 2.6);
    }
    return hadCast;
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.phase === 'gather') {
        slot.age += dt;
        if (slot.age >= slot.windup + CAST_GRACE) {
          debug('visual.bodhi.cast.timeout', { windup: +slot.windup.toFixed(2) });
          this.free(slot);
          continue;
        }
        this.draw(slot, gatherPose(slot.age, slot.windup, slot.reduced), up);
      } else {
        slot.bloomAge += dt;
        if (slot.bloomAge >= (slot.reduced ? .32 : CANOPY_LIFE)) { this.free(slot); continue; }
        this.draw(slot, bloomPose(slot.bloomAge, slot.reduced), up);
      }
    }
  }

  clear(): void { for (const slot of [...this.slots]) this.free(slot); }

  private draw(slot: Slot, pose: { frame: number; scale: number; alpha: number }, up: Vector3): void {
    slot.mesh ??= this.art.acquire('canopy');
    const mesh = slot.mesh;
    if (!mesh) return;
    const size = CANOPY_SIZE * pose.scale;
    mesh.position.copyFrom(billboardCenter(new Vector3(slot.origin.x, 0, slot.origin.z), size, CANOPY_ANCHOR_Y, up, CANOPY_LIFT));
    mesh.scaling.setAll(size);
    mesh.visibility = pose.alpha;
    this.art.frame(mesh, pose.frame, CANOPY_COLUMNS, CANOPY_ROWS);
  }

  private drop(source?: string): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'gather');
    if (slot) this.free(slot);
  }

  private free(slot: Slot): void {
    this.art.release(slot.mesh);
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
