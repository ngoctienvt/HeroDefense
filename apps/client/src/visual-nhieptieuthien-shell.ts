import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { FLECK_GATE, NHIEP_ATLAS, SHELL_FADE, SHELL_STILL_FRAME,
  shellAlpha, shellFrame, shellScale } from './visual-nhieptieuthien-timeline.js';

/** 3 allies per Tiểu Thiến for 5 s; ~3 Tiểu Thiến on a four-player board at most; matches the frost atlas capacity. */
const MAX_SHELLS = 10;
type Shell = {
  sprite?: Sprite; at: Vector3; age: number; sinceMark: number; reduced: boolean; lastFleck: number;
};

/**
 * The Frost Shield around an ally while the snapshot holds `frostShield` (server confirms the heal overflowed;
 * combat.ts keeps it 5 s): the ice shell flipbook (its centre column is empty so the ally stays crisp), no ground
 * ring. Gone one fade after the snapshot stops.
 */
export class NhiepShells {
  private shells = new Map<string, Shell>();
  private time = 0;

  constructor(private flipbooks: KitFlipbooks, private flecks: KitSpray) {}

  /** Snapshot marker `frostshield` on an ally, every frame the shield holds. */
  mark(id: string, at: Vector3, reduced: boolean): void {
    let shell = this.shells.get(id);
    if (!shell) {
      if (this.shells.size >= MAX_SHELLS) { debug('visual.kit.pool.cap', { pool: 'nhieptieuthien-shell' }); return; }
      const sprite = this.flipbooks.spawn(NHIEP_ATLAS.frost, at, 1);
      shell = { sprite, at: at.clone(), age: 0, sinceMark: 0, reduced, lastFleck: this.time };
      this.shells.set(id, shell);
      debug('visual.nhieptieuthien.shield.start', { reduced, sprite: Boolean(sprite) });
    }
    shell.at.copyFrom(at);
    shell.sinceMark = 0;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (const [id, shell] of this.shells) {
      shell.age += dt; shell.sinceMark += dt;
      if (shell.sinceMark >= SHELL_FADE) { this.end(shell); this.shells.delete(id); debug('visual.nhieptieuthien.shield.end', { seconds: Math.round(shell.age * 10) / 10 }); continue; }
      // Marks arrive every frame while the shield holds; the first missed frame starts the fade.
      const sinceLast = Math.max(0, shell.sinceMark - dt * 1.5);
      const age = shell.reduced ? 1 : shell.age;
      if (shell.sprite) {
        this.flipbooks.place(NHIEP_ATLAS.frost, shell.sprite, shell.at, shellScale(age));
        shell.sprite.cellIndex = shell.reduced ? SHELL_STILL_FRAME : shellFrame(shell.age);
        shell.sprite.color.a = shellAlpha(age, sinceLast);
      }
      if (!shell.reduced && time - shell.lastFleck >= FLECK_GATE) {
        shell.lastFleck = time;
        this.flecks.trail(new Vector3(shell.at.x, .5, shell.at.z), new Vector3(0, 1.1, 0), 2);
      }
    }
  }

  clear(): void {
    for (const shell of this.shells.values()) this.end(shell);
    this.shells.clear();
  }

  private end(shell: Shell): void {
    this.flipbooks.release(NHIEP_ATLAS.frost, shell.sprite);
    if (shell.sprite) shell.sprite.color.a = 1;
  }
}
