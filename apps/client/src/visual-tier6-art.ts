import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { KitPainted } from './visual-kit-painted.js';
import { motion } from './visual-kit-timeline.js';
import { tier6Ending, tier6Frame, tier6HoldFrame } from './visual-tier6-timeline.js';
import raw from './visual-tier6-art-manifest.json';

interface ArtMeta { url: string; columns: number; rows: number; frames: number; anchorY: number;
  width: number; height: number; groundRadiusFactor: number }
const manifest: Readonly<Record<string, ArtMeta>> = raw;
export interface Tier6ArtOptions {
  ground?: boolean; from?: Vector3; endScale?: number; startFrame?: number; endFrame?: number;
  lift?: number; rotation?: number; duration?: number; ending?: number;
}
type Entry = {
  mesh: Mesh; asset: string; at: Vector3; size: number; age: number; life: number; reduced: boolean;
  options: Tier6ArtOptions; remaining: number; touched: boolean; hold: boolean; exiting?: number;
};

/** Pooled source art: mechanics are shared, while each hero retains its own material and silhouette. */
export class Tier6Art {
  private painted: KitPainted;
  private live: Entry[] = [];
  private markers = new Map<string, Entry>();
  private missing = new Set<string>();
  constructor(private scene: Scene, private name: string, capacity = 96) {
    this.painted = new KitPainted(scene, capacity, name);
  }
  prepare(...assets: string[]): void {
    for (const asset of assets) {
      const meta = manifest[asset];
      if (!meta) {
        if (!this.missing.has(asset)) debug('visual.kit.asset.missing', { asset, owner: this.name });
        this.missing.add(asset); continue;
      }
      // World pass always sorts below heroes; transient art can still be seen on top of the ground.
      this.painted.prepare(asset, meta.url, { depthAlways: true });
    }
  }
  play(asset: string, at: Vector3, size: number, life: number, reduced: boolean, options: Tier6ArtOptions = {}): void {
    const entry = this.create(asset, at, size, life, reduced, options);
    if (entry) this.live.push(entry);
  }
  mark(key: string, asset: string, at: Vector3, size: number, remaining: number, reduced: boolean,
    options: Tier6ArtOptions = {}): void {
    if (![at.x, at.z, size, remaining].every(Number.isFinite) || size <= 0 || remaining <= 0) return;
    let entry = this.markers.get(key);
    if (entry && entry.asset !== asset) {
      this.painted.release(entry.mesh); this.markers.delete(key); entry = undefined;
    }
    if (!entry) {
      entry = this.create(asset, at, size, options.duration ?? remaining, reduced, options);
      if (!entry) return;
      entry.hold = true; this.markers.set(key, entry);
    }
    entry.at.copyFrom(at); entry.size = size; entry.remaining = remaining;
    entry.options = options; entry.reduced = reduced; entry.touched = true; entry.exiting = undefined;
  }
  ribbon(asset: string, from: Vector3, to: Vector3, width: number, life: number, reduced: boolean): void {
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    if (length < .01) return;
    const entry = this.create(asset, from.add(to).scale(.5), width, life, reduced,
      { ground: true, rotation: -Math.atan2(to.z - from.z, to.x - from.x) });
    if (!entry) return;
    // The source strip's head is on +X; keep its own aspect and reveal it along the actual segment.
    entry.mesh.scaling.set(length, width, 1);
    entry.options.endScale = length;
    this.live.push(entry);
  }
  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const entry = this.live[i]; entry.age += dt;
      if (entry.age >= entry.life) { this.painted.release(entry.mesh); this.live.splice(i, 1); continue; }
      this.draw(entry);
    }
    for (const [key, entry] of this.markers) {
      entry.age += dt;
      if (!entry.touched) entry.exiting = (entry.exiting ?? 0) + dt;
      entry.touched = false;
      if ((entry.exiting ?? 0) >= (entry.options.ending ?? .35)) {
        this.painted.release(entry.mesh); this.markers.delete(key); continue;
      }
      this.draw(entry);
    }
  }
  clear(): void { this.live.length = 0; this.markers.clear(); this.painted.clear(); }

  private create(asset: string, at: Vector3, size: number, life: number, reduced: boolean,
    options: Tier6ArtOptions): Entry | undefined {
    if (![at.x, at.z, size, life].every(Number.isFinite) || size <= 0 || life <= 0) return;
    this.prepare(asset);
    const mesh = this.painted.acquire(asset, options.ground);
    if (!mesh) return;
    const entry: Entry = { mesh, asset, at: at.clone(), size, age: 0, life, reduced,
      options, remaining: life, touched: true, hold: false };
    this.draw(entry); return entry;
  }
  private draw(entry: Entry): void {
    const meta = manifest[entry.asset];
    if (!meta) return;
    const { mesh, options, age, life, reduced } = entry;
    const exitSeconds = options.ending ?? .35;
    const remaining = entry.exiting === undefined ? entry.remaining : Math.max(0, exitSeconds - entry.exiting);
    const end = entry.hold ? tier6Ending(remaining, exitSeconds) : Math.max(0, (age / life - .72) / .28);
    const progress = motion.easeOut(Math.min(1, age / life));
    const currentExit = entry.hold && meta.frames === 8 && options.ground && !reduced ? end : 0;
    const scale = entry.hold ? (reduced || (options.ground && entry.exiting === undefined && !currentExit) ? 1 : 1 - end * .16)
      : options.endScale === undefined ? 1 : 1 + (options.endScale - 1) * progress;
    // Ribbon length is kept independently from its width and revealed, never stretched from a dot.
    const ribbon = options.ground && options.endScale !== undefined && meta.width / meta.height > 2;
    const calibration = options.ground && !ribbon ? meta.groundRadiusFactor : 1;
    const width = ribbon ? options.endScale! * (reduced ? 1 : Math.max(.03, progress)) : entry.size * scale / calibration;
    const height = ribbon ? entry.size : width * meta.height / meta.width;
    mesh.scaling.set(width, height, 1);
    const at = options.from && !reduced ? Vector3.Lerp(options.from, entry.at, progress) : entry.at;
    if (options.ground) {
      mesh.position.set(at.x, .065 + (options.lift ?? 0), at.z);
      mesh.rotation.set(Math.PI / 2, (options.rotation ?? 0) + currentExit * .45, 0);
      if (ribbon && !reduced) {
        const length = options.endScale!;
        const shift = (length - width) / 2;
        mesh.position.x -= Math.cos(options.rotation ?? 0) * shift;
        mesh.position.z += Math.sin(options.rotation ?? 0) * shift;
        this.painted.mapUvs(mesh, base => base.map((value, i) => i % 2 === 0 ? 1 - progress + value * progress : value));
      }
    } else {
      const feet = at.add(new Vector3(0, 0, 0));
      mesh.position.copyFrom(billboardCenter(feet, height, meta.anchorY, screenUp(this.scene),
        (options.lift ?? 0) + (reduced ? 0 : end * .18)));
    }
    const holdAge = options.duration ? Math.max(age, options.duration - remaining) : age;
    const frame = entry.hold && options.startFrame !== undefined
      ? tier6Frame(age, options.duration ?? life, meta.frames, reduced, options.startFrame, options.endFrame)
      : entry.hold ? tier6HoldFrame(holdAge, meta.frames, remaining, reduced, exitSeconds)
      : tier6Frame(age, life, meta.frames, reduced, options.startFrame, options.endFrame);
    if (!ribbon) this.painted.frame(mesh, frame, meta.columns, meta.rows);
    mesh.visibility = entry.hold ? 1 - end * .85 : Math.min(1, (life - age) / Math.min(.18, life * .3));
  }
}
