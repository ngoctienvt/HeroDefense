import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { farDirection } from './visual-kit-billboard.js';
import type { SamsaraArt } from './visual-ngu-dao-art.js';
import { ND_CAPS, SOUL_CLOSE, soulClose, frenzyFrame } from './visual-ngu-dao-timeline.js';
import { debug } from './debug.js';
type Kind = 'shackle' | 'frenzy';
interface Mark { kind: Kind; at: Vector3; remaining: number; reduced: boolean; touched: boolean; close?: number; meshes: (Mesh | undefined)[] }
/** Snapshot-owned cuffs and hand wisps; missing state folds once, never refreshes a client status timer. */
export class SoulMarks {
  private entries = new Map<string, Mark>();
  constructor(private scene: Scene, private art: SamsaraArt) {}
  mark(kind: Kind, id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!id || ![at.x, at.y, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    const key = `${kind}:${id}`; let p = this.entries.get(key);
    if (!p) { if (this.entries.size >= ND_CAPS.marks) return;
      p = { kind, at: at.clone(), remaining, reduced, touched: true, meshes: [] }; this.entries.set(key, p);
      debug('visual.ngu-dao.mark.seen', { kind, remaining, reduced }); }
    p.at.copyFrom(at); p.remaining = remaining; p.reduced = reduced; p.touched = true; p.close = undefined;
  }
  tick(dt: number): void {
    const far = farDirection(this.scene), right = new Vector3(-far.z, 0, far.x);
    for (const [id, p] of this.entries) {
      if (!p.touched && p.close === undefined) { p.close = 0; debug('visual.ngu-dao.mark.fold', { kind: p.kind }); }
      if (p.close !== undefined) p.close += dt;
      if (p.close !== undefined && p.close >= SOUL_CLOSE) { for (const mesh of p.meshes) this.art.paint.planes.release(mesh); this.entries.delete(id); continue; }
      p.touched = false; const state = soulClose(p.close, p.reduced), key = p.kind === 'frenzy' ? 'frenzy' : 'chain';
      for (let i = 0; i < 2; i++) {
        p.meshes[i] ??= this.art.paint.planes.acquire(key); const mesh = p.meshes[i]; if (!mesh) continue;
        const sign = i ? 1 : -1, isAura = p.kind === 'frenzy';
        const at = p.at.add(right.scale(sign * (isAura ? .58 : .38) * state.scale)).add(far.scale(isAura ? .12 : 0));
        this.art.paint.place(mesh, key, at, (isAura ? .72 : .78) * state.scale, (isAura ? .72 : .65) * state.scale, isAura ? 1.3 : .65);
        if (isAura) this.art.paint.frame(mesh, 'frenzy', frenzyFrame(p.remaining, p.close, p.reduced));
        else this.art.paint.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? .72 + v * .28 : v));
        mesh.rotation.z = (!isAura && i ? Math.PI : 0) + sign * state.fold * 1.7; mesh.visibility = state.alpha;
      }
    }
  }
  clear(): void { for (const p of this.entries.values()) for (const mesh of p.meshes) this.art.paint.planes.release(mesh); this.entries.clear(); }
}
