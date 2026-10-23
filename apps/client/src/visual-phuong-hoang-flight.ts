import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { paintedFrameUvs } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import type { PhoenixArt } from './visual-phuong-hoang-art.js';
import { BIRD_SIZE, birdFrame, birdVisibility, FLIGHT_SECONDS, flightProgress, GHOST_LAGS, GHOST_VISIBILITY,
  type FlightPath } from './visual-phuong-hoang-flight-math.js';

const MAX_FLIGHTS = 3;
/** Raises the bird's body over the lane so it flies above the crowd instead of through their feet. */
const BIRD_LIFT = 1.6;
type Flight = { path: FlightPath; age: number; mirror: boolean; reduced: boolean; trail: number;
  meshes: (Mesh | undefined)[] };

/**
 * The Phượng Hoàng crossing the lane: one large bird (foreground, over monsters, under heroes) with three lagging
 * after-images from earlier wing poses, an ember trail and a burning ground wake along the whole path.
 * Reduced motion shows the bird as a single still frame at the locked point for a short moment.
 */
export class PhoenixFlight {
  private flights: Flight[] = [];
  constructor(private scene: Scene, private art: PhoenixArt, private bank: KitFxBank, private spray: KitSpray) {}

  start(path: FlightPath, reduced: boolean, anchor: Vector3): void {
    if (this.flights.length >= MAX_FLIGHTS) { debug('visual.phoenix.cap', { layer: 'flight' }); return; }
    const right = this.scene.activeCamera?.getDirection(Vector3.Right());
    const mirror = Boolean(right && path.dir.x * right.x + path.dir.z * right.z < 0);
    const flight: Flight = { path, age: 0, mirror, reduced, trail: 0, meshes: [] };
    if (reduced) { flight.path = { ...path, start: { x: anchor.x, z: anchor.z }, length: 0 }; }
    this.flights.push(flight);
    if (!reduced) {
      const from = new Vector3(path.start.x, 0, path.start.z), to = new Vector3(path.end.x, 0, path.end.z);
      // Wake: a hot lane burning along the bird's whole route, first as a streak, then cooling.
      this.bank.ribbon(from, to, 'phoenix', { life: FLIGHT_SECONDS + .35, width: 4.4, wave: .35, taper: .5, height: .07,
        maxSpan: 22 });
      this.bank.ribbon(from, to, 'gold', { life: FLIGHT_SECONDS, width: 1.5, wave: .2, taper: .8, height: .09, maxSpan: 12 });
    }
    debug('visual.phoenix.flight', { length: Math.round(path.length), reduced, mirror });
  }

  tick(dt: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const flight = this.flights[i];
      flight.age += dt;
      const life = flight.reduced ? .35 : FLIGHT_SECONDS + GHOST_LAGS[GHOST_LAGS.length - 1];
      if (flight.age >= life) { this.free(flight); this.flights.splice(i, 1); continue; }
      this.draw(flight);
      if (!flight.reduced) this.emit(flight, dt);
    }
  }

  private draw(flight: Flight): void {
    const lags = flight.reduced ? [0] : [0, ...GHOST_LAGS];
    lags.forEach((lag, index) => {
      const t = (flight.age - lag) / FLIGHT_SECONDS;
      const visible = flight.reduced || (t > 0 && t < 1);
      let mesh = flight.meshes[index];
      if (!visible) { mesh?.setEnabled(false); return; }
      mesh ??= flight.meshes[index] = this.art.planes.acquire('sweep');
      if (!mesh) return;
      mesh.setEnabled(true);
      const frame = flight.reduced ? 6 : birdFrame(t);
      this.art.planes.mapUvs(mesh, base => paintedFrameUvs(
        base.map((v, k) => flight.mirror && k % 2 === 0 ? 1 - v : v), frame, 4, 4) ?? [...base]);
      const head = this.head(flight, flight.reduced ? 0 : flightProgress(t));
      this.art.place(mesh, 'sweep', head, flight.reduced ? BIRD_SIZE * .55 : BIRD_SIZE, 1, BIRD_LIFT);
      mesh.alphaIndex = GROUND_ALPHA_INDEX + 9 - index;
      mesh.visibility = flight.reduced ? .85 : (index === 0 ? birdVisibility(t) : GHOST_VISIBILITY[index - 1]);
    });
  }

  private head(flight: Flight, progress: number): Vector3 {
    const { start, dir, length } = flight.path;
    return new Vector3(start.x + dir.x * length * progress, 0, start.z + dir.z * length * progress);
  }

  /** Embers shed behind the head at a fixed rate (accumulator keeps 30/60/144 Hz at one budget). */
  private emit(flight: Flight, dt: number): void {
    const t = flight.age / FLIGHT_SECONDS;
    if (t <= 0 || t >= 1) return;
    flight.trail += dt * 70;
    const count = Math.min(10, Math.floor(flight.trail)); flight.trail -= count;
    if (!count) return;
    const head = this.head(flight, flightProgress(t)); head.y = 1.4;
    const { dir } = flight.path;
    this.spray.trail(head, new Vector3(-dir.x * 4, 1.6, -dir.z * 4), count);
  }

  private free(flight: Flight): void { for (const mesh of flight.meshes) this.art.planes.release(mesh); flight.meshes.length = 0; }

  clear(): void { for (const flight of this.flights) this.free(flight); this.flights.length = 0; }
}
