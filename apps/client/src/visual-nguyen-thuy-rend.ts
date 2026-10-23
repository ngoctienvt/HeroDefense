import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { ntId, ntMeta, placeBillboard, setFrame } from './visual-nguyen-thuy-art.js';
import { breakFrame, hitDelay, NT_TIME, rendAlpha, rendFrame, rendGroundFrame } from './visual-nguyen-thuy-timeline.js';

/** Rift size on a monster and on the ground under it (world units, wide side). */
const REND_SIZE = 4.6;
const CRACK_SIZE = 3.4;
const BREAK_SIZE = 6.2;
const MAX_BREAKS = 4;
const MAX_PENDING = 96;

type Hit = { at: Vector3; delay: number; age: number; full: boolean; reduced: boolean; started: boolean; mesh?: Mesh; crack?: Mesh };
type Break = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
export interface RendPoint { at: Vector3; main: boolean }

/**
 * Spatial tear on every monster the server listed (one pass of 500 % true damage over the whole zone), never one R11 blast.
 * Each target gets a vertical rift in the skill pass (above the monster, below heroes/HP) and a flat crack on the ground;
 * the rifts open as the sword head passes them (spread of 0.3 s). Beyond the full-art cap only the ground crack is drawn.
 * Boss defence break: shell shards fall at the real Boss only.
 */
export class NguyenThuyRend {
  private hits: Hit[] = [];
  private breaks: Break[] = [];

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {}

  /** `along` of a target is measured on the lane `dir` (when proven) so the sweep follows the streams. */
  sweep(origin: Vector3, dir: { x: number; z: number } | undefined, reach: number, targets: readonly RendPoint[], reduced: boolean): void {
    const distance = (p: Vector3): number => Math.hypot(p.x - origin.x, p.z - origin.z);
    const ordered = [...targets].sort((a, b) => Number(b.main) - Number(a.main) || distance(a.at) - distance(b.at));
    let full = 0, ground = 0, skipped = 0;
    for (const target of ordered) {
      if (this.hits.length >= MAX_PENDING || ground >= NT_TIME.maxGroundRends) { skipped++; continue; }
      const isFull = full < NT_TIME.maxFullRends;
      if (isFull) full++; else ground++;
      const along = dir ? (target.at.x - origin.x) * dir.x + (target.at.z - origin.z) * dir.z : distance(target.at);
      this.hits.push({ at: target.at.clone(), delay: reduced ? 0 : hitDelay(along, reach), age: 0, full: isFull, reduced, started: false });
    }
    if (skipped > 0) debug('visual.nguyenthuy.cap', { layer: 'rend', skipped });
    debug('visual.nguyenthuy.rend', { full, groundOnly: ground, skipped, reduced });
  }

  bossBreak(at: Vector3, reduced: boolean): void {
    if (this.breaks.length >= MAX_BREAKS) { debug('visual.nguyenthuy.cap', { layer: 'break' }); return; }
    this.breaks.push({ at: at.clone(), age: 0, reduced });
    if (!reduced) this.spray.ring(at, 1.6, 28, 1.6, 3.4, 5);
    debug('visual.nguyenthuy.boss-break', { reduced });
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const hit = this.hits[i];
      if (hit.delay > 0) { hit.delay -= dt; if (hit.delay > 0) continue; }
      if (!hit.started) this.start(hit);
      hit.age += dt;
      const life = hit.reduced ? .3 : NT_TIME.rendSeconds;
      if (hit.age >= life) { this.free(hit); this.hits.splice(i, 1); continue; }
      this.draw(hit, up);
    }
    for (let i = this.breaks.length - 1; i >= 0; i--) {
      const item = this.breaks[i];
      item.age += dt;
      if (item.age >= (item.reduced ? .35 : NT_TIME.breakSeconds)) { this.art.release(item.mesh); this.breaks.splice(i, 1); continue; }
      item.mesh ??= this.art.acquire(ntId('breakSheet'));
      if (!item.mesh) continue;
      placeBillboard(item.mesh, 'breakSheet', item.at, BREAK_SIZE, up, .3);
      setFrame(this.art, item.mesh, 'breakSheet', breakFrame(item.age, item.reduced));
      item.mesh.visibility = Math.min(1, (NT_TIME.breakSeconds - item.age) / .25);
    }
  }

  clear(): void {
    for (const hit of this.hits) this.free(hit);
    for (const item of this.breaks) this.art.release(item.mesh);
    this.hits.length = this.breaks.length = 0;
  }

  private start(hit: Hit): void {
    hit.started = true;
    if (!hit.reduced && hit.full) this.spray.ring(hit.at, .5, 7, .8, 2.6, 4.2);
  }

  private draw(hit: Hit, up: Vector3): void {
    const alpha = hit.reduced ? .8 : rendAlpha(hit.age);
    hit.crack ??= this.art.acquire(ntId('rendGround'), true);
    if (hit.crack) {
      const meta = ntMeta('rendGround');
      if (meta) hit.crack.scaling.set(CRACK_SIZE, CRACK_SIZE * meta.height / meta.width, 1);
      hit.crack.position.set(hit.at.x, .065, hit.at.z);
      setFrame(this.art, hit.crack, 'rendGround', rendGroundFrame(hit.age, hit.reduced));
      hit.crack.visibility = alpha * .9;
    }
    if (!hit.full) return;
    hit.mesh ??= this.art.acquire(ntId('rend'));
    if (!hit.mesh) return;
    placeBillboard(hit.mesh, 'rend', hit.at, REND_SIZE, up, .15);
    setFrame(this.art, hit.mesh, 'rend', rendFrame(hit.age, hit.reduced));
    hit.mesh.visibility = alpha;
  }

  private free(hit: Hit): void {
    this.art.release(hit.mesh); this.art.release(hit.crack);
    hit.mesh = undefined; hit.crack = undefined;
  }
}
