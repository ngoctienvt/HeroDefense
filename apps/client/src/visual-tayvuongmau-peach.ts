import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, TouchedLayers } from './visual-kit-layers.js';
import { placePin } from './visual-tayvuongmau-pin-strip.js';
import { BLESSING_FADE, BLESSING_RADIUS, blessingAlpha, PEACH_LENGTH, PEACH_LIFE, PEACH_WIDTH, peachHead, peachPose,
  SELF_PEACH_OFFSET } from './visual-tayvuongmau-timeline.js';

type Flight = { mesh?: Mesh; from: Vector3; to: Vector3; age: number; arrived: boolean; reduced: boolean; heading?: Vector3 };
type Blessing = { age: number; out: number; reduced: boolean };
const MAX_FLIGHTS = 12, MAX_BLESSINGS = 20;

/**
 * Bàn Đào Yến. One `peach-h01A` event per recipient (at most three): the cloud-tailed peach (Codex art) arcs from
 * the caster to the recipient, head first, then folds into them in .25 s with a heal pulse and rising petals. The caster
 * eating her own peach gets it from the side. The 5 s blessing (empower `peach`, snapshot marker) is a breathing peach
 * ring at the recipient's feet that eases out in .25 s when the buff ends. Attack/haste icons come from the shared marks.
 */
export class TayvuongmauPeach {
  private flights: Flight[] = [];
  private pool: LayerPool;
  private blessings: TouchedLayers<Blessing>;
  private serial = 0;

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'peach', `tayvuongmau-blessing-${this.serial++}`),
      MAX_BLESSINGS, 'tayvuongmau-blessing');
    this.blessings = new TouchedLayers(this.pool, () => ({ age: 0, out: 0, reduced: false }));
  }

  gift(from: Vector3, to: Vector3, hasOrigin: boolean, reduced: boolean): void {
    const self = !hasOrigin || Math.hypot(from.x - to.x, from.z - to.z) < .6;
    const start = self ? new Vector3(to.x - SELF_PEACH_OFFSET, 0, to.z) : from;
    if (reduced || this.flights.length >= MAX_FLIGHTS) {
      if (!reduced) debug('visual.tayvuongmau.cap', { layer: 'peach' });
      this.arrive(to, reduced);
      return;
    }
    this.flights.push({ from: start.clone(), to: to.clone(), age: 0, arrived: false, reduced });
  }

  /** Snapshot marker (every frame while the recipient has the peach buff). */
  mark(id: string, at: Vector3, reduced: boolean): void {
    const entry = this.blessings.touch(id);
    if (!entry) return;
    entry.state.reduced = reduced;
    entry.layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
    entry.layer.mesh.position.set(at.x, .05, at.z);
    entry.layer.mesh.scaling.setAll(BLESSING_RADIUS * 2);
  }

  tick(dt: number, time: number): void {
    const look = cameraLook(this.scene);
    for (let i = this.flights.length - 1; i >= 0; i--) this.fly(this.flights[i], dt, look);
    this.blessings.sweep(({ layer, state }, touched) => {
      if (touched) { state.age += dt; state.out = 0; } else state.out += dt;
      const m = layer.material;
      m.setFloat('uTime', time); m.setFloat('uFill', .14); m.setFloat('uRim', 1);
      m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0); m.setFloat('uSwirl', 0);
      m.setFloat('uAlpha', blessingAlpha(state.age, state.out, time, state.reduced));
      if (touched && !state.reduced && Math.random() < dt * 1.6) {
        this.bank.spray('peach').rise(new Vector3(layer.mesh.position.x, 0, layer.mesh.position.z), .9, 1);
      }
      return state.out >= BLESSING_FADE;
    });
  }

  clear(): void {
    for (const flight of [...this.flights]) this.free(flight);
    this.blessings.clear();
  }

  private fly(flight: Flight, dt: number, look: Vector3): void {
    flight.age += dt;
    if (flight.age >= PEACH_LIFE) { this.free(flight); return; }
    const pose = peachPose(flight.age);
    if (!flight.arrived && pose.t >= 1) { flight.arrived = true; this.arrive(flight.to, flight.reduced); }
    flight.mesh ??= this.art.acquire('peach');
    if (!flight.mesh) return;
    const a = peachHead(flight.from, flight.to, pose.t), b = peachHead(flight.from, flight.to, Math.min(1, pose.t + .03));
    const head = new Vector3(a.x, a.y, a.z);
    const direction = new Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
    // Landed (zero step): keep the last heading of the arc instead of dropping the strip.
    if (direction.lengthSquared() < 1e-6) direction.copyFrom(flight.heading ?? new Vector3(flight.to.x - flight.from.x, -.2, flight.to.z - flight.from.z));
    else flight.heading = direction.clone();
    if (!placePin(flight.mesh, head, direction, look, PEACH_LENGTH, PEACH_WIDTH, pose.length)) { this.free(flight); return; }
    flight.mesh.visibility = pose.alpha;
  }

  private arrive(to: Vector3, reduced: boolean): void {
    this.bank.ring(to, 1.7, 'peach', { life: .5, fill: .25, rim: 1, alpha: .85, hold: true, reduced, order: 5 });
    if (!reduced) this.bank.spray('peach').ring(new Vector3(to.x, 0, to.z), .5, 16, .6, 1, 2.4);
  }

  private free(flight: Flight): void {
    resetStrip(flight.mesh);
    this.art.release(flight.mesh);
    const index = this.flights.indexOf(flight);
    if (index >= 0) this.flights.splice(index, 1);
  }
}
