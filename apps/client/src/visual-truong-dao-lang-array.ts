import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import { segmentFrame } from './visual-kit-timeline.js';
import { arrayFrame, ARRAY_PLANE_HEIGHT, ARRAY_PLANE_SIZE, castArrayPose, charge, iceShatter, iceSpread,
  sealPose, SEAL_GROUND_SIZE, zoneAlpha, zoneArrayPose, zoneStartAge, type Pose } from './visual-truong-dao-lang-timeline.js';

type Parts = { rim: Layer; seal?: Mesh; air?: Mesh; ice?: Layer };
type Cast = Parts & { at: Vector3; age: number; windup: number; reduced: boolean; source?: string };
type Zone = Parts & { age: number; touched: boolean; shattered: boolean };
const MAX_ZONES = 8, MAX_CASTS = 4;

/**
 * Bắc Đẩu Trận body: radius-9 rim shader + painted seal on the ground, the five-sword sheet in the air,
 * a black-ice crust over the frozen area. Windup → slam → hold (server zone remaining) → lift away and shatter.
 */
export class TruongArray {
  private rims: LayerPool;
  private crusts: LayerPool;
  private casts: Cast[] = [];
  private zones = new Map<string, Zone>();

  constructor(scene: Scene, private art: KitPainted, private bank: KitFxBank) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'ice', `beidou-rim-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_ZONES + MAX_CASTS, 'beidou-rims');
    this.crusts = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitCrust', 'ice', `beidou-ice-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      return layer;
    }, MAX_ZONES, 'beidou-ice');
  }

  cast(at: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.release(source);
    if (this.casts.length >= MAX_CASTS) { debug('visual.beidou.cap', { layer: 'cast' }); return; }
    const rim = this.rims.acquire();
    if (!rim) return;
    this.casts.push({ rim, at: at.clone(), age: 0, windup: Math.max(.05, windup), reduced, source });
  }

  /** Server impact: the windup parts hand over to the snapshot zone (markZone), which re-acquires its own. */
  release(source?: string): void {
    for (let i = this.casts.length - 1; i >= 0; i--) if (this.casts[i].source === source) {
      this.free(this.casts[i]); this.casts.splice(i, 1);
    }
  }

  markZone(id: string, at: Vector3, remaining: number, reduced: boolean, time: number): void {
    let zone = this.zones.get(id);
    if (!zone) {
      if (this.zones.size >= MAX_ZONES) return;
      const rim = this.rims.acquire();
      if (!rim) return;
      zone = { rim, age: zoneStartAge(remaining), touched: true, shattered: false };
      this.zones.set(id, zone);
      debug('visual.beidou.zone', { remaining: +remaining.toFixed(2), reduced });
    }
    zone.touched = true;
    const fade = zoneAlpha(remaining);
    this.rim(zone.rim, at, time, .6 * fade, .1, .9, reduced ? 0 : .35);
    zone.ice ??= this.crusts.acquire();
    if (zone.ice) {
      this.place(zone.ice.mesh, at, B.radius * 2, .06);
      const m = zone.ice.material;
      m.setFloat('uTime', time); m.setFloat('uSpread', reduced ? 1 : iceSpread(zone.age));
      m.setFloat('uShatter', reduced ? 0 : iceShatter(remaining));
      m.setFloat('uAlpha', .85 * (reduced ? fade : Math.min(1, zone.age / .1)));
    }
    if (!reduced && !zone.shattered && iceShatter(remaining) > 0) {
      zone.shattered = true;
      this.bank.spray('frost').ring(at, B.radius * .55, 36, .2, 3, 4.5);
    }
    const pose = zoneArrayPose(zone.age, remaining, reduced);
    const seal = sealPose(zone.age, B.windup, remaining);
    this.parts(zone, at, seal.scale, seal.spin, seal.alpha, arrayFrame(remaining, reduced, zone.age), pose);
  }

  tick(dt: number, time: number): void {
    for (let i = this.casts.length - 1; i >= 0; i--) {
      const cast = this.casts[i];
      cast.age += dt;
      // Lost impact (reconnect, cancelled cast): never leave the telegraph behind.
      if (cast.age >= cast.windup + .6) { this.free(cast); this.casts.splice(i, 1); continue; }
      const c = charge(cast.age, cast.windup);
      this.rim(cast.rim, cast.at, time, .3 + .6 * c, .12 + .2 * c, c, cast.reduced ? 0 : 1.2);
      const seal = sealPose(cast.age, cast.windup);
      const frame = cast.reduced ? 10 : segmentFrame(cast.age, 0, 4, cast.windup / 4);
      this.parts(cast, cast.at, seal.scale, cast.reduced ? 0 : seal.spin, seal.alpha, frame,
        castArrayPose(cast.age, cast.windup, cast.reduced));
      if (!cast.reduced && Math.random() < .6) this.bank.spray('frost').rise(cast.at, B.radius * .9, 3);
    }
    for (const [id, zone] of this.zones) {
      if (zone.touched) { zone.touched = false; zone.age += dt; continue; }
      this.free(zone); this.zones.delete(id);
    }
  }

  clear(): void {
    for (const cast of this.casts) this.free(cast);
    for (const zone of this.zones.values()) this.free(zone);
    this.casts.length = 0; this.zones.clear();
    this.rims.releaseAll(); this.crusts.releaseAll();
  }

  private parts(parts: Parts, at: Vector3, sealScale: number, spin: number, sealAlpha: number, frame: number, pose: Pose): void {
    parts.seal ??= this.art.acquire('seal', true);
    parts.air ??= this.art.acquire('array');
    if (parts.seal) {
      parts.seal.position.set(at.x, .075, at.z); parts.seal.scaling.setAll(SEAL_GROUND_SIZE * sealScale);
      parts.seal.rotation.z = spin; // Ground planes are pitched flat, so roll spins them about the vertical.
      parts.seal.visibility = sealAlpha;
    }
    if (parts.air) {
      parts.air.position.set(at.x, at.y + ARRAY_PLANE_HEIGHT + pose.lift, at.z);
      parts.air.scaling.setAll(ARRAY_PLANE_SIZE);
      parts.air.visibility = pose.alpha;
      this.art.frame(parts.air, frame, 4, 4);
    }
  }

  private rim(layer: Layer, at: Vector3, time: number, alpha: number, fill: number, rim: number, swirl: number): void {
    this.place(layer.mesh, at, B.radius * 2, .045);
    const m = layer.material;
    m.setFloat('uTime', time); m.setFloat('uAlpha', alpha); m.setFloat('uFill', fill); m.setFloat('uRim', rim);
    m.setFloat('uSwirl', swirl); m.setFloat('uRings', 0);
  }

  private place(mesh: Mesh, at: Vector3, size: number, y: number): void {
    mesh.position.set(at.x, y, at.z);
    mesh.scaling.set(size, 1, size);
    mesh.setEnabled(true);
  }

  private free(parts: Parts): void {
    this.rims.release(parts.rim); this.art.release(parts.seal); this.art.release(parts.air);
    if (parts.ice) this.crusts.release(parts.ice);
    parts.seal = parts.air = undefined; parts.ice = undefined;
  }
}
