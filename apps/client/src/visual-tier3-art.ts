import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { KitPainted } from './visual-kit-painted.js';

export interface PaintedLayout { columns: number; rows: number; frames: number; anchorY: number;
  radialEdge?: number; bounds: { left: number; right: number; top: number; bottom: number } }

/** Common measured-art operations; each hero still owns its material story and event timeline. */
export class Tier3Art<K extends string> {
  readonly planes: KitPainted;
  constructor(private scene: Scene, private slug: string, private layout: Record<K, PaintedLayout>,
    private foreground: readonly NoInfer<K>[], capacity = 96) { this.planes = new KitPainted(scene, capacity, slug); }
  prepare(): void {
    for (const id of Object.keys(this.layout) as K[])
      this.planes.prepare(id, `/assets/vfx-${this.slug}-${id}.webp`,
        { foreground: this.foreground.includes(id), depthAlways: !this.foreground.includes(id) });
  }
  frame(mesh: Mesh, id: K, frame: number): void {
    const l = this.layout[id]; this.planes.frame(mesh, Math.max(0, Math.min(l.frames - 1, frame)), l.columns, l.rows);
  }
  place(mesh: Mesh, id: K, at: Vector3, width: number, height = width, lift = 0): void {
    mesh.scaling.set(width, height, 1);
    mesh.position.copyFrom(billboardCenter(at, height, this.layout[id].anchorY, screenUp(this.scene), lift));
  }
  ground(mesh: Mesh, id: K, at: Vector3, radius: number, yaw = 0): void {
    const size = radius / (this.layout[id].radialEdge ?? .5);
    mesh.position.set(at.x, .055, at.z); mesh.rotation.set(Math.PI / 2, yaw, 0); mesh.scaling.set(size, size, 1);
  }
  crop(mesh: Mesh, id: K): void {
    const b = this.layout[id].bounds;
    this.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0
      ? b.left + v * (b.right - b.left) : 1 - b.bottom + v * (b.bottom - b.top)));
  }
  clear(): void { this.planes.clear(); }
}
