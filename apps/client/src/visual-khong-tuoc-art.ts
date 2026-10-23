import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Tier3Art } from './visual-tier3-art.js';
import layout from './visual-khong-tuoc-layout.json';
import { screenUp } from './visual-kit-billboard.js';
import { fanSize } from './visual-khong-tuoc-timeline.js';

export type PeacockArt = keyof typeof layout;
interface Piece { id: PeacockArt; ground: boolean; mesh?: Mesh; age: number; life: number; draw(age: number, mesh: Mesh): void }
/** Timed presentation only; recipient selection is exclusively the confirmed event. */
export class KhongTuocArt extends Tier3Art<PeacockArt> {
  private pieces: Piece[] = [];
  constructor(private cameraScene: Scene) { super(cameraScene, 'khong-tuoc', layout, ['fan', 'feather', 'blessing', 'hit'], 192); }
  fanWidth(): number { return fanSize(screenUp(this.cameraScene).y); }
  play(id: PeacockArt, life: number, draw: Piece['draw'], ground = false, delay = 0): void {
    if (this.pieces.length >= 128) return;
    const mesh = this.planes.acquire(id, ground);
    mesh?.setEnabled(delay <= 0); this.pieces.push({ id, ground, mesh, age: -delay, life, draw });
    if (delay <= 0 && mesh) draw(0, mesh);
  }
  fan(mesh: Mesh, at: Vector3, frame: number, alpha: number, scale = 1): void {
    this.frame(mesh, 'fan', frame); this.place(mesh, 'fan', at, this.fanWidth() * scale); mesh.visibility = alpha;
  }
  tick(dt: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i]; p.age += dt;
      if (p.age >= p.life) { this.planes.release(p.mesh); this.pieces.splice(i, 1); continue; }
      if (p.age >= 0) p.mesh ??= this.planes.acquire(p.id, p.ground);
      p.mesh?.setEnabled(p.age >= 0); if (p.age >= 0 && p.mesh) p.draw(p.age, p.mesh);
    }
  }
  override clear(): void { this.pieces.length = 0; super.clear(); }
}
