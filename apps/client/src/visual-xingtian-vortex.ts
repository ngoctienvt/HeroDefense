import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { burstPose, CAST_GRACE, groundBurstPose, groundWindupAlpha, GROUND_CENTRE_X, GROUND_CENTRE_Z, GROUND_LIFE,
  GROUND_SIZE_X, GROUND_SIZE_Z, PULL_PER_SECOND, RADIUS, REDUCED_BURST_LIFE, VORTEX_ANCHOR_Y, VORTEX_LIFE, VORTEX_SIZE,
  windupPose } from './visual-xingtian-timeline.js';

const MAX_SLOTS = 3, MAX_HIT_SPRAYS = 12;

type Slot = {
  source?: string; at: Vector3; windup: number; reduced: boolean; age: number; phase: 'wind' | 'burst'; burstAge: number;
  pull: number; vortex?: Mesh; ground?: Mesh;
};

/**
 * The cast around Hình Thiên. Windup (`cast skill-h011`, R6 around the caster, locked by the server): the Ma Hỏa rim lights
 * on the ground and embers are pulled in from it while the first four vortex frames open two arcs around the body (the actor
 * never moves). Resolve (`ability`): the hollow column swirls up around him (foreground pass: over monsters, under heroes),
 * the rim snaps bright and cools, a shock ring marks the R6 edge, ash flies out and each listed monster gets a small ash
 * burst (no burn: the blast applies none). An unconfirmed cast fades after its windup + `CAST_GRACE`, no fake impact.
 */
export class XingtianVortex {
  private slots: Slot[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  begin(at: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.drop(source);
    if (this.slots.length >= MAX_SLOTS) { debug('visual.xingtian.cap', { layer: 'vortex' }); return; }
    this.slots.push(this.slot(at, source, reduced, windup));
  }

  /** Server resolve. Returns true when a cast was running; with no cast (lobby, reconnect) the column starts from its swirl. */
  burst(source: string | undefined, at: Vector3, targets: readonly Vector3[], reduced: boolean): boolean {
    let slot = this.slots.find(s => s.source === source && s.phase === 'wind');
    const hadCast = Boolean(slot);
    if (!slot) {
      if (this.slots.length >= MAX_SLOTS) this.free(this.slots[0]);
      slot = this.slot(at, source, reduced, 0);
      this.slots.push(slot);
    }
    slot.phase = 'burst'; slot.burstAge = 0; slot.at.copyFrom(at); slot.reduced = reduced;
    this.bank.ring(at, RADIUS, 'warfire', { life: .5, fill: 0, rim: 1, alpha: .95, reduced, order: 6 });
    if (!reduced) {
      const spray = this.bank.spray('warfire');
      spray.ring(new Vector3(at.x, 0, at.z), 1.4, 46, .4, 7.5, 5.5);
      spray.ring(new Vector3(at.x, 0, at.z), RADIUS * .8, 30, .1, 1.8, 3.4);
      for (const target of targets.slice(0, MAX_HIT_SPRAYS)) spray.ring(target, .3, 9, .3, 3, 4.2);
    }
    return hadCast;
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.slots.length - 1; i >= 0; i--) {
      const slot = this.slots[i];
      if (slot.phase === 'wind') this.windTick(slot, dt, up); else this.burstTick(slot, dt, up);
    }
  }

  clear(): void { for (const slot of [...this.slots]) this.free(slot); }

  private windTick(slot: Slot, dt: number, up: Vector3): void {
    slot.age += dt;
    if (slot.age >= slot.windup + CAST_GRACE) {
      debug('visual.xingtian.cast.timeout', { windup: +slot.windup.toFixed(2) });
      this.free(slot);
      return;
    }
    const pose = windupPose(slot.age, slot.windup, slot.reduced);
    this.drawVortex(slot, up, pose.frame, pose.scale, pose.alpha);
    this.drawGround(slot, groundWindupAlpha(slot.age, slot.windup), 1);
    if (slot.reduced) return;
    slot.pull += PULL_PER_SECOND * dt;
    const count = Math.floor(slot.pull);
    slot.pull -= count;
    const spray = this.bank.spray('warfire');
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle), r = RADIUS * (.82 + .18 * Math.random());
      spray.trail(new Vector3(slot.at.x + c * r, .2 + Math.random() * 1.6, slot.at.z + s * r), new Vector3(-c * 9, 1.2, -s * 9), 1);
    }
  }

  private burstTick(slot: Slot, dt: number, up: Vector3): void {
    slot.burstAge += dt;
    const life = slot.reduced ? REDUCED_BURST_LIFE : Math.max(VORTEX_LIFE, GROUND_LIFE);
    if (slot.burstAge >= life) { this.free(slot); return; }
    const pose = burstPose(slot.burstAge, slot.reduced);
    if (pose.alpha > 0) this.drawVortex(slot, up, pose.frame, pose.scale, pose.alpha);
    else if (slot.vortex) { this.art.release(slot.vortex); slot.vortex = undefined; }
    const ground = groundBurstPose(slot.burstAge, slot.reduced);
    this.drawGround(slot, ground.alpha, ground.scale);
  }

  private drawVortex(slot: Slot, up: Vector3, frame: number, scale: number, alpha: number): void {
    slot.vortex ??= this.art.acquire('vortex');
    const mesh = slot.vortex;
    if (!mesh) return;
    const size = VORTEX_SIZE * scale;
    mesh.position.copyFrom(billboardCenter(new Vector3(slot.at.x, 0, slot.at.z), size, VORTEX_ANCHOR_Y, up));
    mesh.scaling.setAll(size);
    mesh.visibility = alpha;
    this.art.frame(mesh, frame, 4, 4);
  }

  private drawGround(slot: Slot, alpha: number, scale: number): void {
    slot.ground ??= this.art.acquire('ground', true);
    const mesh = slot.ground;
    if (!mesh) return;
    mesh.position.set(slot.at.x - GROUND_CENTRE_X * GROUND_SIZE_X, .06, slot.at.z + GROUND_CENTRE_Z * GROUND_SIZE_Z);
    mesh.scaling.set(GROUND_SIZE_X * scale, GROUND_SIZE_Z * scale, 1);
    mesh.visibility = alpha;
  }

  private drop(source?: string): void {
    const slot = this.slots.find(s => s.source === source && s.phase === 'wind');
    if (slot) this.free(slot);
  }

  private slot(at: Vector3, source: string | undefined, reduced: boolean, windup: number): Slot {
    return { source, at: at.clone(), windup, reduced, age: 0, phase: 'wind', burstAge: 0, pull: 0 };
  }

  private free(slot: Slot): void {
    this.art.release(slot.vortex); this.art.release(slot.ground);
    const index = this.slots.indexOf(slot);
    if (index >= 0) this.slots.splice(index, 1);
  }
}
