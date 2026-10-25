import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { KitPainted } from './visual-kit-painted.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { segmentFrame } from './visual-kit-timeline.js';

type Entry = { kind: 'frozen' | 'sunder'; sprite?: Sprite; mesh?: Mesh; at: Vector3;
  age: number; exit: number; reduced: boolean; touched: boolean };

/** Shared inventory artwork on confirmed recipients; no client-side status application. */
export class TruongStatuses {
  private entries = new Map<string, Entry>();
  constructor(private art: KitPainted, private books: KitFlipbooks) {}

  mark(kind: Entry['kind'], id: string, at: Vector3, reduced: boolean): void {
    const key = `${kind}:${id}`;
    let entry = this.entries.get(key);
    if (!entry) {
      if (this.entries.size >= 64) return;
      entry = { kind, at: at.clone(), age: 0, exit: 0, reduced, touched: true };
      this.entries.set(key, entry);
    }
    entry.at.copyFrom(at); entry.reduced = reduced; entry.touched = true; entry.exit = 0;
    if (kind === 'sunder') {
      entry.mesh ??= this.art.acquire('armor', true);
      if (entry.mesh) {
        entry.mesh.position.set(at.x, .085, at.z);
        entry.mesh.scaling.set(2,2,1); entry.mesh.visibility = .8;
      }
    } else {
      entry.sprite ??= this.books.spawn('truong-freeze', at, .85);
      if (entry.sprite) this.books.place('truong-freeze', entry.sprite, at, .85);
    }
  }

  tick(dt: number): void {
    for (const [key, entry] of this.entries) {
      entry.age += dt;
      if (!entry.touched) entry.exit += dt;
      if (entry.sprite) {
        entry.sprite.cellIndex = entry.reduced ? 5 : entry.exit > 0
          ? segmentFrame(entry.exit,12,4,.05) : entry.age < .2
            ? segmentFrame(entry.age,0,4,.05) : 4 + Math.floor(entry.age*5)%8;
        entry.sprite.color.a = entry.exit > 0 ? Math.max(0,1-entry.exit/.2) : .8;
      }
      if (!entry.touched && (entry.kind === 'sunder' || entry.reduced || entry.exit >= .2)) {
        this.art.release(entry.mesh); this.books.release('truong-freeze',entry.sprite); this.entries.delete(key);
      } else entry.touched = false;
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) {
      this.art.release(entry.mesh); this.books.release('truong-freeze',entry.sprite);
    }
    this.entries.clear();
  }
}
