import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { TuongThanArtId } from './visual-tuong-than-assets.js';

/** One short-lived painted plane: `draw` poses it every frame; a negative `age` waits (staggered start). */
export interface Piece {
  mesh: Mesh;
  age: number;
  life: number;
  draw(mesh: Mesh, age: number): void;
  /** Runs once when the piece ends or is cleared (strips hand back their quaternion here). */
  end?(mesh: Mesh): void;
}

/** Capped list of timed painted planes; everything returns to the KitPainted pool on end or `clear()`. */
export class TuongThanPieces {
  private pieces: Piece[] = [];

  constructor(private art: KitPainted, private cap: number, private layer: string) {}

  get size(): number { return this.pieces.length; }

  /** Acquires `id`, poses it once and queues it; false at cap or while the art is still loading. */
  add(id: TuongThanArtId, ground: boolean, life: number, age: number, draw: Piece['draw'], end?: Piece['end']): boolean {
    if (this.pieces.length >= this.cap) { debug('visual.tuongthan.cap', { layer: this.layer }); return false; }
    const mesh = this.art.acquire(id, ground);
    if (!mesh) return false;
    const piece: Piece = { mesh, age, life, draw, end };
    this.pieces.push(piece);
    this.pose(piece);
    return true;
  }

  tick(dt: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      piece.age += dt;
      if (piece.age >= piece.life) { this.drop(piece); this.pieces.splice(i, 1); continue; }
      this.pose(piece);
    }
  }

  clear(): void {
    for (const piece of this.pieces) this.drop(piece);
    this.pieces.length = 0;
  }

  private pose(piece: Piece): void {
    piece.mesh.setEnabled(piece.age >= 0);
    if (piece.age >= 0) piece.draw(piece.mesh, piece.age);
  }

  private drop(piece: Piece): void {
    piece.end?.(piece.mesh);
    this.art.release(piece.mesh);
  }
}
