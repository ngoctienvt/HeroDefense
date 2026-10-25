import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { PhoenixArt, PhoenixArtId } from './visual-phuong-hoang-art.js';
import { flameLayout, IGNITE_FOREGROUND_SECONDS, rainLayout } from './visual-phuong-hoang-flight-math.js';
import { carpetPose, flameFrame, rainFrame, validPhoenixGround } from './visual-phuong-hoang-timeline.js';
import layout from './visual-phuong-hoang-layout.json';

type Slot = { mesh?: Mesh; id?: PhoenixArtId };
type Ground = { at: Vector3; radius: number; remaining: number; rain: number; reduced: boolean;
  touched: boolean; clock: number; flow: number; sparks: number; heal: number; rim: Layer; floor?: Mesh;
  flames: Slot[]; feathers: Slot[]; ending: boolean };

/**
 * Snapshot is authoritative for both clocks; reconnect never restarts the four/six-second effects.
 * Layers: shader lava floor + painted decal (world), a ring of carpet fire on the R boundary + inner fires (foreground
 * for the first 0.9 s of ignition, then world so they do not blanket the enemies for six seconds), nine feather-rain
 * clusters over the whole radius (foreground, only while `rainRemaining` > 0) and jade motes rising where allies heal.
 */
export class PhoenixGround {
  private entries = new Map<string, Ground>();
  private pool: LayerPool;
  private serial = 0;
  constructor(scene: Scene, private art: PhoenixArt, private bank: KitFxBank) {
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'phoenix', `phoenix-boundary-${this.serial++}`), 4, 'phoenix-ground');
  }

  mark(id: string, at: Vector3, radius: number, remaining: number, rain: number, reduced: boolean): void {
    if (!validPhoenixGround(radius, remaining, rain) || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    let entry = this.entries.get(id);
    if (!entry) {
      const rim = this.pool.acquire();
      if (!rim) return;
      entry = { at: at.clone(), radius, remaining, rain, reduced, touched: true,
        clock: Math.max(0, P.carpetSeconds - remaining), flow: 0, sparks: 0, heal: 0, rim,
        flames: [], feathers: [], ending: false };
      this.entries.set(id, entry);
      debug('visual.phoenix.ground.start', { radius, remaining, rainRemaining: rain, reduced });
    }
    Object.assign(entry, { radius, remaining, rain, reduced, touched: true });
    entry.at.copyFrom(at);
  }

  tick(dt: number): void {
    for (const [id, entry] of this.entries) {
      if (!entry.touched || entry.remaining <= 0) { this.release(entry); this.entries.delete(id); continue; }
      entry.touched = false; entry.clock += dt;
      const pose = carpetPose(entry.remaining, entry.reduced);
      entry.flow += dt * (1 + pose.end * 3);
      this.floor(entry, pose);
      this.flames(entry, pose);
      this.rain(entry);
      if (pose.end > 0 && !entry.ending) {
        entry.ending = true;
        debug('visual.phoenix.ground.extinguish', { remaining: entry.remaining, radius: entry.radius });
      }
      if (!entry.reduced) this.motes(entry, pose, dt);
    }
  }

  private floor(entry: Ground, pose: ReturnType<typeof carpetPose>): void {
    const { mesh, material: m } = entry.rim;
    mesh.position.set(entry.at.x, .055, entry.at.z); mesh.scaling.setAll(entry.radius * 2);
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 6;
    m.setFloat('uTime', entry.reduced ? 0 : entry.flow);
    m.setFloat('uAlpha', .85 * (1 - .6 * pose.end)); m.setFloat('uFill', .3 * pose.intro);
    m.setFloat('uRim', .95); m.setFloat('uBand', 0); m.setFloat('uRings', 0);
    m.setFloat('uSwirl', entry.reduced ? 0 : .6); m.setFloat('uSpiral', entry.reduced ? 0 : .12 + .5 * pose.end);
    entry.floor ??= this.art.planes.acquire('carpet', true);
    if (!entry.floor) return;
    const size = entry.radius * 2 / layout.carpet.radialEdge;
    entry.floor.scaling.set(size, size, 1); entry.floor.position.set(entry.at.x, .04, entry.at.z);
    entry.floor.visibility = .9 * pose.intro * (1 - .85 * pose.end);
  }

  private flames(entry: Ground, pose: ReturnType<typeof carpetPose>): void {
    const front = entry.clock < IGNITE_FOREGROUND_SECONDS && !entry.reduced;
    flameLayout(entry.radius).forEach((spot, i) => {
      const slot = entry.flames[i] ??= {};
      const id: PhoenixArtId = front ? 'flameFront' : 'flame';
      if (slot.id !== id) { this.art.planes.release(slot.mesh); slot.mesh = this.art.planes.acquire(id); slot.id = id; }
      if (!slot.mesh) return;
      const fold = 1 - pose.end * .65;
      const at = entry.at.add(new Vector3(spot.dx * fold, 0, spot.dz * fold));
      this.art.planes.frame(slot.mesh, pose.end > 0 ? 7 : flameFrame(entry.clock + spot.phase * .13, entry.reduced), 4, 2);
      // Ignition: flames swell up from the ground over the first 0.3 s instead of popping in.
      const rise = entry.reduced ? 1 : Math.min(1, .35 + entry.clock / .3);
      this.art.place(slot.mesh, id, at, spot.size, pose.flameHeight * rise, pose.emberLift);
      slot.mesh.visibility = .9 * pose.intro;
    });
  }

  private rain(entry: Ground): void {
    const frame = rainFrame(entry.rain, entry.clock, entry.reduced);
    if (frame === undefined) {
      for (const slot of entry.feathers) this.art.planes.release(slot.mesh);
      entry.feathers.length = 0;
      return;
    }
    rainLayout(entry.radius).forEach((spot, i) => {
      const slot = entry.feathers[i] ??= { mesh: this.art.planes.acquire('rain'), id: 'rain' };
      slot.mesh ??= this.art.planes.acquire('rain');
      if (!slot.mesh) return;
      // Same opening/closing phase everywhere; only the hold loop is staggered.
      const localFrame = frame >= 4 && frame < 12 ? 4 + (frame - 4 + spot.phase) % 8 : frame;
      this.art.planes.frame(slot.mesh, localFrame, 4, 4);
      this.art.place(slot.mesh, 'rain', entry.at.add(new Vector3(spot.dx, 0, spot.dz)), spot.size);
      slot.mesh.visibility = entry.reduced ? .65 : .85;
    });
  }

  /** Jade life motes where the carpet heals, and embers rising inward as the fire folds. */
  private motes(entry: Ground, pose: ReturnType<typeof carpetPose>, dt: number): void {
    entry.heal += dt * 9;
    const heal = Math.floor(entry.heal); entry.heal -= heal;
    if (heal && pose.end === 0) this.bank.spray('jade').rise(entry.at, entry.radius * .85, Math.min(heal, 3));
    if (pose.end > 0) {
      // An emission accumulator keeps 30/60/144Hz at the same budget; no per-frame probability.
      entry.sparks += dt * 34;
      const count = Math.floor(entry.sparks); entry.sparks -= count;
      if (count) this.bank.spray('phoenix').rise(entry.at, entry.radius * .45 * (1 - pose.end * .5), Math.min(count, 14));
    }
  }

  private release(entry: Ground): void {
    this.pool.release(entry.rim); this.art.planes.release(entry.floor);
    for (const slot of [...entry.flames, ...entry.feathers]) this.art.planes.release(slot.mesh);
    debug('visual.phoenix.ground.end', { remaining: entry.remaining, rainRemaining: entry.rain });
  }

  clear(): void {
    for (const entry of this.entries.values()) this.release(entry);
    this.entries.clear(); this.pool.releaseAll();
  }
}
