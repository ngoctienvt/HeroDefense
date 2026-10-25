import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { PhoenixArt } from './visual-phuong-hoang-art.js';
import type { PhoenixFlight } from './visual-phuong-hoang-flight.js';
import { BIRD_SIZE, flightPath, GATHER_SIZE, gatherFrame, projection, resolveDirection, sampleStrikes, strikeDelay,
  type XZ } from './visual-phuong-hoang-flight-math.js';
import { chargePose, phoenixDirection, SCORCH_SECONDS } from './visual-phuong-hoang-timeline.js';

type Charge = { body: Layer; rim: Layer; bird?: Mesh; origin: Vector3; dir?: XZ; age: number; windup: number;
  reduced: boolean; sparks: number };
type Scorch = { layer: Layer; age: number; reduced: boolean };
type Strike = { left: number; at: Vector3; main: boolean; reduced: boolean };

/**
 * Niết Bàn Phần Thiên Vũ in server order.
 * `cast` (windup): R9 telegraph at the locked point tightens while the bird gathers over the caster (sweep frames 0–3).
 * `ability`: the bird crosses the lane (PhoenixFlight); every known target, and the locked point, bursts when the bird
 * passes it (delay along the lane), with a feather hit, shock ring, scorch and spark spray. Damage itself is zone-wide
 * and instant on the server; delays only order the presentation. The carpet then lives from the snapshot (PhoenixGround).
 */
export class PhoenixUltimate {
  private chargePool: LayerPool;
  private scorchPool: LayerPool;
  private charges = new Map<string, Charge>();
  private scorches: Scorch[] = [];
  private strikes: Strike[] = [];
  private serial = 0;
  constructor(private scene: Scene, private art: PhoenixArt, private flight: PhoenixFlight, private bank: KitFxBank) {
    const layer = (kind: string) => createGroundLayer(scene, 'kitGround', 'phoenix', `phoenix-${kind}-${this.serial++}`);
    this.chargePool = new LayerPool(() => layer('charge'), 8, 'phoenix-charge');
    this.scorchPool = new LayerPool(() => layer('scorch'), 32, 'phoenix-scorch');
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): void {
    const windup = event.windup;
    if (!event.source || typeof windup !== 'number' || !Number.isFinite(windup) || windup <= 0
      || !Number.isFinite(at.x) || !Number.isFinite(at.z)) {
      debug('visual.phoenix.cast.skip', { eventId: event.id, reason: 'missing-server-windup-or-source' }); return;
    }
    this.cancel(event.source);
    const body = this.chargePool.acquire(), rim = this.chargePool.acquire();
    if (!body || !rim) {
      if (body) this.chargePool.release(body);
      if (rim) this.chargePool.release(rim);
      return;
    }
    for (const layer of [body, rim]) {
      layer.mesh.position.set(at.x, .06, at.z); layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    }
    rim.mesh.scaling.setAll(P.radius * 2);
    const from = origin?.clone() ?? at.clone();
    const dir = phoenixDirection(event, from);
    this.charges.set(event.source, { body, rim, origin: from, dir, age: 0, windup, reduced, sparks: 0,
      bird: this.art.planes.acquire('sweep') });
    debug('visual.phoenix.cast', { eventId: event.id, windup, radius: P.radius, reduced, bird: this.charges.get(event.source)?.bird !== undefined });
  }

  impact(event: GameEvent, origin: Vector3, at: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    const charge = event.source ? this.charges.get(event.source) : undefined;
    if (event.source) this.cancel(event.source);
    // The ability event has no direction: reuse the cast's (kept in the charge), else derive it from the real points.
    const right = this.scene.activeCamera?.getDirection(Vector3.Right());
    const dir = resolveDirection(charge?.dir, origin, at, targets, right ? { x: right.x, z: right.z } : { x: 1, z: 0 });
    const path = flightPath(origin, dir, at, targets);
    this.flight.start(path, reduced, at);
    const shown = sampleStrikes(targets, origin, dir);
    for (const target of shown) this.schedule(target, projection(origin, dir, target), path.length, false, reduced);
    this.schedule(at, projection(origin, dir, at), path.length, true, reduced);
    debug('visual.phoenix.impact', { eventId: event.id, targets: targets.length, renderedTargets: shown.length,
      radius: P.radius, lane: Math.round(path.length), reduced });
  }

  private schedule(at: Vector3, along: number, length: number, main: boolean, reduced: boolean): void {
    const left = reduced ? 0 : Math.max(0, strikeDelay(Math.max(0, along), length));
    this.strikes.push({ left, at: at.clone(), main, reduced });
  }

