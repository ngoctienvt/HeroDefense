import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { KitPainted } from './visual-kit-painted.js';
import { HIT_SECONDS } from './visual-phuong-hoang-timeline.js';
import layout from './visual-phuong-hoang-layout.json';

/**
 * Painted ids and draw passes (one material per id).
 * `foreground` (group 1): over monsters, under heroes and health: bird, feather hit, falling rain, carpet ignition.
 * `world` (group 0, `depthAlways`): ground decal and the sustained carpet fire, so seconds-long art never blankets enemies.
 */
export type PhoenixArtId = 'sweep' | 'hit' | 'rain' | 'flameFront' | 'flame' | 'carpet';
const SOURCE = { sweep: 'sweep', hit: 'hit', rain: 'rain', flameFront: 'flame', flame: 'flame', carpet: 'carpet' } as const;
const FOREGROUND: readonly PhoenixArtId[] = ['sweep', 'hit', 'rain', 'flameFront'];
const ANCHORS: Record<PhoenixArtId, number> = { sweep: layout['sweep-sheet'].anchorY, rain: layout['feather-rain-sheet'].anchorY,
  hit: layout['feather-hit-sheet'].anchorY, flame: layout['carpet-flame-sheet'].anchorY,
  flameFront: layout['carpet-flame-sheet'].anchorY, carpet: .5 };
export const PHOENIX_PLANES = 128;
const MAX_HITS = 32;
type Hit = { mesh?: Mesh; age: number; at: Vector3; size: number; reduced: boolean };

/** Coloured art of h041; hits are fed by the ultimate (already delayed along the lane), flight/carpet own the rest. */
export class PhoenixArt {
  readonly planes: KitPainted;
  private hits: Hit[] = [];
  private capLogged = false;
  constructor(private scene: Scene) { this.planes = new KitPainted(scene, PHOENIX_PLANES, 'phoenix'); }

  prepare(): void {
    for (const id of Object.keys(SOURCE) as PhoenixArtId[])
      this.planes.prepare(id, `/assets/vfx-phoenix-${SOURCE[id]}.webp`,
        FOREGROUND.includes(id) ? { foreground: true } : { depthAlways: id !== 'carpet' });
  }

  /** Feet of the art at `at`, `lift` along screen-up. */
  place(mesh: Mesh, id: PhoenixArtId, at: Vector3, size: number, height = 1, lift = 0): void {
    mesh.scaling.set(size, size * height, 1);
    mesh.position.copyFrom(billboardCenter(at, size * height, ANCHORS[id], screenUp(this.scene), lift));
  }

  hit(at: Vector3, reduced: boolean, size = 4.6): void {
    if (this.hits.length >= MAX_HITS) {
      if (!this.capLogged) debug('visual.phoenix.cap', { layer: 'hit', limit: MAX_HITS });
      this.capLogged = true; return;
    }
    const entry: Hit = { age: 0, at: at.clone(), size, reduced };
    this.hits.push(entry); this.draw(entry);
  }

  tick(dt: number): void {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const entry = this.hits[i]; entry.age += dt;
      const life = entry.reduced ? .25 : HIT_SECONDS;
      if (entry.age >= life) { this.planes.release(entry.mesh); this.hits.splice(i, 1); continue; }
      this.draw(entry);
    }
  }

  private draw(entry: Hit): void {
    entry.mesh ??= this.planes.acquire('hit');
    if (!entry.mesh) return;
    const frame = entry.reduced ? 2 : Math.min(7, Math.floor(entry.age / HIT_SECONDS * 8));
    this.planes.frame(entry.mesh, frame, 4, 2);
    // The burst swells while the feather lands, then settles; stays one pose for reduced motion.
    const swell = entry.reduced ? 1 : .8 + .35 * Math.min(1, entry.age / .12);
    this.place(entry.mesh, 'hit', entry.at, entry.size * swell, 1, entry.size * .12);
  }

  clear(): void { this.hits.length = 0; this.capLogged = false; this.planes.clear(); }
}
