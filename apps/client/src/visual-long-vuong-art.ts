import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { KitPainted } from './visual-kit-painted.js';
import layout from './visual-long-vuong-layout.json';

export type WaterArtId = 'pearl' | 'wave' | 'lane' | 'pool' | 'churn' | 'hit';
export class LongVuongArt {
  readonly planes: KitPainted;
  constructor(private scene: Scene) { this.planes = new KitPainted(scene, 112, 'long-vuong'); }
  prepare(): void {
    for (const id of ['pearl', 'wave', 'lane', 'pool', 'churn', 'hit'] as const)
      this.planes.prepare(id, `/assets/vfx-long-vuong-${id}.webp`,
        { foreground: id === 'pearl' || id === 'hit' || id === 'wave', depthAlways: id === 'churn' });
  }
  frame(mesh: Mesh, id: WaterArtId, frame: number): void {
    const grid = layout[id]; this.planes.frame(mesh, Math.min(grid.frames - 1, frame), grid.columns, grid.rows);
  }
  place(mesh: Mesh, id: WaterArtId, at: Vector3, width: number, height: number, lift = 0): void {
    mesh.scaling.set(width, height, 1);
    mesh.position.copyFrom(billboardCenter(at, height, layout[id].anchorY, screenUp(this.scene), lift));
  }
  poolDiameter(radius: number): number { return radius / layout.pool.radialEdge; }
  laneUvs(mesh: Mesh): void {
    const b = layout.lane.bounds;
    this.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0
      ? b.left + v * (b.right - b.left) : 1 - b.bottom + v * (b.bottom - b.top)));
  }
  clear(): void { this.planes.clear(); }
}
