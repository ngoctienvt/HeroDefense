import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { groundScale } from './visual-tuong-than-assets.js';
import type { TuongThanFlow } from './visual-tuong-than-flow.js';
import { CHANNEL_INTERVAL, CHANNEL_LIFE, seaAge, seaExit, seaFadeIn, SEA_EXIT, SEA_GRACE, seaRimScale, seaScale }
  from './visual-tuong-than-timeline.js';

type Sea = { decal?: Mesh; body: Layer; rim: Layer; at: Vector3; radius: number; remaining: number; touched: boolean;
  idle: number; gone: number; reduced: boolean; clock: number };
const MAX_SEAS = 3;

/**
 * The blood sea held by the snapshot (`blood-sea.radius/remaining`, 8 s): a thick dark pool that spreads from the caster,
 * a `kitGround` body over it that keeps moving (low spiral so it reads as dense blood, not a whirlpool) with a foam rim
 * at EXACTLY the snapshot radius, blood channels running rim → centre and slow bubbles. The last SEA_EXIT seconds of
 * `remaining` sink the pool into its grooves and collapse the rim; a marker that vanishes early runs the same exit once
 * and frees everything. Joining late (reconnect) starts fully open; nothing is replayed.
 */
export class TuongThanSea {
  private seas = new Map<string, Sea>();
  private bodies: LayerPool;
  private rims: LayerPool;

  constructor(scene: Scene, private art: KitPainted, private spray: KitSpray, private flow: TuongThanFlow) {
    let serial = 0;
    const make = (name: string, order: number): Layer => {
      const layer = createGroundLayer(scene, 'kitGround', 'blood', `tuongthan-${name}-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + order;
      return layer;
    };
    this.bodies = new LayerPool(() => make('sea-body', 4), MAX_SEAS, 'tuongthan-sea-body');
    this.rims = new LayerPool(() => make('sea-rim', 6), MAX_SEAS, 'tuongthan-sea-rim');
  }

  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (![at.x, at.z, radius, remaining].every(Number.isFinite) || radius <= 0 || remaining <= 0) return;
    let sea = this.seas.get(id);
    if (!sea) {
      if (this.seas.size >= MAX_SEAS) { debug('visual.tuongthan.cap', { layer: 'sea' }); return; }
      const body = this.bodies.acquire(), rim = this.rims.acquire();
      if (!body || !rim) {
        if (body) this.bodies.release(body);
        if (rim) this.rims.release(rim);
        return;
      }
      sea = { decal: this.art.acquire('ground', true), body, rim, at: at.clone(), radius, remaining, touched: true,
        idle: 0, gone: 0, reduced, clock: 0 };
      this.seas.set(id, sea);
      debug('visual.tuongthan.sea', { radius, remaining: +remaining.toFixed(2), reduced });
    }
    sea.touched = true; sea.idle = 0; sea.gone = 0;
    sea.at.copyFrom(at); sea.radius = radius; sea.remaining = remaining; sea.reduced = reduced;
  }

  tick(dt: number, time: number): void {
    for (const [id, sea] of this.seas) {
      // The snapshot loop marks less often than frames render: only a marker silent past the grace is really gone.
      if (sea.touched) sea.idle = 0; else sea.idle += dt;
      sea.touched = false;
      if (sea.idle > SEA_GRACE) sea.gone += dt;
      if (sea.gone >= SEA_EXIT) { this.free(sea); this.seas.delete(id); continue; }
      sea.clock += dt;
      this.place(sea, time);
      this.motion(sea, dt);
    }
  }

  clear(): void {
    for (const sea of this.seas.values()) this.free(sea);
    this.seas.clear();
    this.bodies.releaseAll(); this.rims.releaseAll();
  }

  /** Remaining as drawn: the snapshot's own, or the exit clock once the marker has gone quiet. */
  private drawn(sea: Sea): number { return sea.gone > 0 ? Math.min(sea.remaining, SEA_EXIT - sea.gone) : sea.remaining; }

  private place(sea: Sea, time: number): void {
    sea.decal ??= this.art.acquire('ground', true);
    const remaining = this.drawn(sea), exit = seaExit(remaining), age = seaAge(sea.remaining);
    const scale = seaScale(age, remaining, sea.reduced), fade = (1 - exit) * seaFadeIn(age);
    const { decal, body, rim, at } = sea;
    if (decal) {
      const art = groundScale('ground', 2 * sea.radius * scale);
      decal.scaling.set(art.x, art.y, 1);
      decal.position.set(at.x, .05, at.z);
      decal.visibility = .82 * fade;
    }
    const diameter = 2 * sea.radius * scale;
    body.mesh.position.set(at.x, .052, at.z);
    body.mesh.scaling.set(diameter, 1, diameter);
    const b = body.material;
    b.setFloat('uTime', sea.reduced ? 0 : time); b.setFloat('uAlpha', .42 * fade);
    b.setFloat('uFill', .85); b.setFloat('uRim', 0); b.setFloat('uBand', 0); b.setFloat('uRings', 0);
    b.setFloat('uSpiral', 0); b.setFloat('uSwirl', sea.reduced ? 0 : .22);
    // Boundary of the real sea: fixed at the snapshot radius until the exit, never beyond it.
    const edge = 2 * sea.radius * seaRimScale(remaining);
    rim.mesh.position.set(at.x, .056, at.z);
    rim.mesh.scaling.set(edge, 1, edge);
    const r = rim.material;
    r.setFloat('uTime', sea.reduced ? 0 : time); r.setFloat('uAlpha', .78 * (1 - exit));
    r.setFloat('uFill', 0); r.setFloat('uRim', 1); r.setFloat('uBand', 0); r.setFloat('uRings', 0);
    r.setFloat('uSpiral', 0); r.setFloat('uSwirl', 0);
  }

  /** Living surface: channels flow in, bubbles rise; the exit drips along the collapsing rim. Reduced motion draws none. */
  private motion(sea: Sea, dt: number): void {
    if (sea.reduced) return;
    const remaining = this.drawn(sea), exit = seaExit(remaining);
    const center = new Vector3(sea.at.x, 0, sea.at.z);
    if (exit <= 0 && sea.clock >= CHANNEL_INTERVAL) {
      sea.clock = 0;
      this.flow.inward(center, sea.radius * (.55 + .35 * Math.random()), 1, CHANNEL_LIFE, false);
    }
    if (Math.random() < dt * (exit > 0 ? 18 : 7)) {
      if (exit > 0) this.spray.ring(center, sea.radius * (1 - .06 * exit), 1, .1, .2, 1.2);
      else this.spray.ring(center, sea.radius * Math.random() * .85, 1, .1, .3, 2.4);
    }
  }

  private free(sea: Sea): void {
    this.art.release(sea.decal);
    this.bodies.release(sea.body); this.rims.release(sea.rim);
    sea.decal = undefined;
  }
}
