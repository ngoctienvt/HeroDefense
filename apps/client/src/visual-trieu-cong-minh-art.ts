import type { Scene } from '@babylonjs/core/scene.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { KitPainted } from './visual-kit-painted.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { resetStrip } from './visual-de-tuan-strip.js';
import layout from './visual-trieu-cong-minh-layout.json';
export type CoinArtKind = 'spin' | 'hit' | 'receipt' | 'trail';
export interface CoinSlot { mesh?: Mesh }
/** All body/contact artwork is foreground under hero sprites and HP; real ground marks use the bank. */
export class TrieuCongMinhArt {
  readonly planes: KitPainted;
  constructor(private scene: Scene) { this.planes = new KitPainted(scene, 112, 'trieu-cong-minh'); }
  prepare(): void {
    for (const key of ['spin', 'hit', 'receipt', 'trail'] as const)
      this.planes.prepare(key, `/assets/vfx-trieu-cong-minh-${key}.webp`, { foreground: true });
  }
  pose(slot: CoinSlot, key: CoinArtKind, at: Vector3, size: number, frame: number, alpha: number): Mesh | undefined {
    if (!slot.mesh) slot.mesh = this.planes.acquire(key);
    const mesh = slot.mesh;
    if (!mesh) return; // Slot stays pending at its original phase age until texture/pool becomes available.
    resetStrip(mesh); mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const config = layout[key];
    mesh.position.copyFrom(billboardCenter(at, size, config.anchor, screenUp(this.scene)));
    mesh.scaling.set(size, size, 1); mesh.visibility = alpha;
    this.planes.frame(mesh, frame, config.columns, config.rows);
    return mesh;
  }
  release(slot: CoinSlot): void { resetStrip(slot.mesh); this.planes.release(slot.mesh); slot.mesh = undefined; }
  clear(): void { this.planes.clear(); }
}
