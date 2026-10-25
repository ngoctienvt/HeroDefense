import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { LotusArt } from './visual-tinh-dan-art.js';
import { TD_CAPS, ECHO_CLOSE } from './visual-tinh-dan-timeline.js';
import { debug } from './debug.js';
interface Echo { at: Vector3; remaining: number; reduced: boolean; touched: boolean; close?: number; mesh?: Mesh }
export class LotusEcho {
  private entries = new Map<string, Echo>();
  constructor(private art: LotusArt) {}
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let p = this.entries.get(id); if (!p) { if (this.entries.size >= TD_CAPS.echoes) return; p = { at: at.clone(), remaining, reduced, touched: true }; this.entries.set(id, p); debug('visual.tinh-dan.echo.seen', { remaining, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void { for (const [id, p] of this.entries) {
    if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.tinh-dan.echo.fold', {}); } if (p.close !== undefined) p.close += dt;
    if (p.close !== undefined && p.close >= ECHO_CLOSE) { this.art.paint.planes.release(p.mesh); this.entries.delete(id); continue; }
    p.touched = false; p.mesh ??= this.art.paint.planes.acquire('echo'); if (!p.mesh) continue;
    const fold = p.reduced || p.close === undefined ? 0 : Math.min(1, p.close / ECHO_CLOSE);
    this.art.paint.frame(p.mesh, 'echo', p.reduced ? 4 : p.close === undefined ? Math.floor(Math.max(0, 5 - p.remaining) / .1) % 12 : 12 + Math.min(3, Math.floor(p.close / ECHO_CLOSE * 4)));
    this.art.paint.place(p.mesh, 'echo', p.at, 2.2 * (1 - fold * .75), 1.5 * (1 - fold * .85), .75); p.mesh.rotation.z = fold * .35;
    p.mesh.visibility = p.close === undefined ? .75 : .75 * (1 - p.close / ECHO_CLOSE);
  } }
  clear(): void { for (const p of this.entries.values()) this.art.paint.planes.release(p.mesh); this.entries.clear(); }
}
