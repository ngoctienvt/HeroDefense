import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { SHENNONG } from '../../../content/shennong-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { frameSn, placeSn, snId } from './visual-shennong-art.js';
import { growMedicinalTree } from './visual-shennong-tree.js';
import { EXIT, rootFrame, ROOT_WIDTH, treeGrowth } from './visual-shennong-timeline.js';

type Entry = { at: Vector3; remaining: number; touched: boolean; reduced: boolean; ghost: boolean;
  roots?: Mesh; tree?: Mesh };
const MAX_TREES = 9;
/** Debug-only stand-in for the real tree actor (same art, same 7-unit height). */
const GHOST_TREE_WIDTH = 7;

/**
 * Roots of the three ancient trees. The tree actor itself (HP, block, death) is the server summon; this adds the
 * burst of roots/earth at its foot, makes the real prop rise from a sprout, and retracts the roots with the exit.
 * Age is derived from the snapshot `remaining`, so a reconnect mid-hold never replays the burst.
 */
export class ShennongRoots {
  private entries = new Map<string, Entry>();
  private up = Vector3.Up();

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {}

  mark(id: string, at: Vector3, remaining: number, reduced: boolean, ghost = false): void {
    if (![at.x, at.z, remaining].every(Number.isFinite) || remaining <= 0) return;
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= MAX_TREES) { debug('visual.shennong.cap', { layer: 'roots' }); return; }
      entry = { at: at.clone(), remaining, touched: true, reduced, ghost };
      this.entries.set(id, entry);
      if (!reduced && SHENNONG.zoneSeconds - remaining < .3) this.spray.ring(at, 1.6, 14, .3, 3.5, 4);
      debug('visual.shennong.tree', { remaining: +remaining.toFixed(2), reduced });
    }
    entry.at.copyFrom(at); entry.remaining = remaining; entry.reduced = reduced; entry.touched = true;
    // Applied on the first mark too, so the actor never shows one frame at full height before the sprout pose.
    growMedicinalTree(id, treeGrowth(Math.max(0, SHENNONG.zoneSeconds - remaining), reduced));
  }

  tick(): void {
    this.up = screenUp(this.scene);
    for (const [id, entry] of this.entries) {
      if (!entry.touched) { this.drop(id, entry); continue; }
      entry.touched = false;
      const age = Math.max(0, SHENNONG.zoneSeconds - entry.remaining);
      entry.roots ??= this.art.acquire(snId('roots'));
      if (entry.roots) {
        placeSn(entry.roots, 'roots', entry.at, ROOT_WIDTH, this.up);
        frameSn(this.art, entry.roots, 'roots', rootFrame(age, entry.remaining, entry.reduced));
        entry.roots.visibility = Math.min(1, entry.remaining / (EXIT * .5));
      }
      const growth = treeGrowth(age, entry.reduced);
      growMedicinalTree(id, growth);
      if (entry.ghost) this.ghost(entry, growth);
    }
  }

  clear(): void {
    for (const [id, entry] of [...this.entries]) { this.release(entry); this.entries.delete(id); }
  }

  private ghost(entry: Entry, growth: number): void {
    entry.tree ??= this.art.acquire(snId('tree'));
    if (!entry.tree) return;
    entry.tree.alphaIndex = GROUND_ALPHA_INDEX + 10; // above the roots it grows out of
    placeSn(entry.tree, 'tree', entry.at, GHOST_TREE_WIDTH * growth, this.up);
    entry.tree.visibility = Math.min(1, entry.remaining / (EXIT * .5));
  }

  private drop(id: string, entry: Entry): void {
    // A tree felled before the exit wilts in a puff of leaves; one that ran its course already retracted.
    if (entry.remaining > EXIT && !entry.reduced) this.spray.ring(entry.at, 1.2, 10, 1.2, 2, 2);
    this.release(entry); this.entries.delete(id);
  }

  private release(entry: Entry): void {
    this.art.release(entry.roots); this.art.release(entry.tree);
    entry.roots = entry.tree = undefined;
  }
}
