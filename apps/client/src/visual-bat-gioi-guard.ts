import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { KitPainted, paintedFrameUvs } from './visual-kit-painted.js';
import { GUARD_EXIT, GUARD_FRONT_CUT, guardFrontGeometry, tideGuard } from './visual-bat-gioi-timeline.js';
import layout from './visual-bat-gioi-layout.json';

type Guard = { at: Vector3; remaining: number; age: number; reduced: boolean; touched: boolean;
  exit?: number; rear?: Mesh; front?: Mesh };

/** Snapshot-owned water/rake collar. The front lip sits below the foot anchor, never across face/torso. */
export class BatGioiGuard {
  private planes: KitPainted;
  private guards = new Map<string, Guard>();
  constructor(private scene: Scene) { this.planes = new KitPainted(scene, 16, 'bat-gioi-guard'); }
  prepare(): void {
    const url = '/assets/vfx-bat-gioi-guard.webp';
    this.planes.prepare('rear', url, { foreground: true });
    this.planes.prepare('front', url, { overlay: true });
  }
  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || ![at.x, at.y, at.z].every(Number.isFinite)) return;
    this.prepare(); let g = this.guards.get(id);
    if (!g) {
      if (this.guards.size >= 8) return;
      g = { at: at.clone(), remaining, age: 0, reduced, touched: true }; this.guards.set(id, g);
      debug('visual.bat-gioi.guard', { remaining, reduced });
    }
    g.at.copyFrom(at); Object.assign(g, { remaining, reduced, touched: true, exit: undefined });
  }
  tick(dt: number): void {
    for (const [id, g] of this.guards) {
      if (!g.touched) g.exit = (g.exit ?? 0) + dt;
      if ((g.exit ?? 0) >= GUARD_EXIT) {
        this.planes.release(g.rear); this.planes.release(g.front); this.guards.delete(id);
        debug('visual.bat-gioi.guard.exit', { reason: 'snapshot-ended' }); continue;
      }
      g.touched = false; g.age += dt;
      const remaining = g.exit === undefined ? g.remaining : Math.min(g.remaining, .35) * (1 - g.exit / GUARD_EXIT);
      const p = tideGuard(g.age, remaining, g.reduced, g.exit !== undefined);
      const size = 5.8 * p.scale, up = screenUp(this.scene);
      const center = billboardCenter(g.at, size, layout.guard.anchorY, up, -p.sink);
      g.rear ??= this.planes.acquire('rear'); g.front ??= this.planes.acquire('front');
      if (g.rear) {
        // Crop both geometry and UVs together: no duplicated front lip or stretched wave.
        g.rear.scaling.set(size, size * GUARD_FRONT_CUT, 1);
        g.rear.position.copyFrom(center.add(up.scale(size * (1 - GUARD_FRONT_CUT) / 2)));
        this.planes.mapUvs(g.rear, base => paintedFrameUvs(base.map((v, i) => i % 2 ?
          1 - GUARD_FRONT_CUT + v * GUARD_FRONT_CUT : v), p.frame, 4, 4) ?? []);
        g.rear.visibility = .88 * p.alpha;
      }
      if (g.front) {
        const crop = guardFrontGeometry(size);
        g.front.scaling.set(size, crop.height, 1); g.front.position.copyFrom(center.add(up.scale(crop.offset)));
        this.planes.mapUvs(g.front, base => paintedFrameUvs(base.map((v, i) => i % 2 ?
          v * (1 - GUARD_FRONT_CUT) : v), p.frame, 4, 4) ?? []);
        g.front.visibility = .72 * p.alpha;
      }
    }
  }
  clear(): void { this.guards.clear(); this.planes.clear(); }
}