  /** The bird passes the point: feather burst, ring, scorch and sparks at one instant. */
  private fire(strike: Strike): void {
    const { at, main, reduced } = strike;
    this.art.hit(at, reduced, main ? 9 : 4.8);
    this.scorch(at, main ? 5 : 2.6, reduced);
    if (reduced) return;
    const spray = this.bank.spray('phoenix');
    if (main) {
      // The locked point is where the carpet is born: a shock ring races out to the real R9.
      this.bank.ring(at, P.radius, 'phoenix', { life: .6, fill: .12, rim: 1, swirl: 1, alpha: .9, order: 5 });
      spray.ring(at, 1.4, 28, .6, 3.2, 5);
    } else {
      this.bank.ring(at, 1.8, 'phoenix', { life: .4, fill: .2, rim: 1, alpha: .85, order: 5 });
      spray.ring(at, .4, 6, .5, 1.9, 3);
    }
  }

  private scorch(at: Vector3, diameter: number, reduced: boolean): void {
    const layer = this.scorchPool.acquire();
    if (!layer) return;
    layer.mesh.position.set(at.x, .035, at.z); layer.mesh.scaling.setAll(diameter);
    layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
    this.scorches.push({ layer, age: 0, reduced });
  }

  tick(dt: number, time: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      this.strikes[i].left -= dt;
      if (this.strikes[i].left <= 0) { this.fire(this.strikes[i]); this.strikes.splice(i, 1); }
    }
    for (const [source, entry] of this.charges) this.tickCharge(source, entry, dt);
    for (let i = this.scorches.length - 1; i >= 0; i--) {
      const entry = this.scorches[i]; entry.age += dt;
      if (entry.age >= SCORCH_SECONDS) { this.scorchPool.release(entry.layer); this.scorches.splice(i, 1); continue; }
      const m = entry.layer.material;
      m.setFloat('uTime', entry.reduced ? 0 : time); m.setFloat('uAlpha', .75 * Math.min(1, (SCORCH_SECONDS - entry.age) / .25));
      m.setFloat('uFill', .8); m.setFloat('uRim', .3); m.setFloat('uBand', 0);
      m.setFloat('uSpiral', 0); m.setFloat('uSwirl', 0); m.setFloat('uRings', 0);
    }
  }

  private tickCharge(source: string, entry: Charge, dt: number): void {
    entry.age += dt;
    if (entry.age > entry.windup + .3) { this.cancel(source); return; }
    const pose = chargePose(entry.age, entry.windup, entry.reduced);
    entry.body.mesh.scaling.setAll(P.radius * 2 * pose.scale);
    for (const layer of [entry.body, entry.rim]) {
      const rim = layer === entry.rim, m = layer.material;
      m.setFloat('uTime', entry.reduced ? 0 : entry.age);
      m.setFloat('uAlpha', rim ? .55 + .35 * pose.power : pose.alpha);
      m.setFloat('uFill', rim ? 0 : .25 + .5 * pose.power); m.setFloat('uRim', rim ? .95 : .35);
      m.setFloat('uBand', 0); m.setFloat('uSpiral', rim || entry.reduced ? 0 : .2 + .5 * pose.power);
      m.setFloat('uSwirl', entry.reduced ? 0 : .9); m.setFloat('uRings', 0);
    }
    if (entry.bird) {
      this.art.planes.frame(entry.bird, entry.reduced ? 2 : gatherFrame(pose.power), 4, 4);
      const size = GATHER_SIZE + (BIRD_SIZE * .55 - GATHER_SIZE) * pose.power;
      this.art.place(entry.bird, 'sweep', entry.origin, size, 1, 1.6 + 1.2 * pose.power);
      entry.bird.visibility = .35 + .65 * pose.power;
    }
    if (!entry.reduced) {
      entry.sparks += dt * 34 * pose.power;
      const count = Math.floor(entry.sparks); entry.sparks -= count;
      if (count) this.bank.spray('phoenix').rise(entry.origin, 2.2 + pose.power, Math.min(count, 8));
    }
  }

  private cancel(source: string): void {
    const entry = this.charges.get(source);
    if (!entry) return;
    this.chargePool.release(entry.body); this.chargePool.release(entry.rim); this.art.planes.release(entry.bird);
    this.charges.delete(source);
  }

  clear(): void {
    for (const source of [...this.charges.keys()]) this.cancel(source);
    this.scorches.length = 0; this.strikes.length = 0;
    this.chargePool.releaseAll(); this.scorchPool.releaseAll();
  }
}
