import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { snId } from './visual-shennong-art.js';
import { streamFade, streamPulse, STREAM_PERIOD } from './visual-shennong-timeline.js';

type Entry = { from: Vector3; to: Vector3; age: number; remaining: number; reduced: boolean; touched: boolean;
  phase: number; arrived: boolean; band?: Layer; comet?: Mesh };
const MAX_STREAMS = 14, HEIGHT = 1.3, COMET_LENGTH = 3.4;

/** Stable 0..1 phase from an id so allies pulse out of step with each other. */
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 997) / 997;
}

/**
 * Life stream: one persistent herb-green band from the vessel to every ally the zone heals (any distance: the heal is
 * zone-wide, not the damage radius). A painted comet of leaves rides the band in pulses; each arrival lifts a few
 * motes off the ally. Ambience of the snapshot heal, not a heal event: no number, no invented recipient.
 */
export class ShennongStreams {
  private entries = new Map<string, Entry>();
  private bands: LayerPool;
  private clock = 0;
  private capLogged = false;

  constructor(scene: Scene, private art: KitPainted, private spray: KitSpray) {
    let serial = 0;
    this.bands = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitLink', 'herbal', `shennong-band-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 9;
      return layer;
    }, MAX_STREAMS, 'shennong-band');
  }

  mark(id: string, from: Vector3, to: Vector3, remaining: number, reduced: boolean): void {
    if (![from.x, from.z, to.x, to.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= MAX_STREAMS) {
        if (!this.capLogged) { this.capLogged = true; debug('visual.shennong.cap', { layer: 'stream' }); }
        return;
      }
      entry = { from: from.clone(), to: to.clone(), age: 0, remaining, reduced, touched: true,
        phase: phaseOf(id) * STREAM_PERIOD, arrived: false };
      this.entries.set(id, entry);
    }
    entry.from.copyFrom(from); entry.to.copyFrom(to); entry.remaining = remaining; entry.reduced = reduced; entry.touched = true;
  }

  tick(dt: number, time: number): void {
    this.clock += dt;
    for (const [id, entry] of this.entries) {
      if (!entry.touched) { this.release(entry); this.entries.delete(id); continue; }
      entry.touched = false; entry.age += dt;
      this.draw(entry, time);
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) this.release(entry);
    this.entries.clear(); this.bands.releaseAll(); this.capLogged = false;
  }

  private draw(entry: Entry, time: number): void {
    const dx = entry.to.x - entry.from.x, dz = entry.to.z - entry.from.z, length = Math.hypot(dx, dz);
    if (length < .4) { this.release(entry); return; }
    const fade = streamFade(entry.age, entry.remaining);
    const pulse = entry.reduced ? { head: 1, tail: 0, alpha: .5 } : streamPulse(this.clock, entry.phase);
    entry.band ??= this.bands.acquire();
    if (entry.band) {
      const { mesh, material: m } = entry.band;
      mesh.scaling.set(length, 1, .6);
      mesh.position.set((entry.from.x + entry.to.x) / 2, HEIGHT - .1, (entry.from.z + entry.to.z) / 2);
      mesh.rotation.y = -Math.atan2(dz, dx);
      m.setFloat('uTime', entry.reduced ? 0 : time); m.setFloat('uHead', 1); m.setFloat('uTail', 0);
      m.setFloat('uWave', entry.reduced ? 0 : .5); m.setFloat('uTaper', .55);
      m.setFloat('uAlpha', (.16 + (entry.reduced ? 0 : .5 * pulse.alpha)) * fade);
    }
    if (entry.reduced) { this.art.release(entry.comet); entry.comet = undefined; return; }
    this.comet(entry, dx / length, dz / length, length, pulse, fade);
  }

  private comet(entry: Entry, ux: number, uz: number, length: number, pulse: { head: number; alpha: number }, fade: number): void {
    if (pulse.alpha <= .02) { this.art.release(entry.comet); entry.comet = undefined; }
    else entry.comet ??= this.art.acquire(snId('stream'), true);
    if (pulse.head < .5) entry.arrived = false;
    else if (!entry.arrived && pulse.head > .98) {
      entry.arrived = true;
      this.spray.trail(new Vector3(entry.to.x, .3, entry.to.z), new Vector3(0, 2.6, 0), 4);
    }
    if (!entry.comet) return;
    const size = Math.min(COMET_LENGTH, length * .9), tip = pulse.head * length;
    const centre = Math.max(size / 2, tip - size / 2);
    entry.comet.position.set(entry.from.x + ux * centre, HEIGHT, entry.from.z + uz * centre);
    entry.comet.rotation.set(Math.PI / 2, -Math.atan2(uz, ux), 0);
    entry.comet.scaling.set(size, size / 3, 1);
    entry.comet.visibility = pulse.alpha * fade;
  }

  private release(entry: Entry): void {
    if (entry.band) this.bands.release(entry.band);
    this.art.release(entry.comet);
    entry.band = undefined; entry.comet = undefined;
  }
}
