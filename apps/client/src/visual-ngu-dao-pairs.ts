import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import type { SamsaraArt } from './visual-ngu-dao-art.js';
import { SoulRibbons } from './visual-ngu-dao-ribbons.js';
import { ND_CAPS, SOUL_CLOSE, soulClose } from './visual-ngu-dao-timeline.js';
import { motion } from './visual-kit-timeline.js';
import { debug } from './debug.js';
import layout from './visual-ngu-dao-layout.json';
interface Pair { from: Vector3; to: Vector3; remaining: number; reduced: boolean; touched: boolean; close?: number; strips: (Mesh | undefined)[] }
interface Pulse { id: string; age: number; reduced: boolean; mesh?: Mesh }
const finite = (p: Vector3): boolean => [p.x, p.y, p.z].every(Number.isFinite);
export class SoulPairs {
  private entries = new Map<string, Pair>(); private pulses: Pulse[] = []; private ribbons: SoulRibbons;
  constructor(private scene: Scene, private art: SamsaraArt) { this.ribbons = new SoulRibbons(scene); }
  prepare(): void { this.ribbons.prepare(); }
  mark(id: string, from: Vector3, to: Vector3, remaining: number, reduced: boolean): void {
    if (!id || !finite(from) || !finite(to) || !Number.isFinite(remaining) || remaining <= 0) return;
    let p = this.entries.get(id);
    if (!p) { if (this.entries.size >= ND_CAPS.pairs) return;
      p = { from: from.clone(), to: to.clone(), remaining, reduced, touched: true, strips: [] }; this.entries.set(id, p);
      debug('visual.ngu-dao.pair.seen', { remaining, reduced }); }
    p.from.copyFrom(from); p.to.copyFrom(to); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  /** Only a real hit event may call this; markers/tick never schedule a damage-sharing pulse. */
  pulse(id: string, reduced: boolean): boolean {
    const p = this.entries.get(id); if (!p || p.close !== undefined || this.pulses.length >= ND_CAPS.pulses) return false;
    this.pulses.push({ id, age: 0, reduced }); debug('visual.ngu-dao.pair.hit', { reduced }); return true;
  }
  tick(dt: number, time: number): void {
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.ngu-dao.pair.coil', {}); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= SOUL_CLOSE) { for (const mesh of p.strips) this.ribbons.release(mesh); this.entries.delete(id); continue; }
      const state = soulClose(p.close, p.reduced); p.touched = false;
      for (let braid = 0; braid < 2; braid++) { p.strips[braid] ??= this.ribbons.acquire(); const mesh = p.strips[braid];
        if (mesh) this.ribbons.place(mesh, p.from, p.to, braid, time, state.alpha, state.fold, p.reduced); }
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i], pair = this.entries.get(p.id); p.age += dt;
      if (!pair || pair.close !== undefined || p.age >= .34) { this.art.paint.planes.release(p.mesh); this.pulses.splice(i, 1); continue; }
      p.mesh ??= this.art.paint.planes.acquire('pulse'); if (!p.mesh) continue;
      const t = p.reduced ? 1 : motion.launch(Math.min(1, p.age / .28)), at = Vector3.Lerp(pair.from, pair.to, t).add(new Vector3(0, .75, 0));
      const visible = this.placePulse(p.mesh, pair.from, pair.to, at, p.reduced);
      p.mesh.visibility = visible ? Math.max(0, 1 - Math.max(0, p.age - .24) / .1) : 0;
    }
  }
  private placePulse(mesh: Mesh, from: Vector3, to: Vector3, at: Vector3, reduced: boolean): boolean {
    const delta = to.subtract(from), length = delta.length(); if (length < .02 || reduced) {
      mesh.billboardMode = Mesh.BILLBOARDMODE_ALL; mesh.rotationQuaternion = null; mesh.rotation.setAll(0);
      this.art.paint.place(mesh, 'pulse', at, .7, .7 / layout.pulse.aspect); return true; }
    const x = delta.scale(1 / length), camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const z = look.subtract(x.scale(Vector3.Dot(x, look))); if (z.lengthSquared() < 1e-6) return false; z.normalize();
    mesh.billboardMode = Mesh.BILLBOARDMODE_NONE; mesh.rotationQuaternion = null; mesh.rotation.copyFrom(Vector3.RotationFromAxis(x, Vector3.Cross(z, x).normalize(), z));
    mesh.position.copyFrom(at.subtract(x.scale(.55))); mesh.scaling.set(1.1, 1.1 / layout.pulse.aspect, 1); return true;
  }
  clear(): void { for (const p of this.pulses) this.art.paint.planes.release(p.mesh); this.pulses.length = 0; this.entries.clear(); this.ribbons.clear(); }
}
