import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { placeSilk } from './visual-hangnga-strip.js';
import { revealFraction, revealUvs, SILK_ASPECT, silkLength, silkPoint, silkPose } from './visual-hangnga-timeline.js';
import type { SharedStatusFx } from './visual-shared-status.js';

type Flight = { mesh?: Mesh; from: Vector3; to: Vector3; age: number; distance: number; scale: number; arrived: boolean;
  heading?: Vector3; onArrive: () => void };
const MAX_FLIGHTS = 16;

/**
 * Phase 1-2 silk. One ribbon (Codex art, crescent head on +X) flies from the caster to every other ally in R9,5 the
 * server listed: its head arcs over the field at chest height with the visible length revealed (UV + plane length
 * together, never stretched), lands on the ally and folds away in .25 s. The landing is the heal: the shared heal
 * sheet, a faint footprint ring, rising moon motes and frost dust. The basic moonbeam reuses it at .55 scale.
 */
export class HangngaSilk {
  private flights: Flight[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank, private status: SharedStatusFx) {}

  /** Flight caster → ally; reduced motion or a full pool lands at once. `onArrive` runs once, at the landing. */
  send(from: Vector3, to: Vector3, reduced: boolean, onArrive: () => void, scale = 1): void {
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const full = this.flights.length >= MAX_FLIGHTS;
    if (reduced || distance < .05 || full) {
      if (full) debug('visual.hangnga.cap', { layer: 'silk' });
      onArrive();
      return;
    }
    this.flights.push({ from: from.clone(), to: to.clone(), age: 0, distance, scale, arrived: false, onArrive });
  }

  /** What an ally receives: shared heal sheet, faint footprint, moon motes and frost dust. */
  receive(at: Vector3, reduced: boolean): void {
    this.status.play('heal', at, reduced);
    this.bank.ring(at, 1.5, 'moon', { life: .7, fill: .16, rim: .8, alpha: .7, hold: true, reduced, order: 5 });
    if (reduced) return;
    const ground = new Vector3(at.x, 0, at.z);
    this.bank.spray('moon').rise(ground, .9, 14);
    this.bank.spray('frost').ring(ground, .5, 10, .4, .8, 1.6);
  }

  tick(dt: number): void {
    const look = cameraLook(this.scene);
    for (let i = this.flights.length - 1; i >= 0; i--) this.fly(this.flights[i], dt, look);
  }

  clear(): void {
    for (const flight of [...this.flights]) this.free(flight);
  }

  private fly(flight: Flight, dt: number, look: Vector3): void {
    flight.age += dt;
    const pose = silkPose(flight.age);
    if (pose.done) { this.free(flight); return; }
    if (!flight.arrived && pose.arrived) { flight.arrived = true; flight.onArrive(); }
    flight.mesh ??= this.art.acquire('silk');
    const mesh = flight.mesh;
    if (!mesh) return;
    const a = silkPoint(flight.from, flight.to, pose.progress), b = silkPoint(flight.from, flight.to, Math.min(1, pose.progress + .03));
    const direction = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    // Landed (zero step): keep the last heading instead of dropping the strip.
    if (direction.lengthSquared() < 1e-6) direction.copyFrom(flight.heading ?? new Vector3(flight.to.x - flight.from.x, 0, flight.to.z - flight.from.z));
    else flight.heading = direction.clone();
    const full = silkLength(flight.distance) * pose.lengthScale * flight.scale;
    const fraction = revealFraction(pose.progress * flight.distance, full);
    this.art.mapUvs(mesh, base => revealUvs(base, fraction));
    if (!placeSilk(mesh, new Vector3(a.x, a.y, a.z), direction, look, full * fraction, full / SILK_ASPECT)) { this.free(flight); return; }
    mesh.visibility = pose.alpha;
  }

  private free(flight: Flight): void {
    resetStrip(flight.mesh);
    this.art.release(flight.mesh);
    const index = this.flights.indexOf(flight);
    if (index >= 0) this.flights.splice(index, 1);
  }
}
