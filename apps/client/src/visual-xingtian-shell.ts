import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { SHELL_ANCHOR_Y, SHELL_EXIT_SECONDS, SHELL_HEIGHT, SHELL_MARKER_GRACE, SHELL_WIDTH, shellExitAge,
  shellFrame } from './visual-xingtian-timeline.js';

const MAX_SHELLS = 6;

type Shell = {
  id: string; at: Vector3; age: number; remaining: number; seen: boolean; lost: number; exit?: number;
  reduced: boolean; mesh?: Mesh; embers: number;
};

/**
 * The berserk shell: a left and a right armour/flame shard flanking Hình Thiên's torso for as long as the snapshot
 * `berserk.remaining` holds (≤ 5 s). The marker comes every frame (position + remaining); the shell forms, holds, and breaks
 * apart into falling ash during the last 0.3 s of the state, or when the marker stops early (death, zone change).
 * Foreground pass: over monsters, under heroes, so the hero stays crisp.
 */
export class XingtianShell {
  private shells = new Map<string, Shell>();

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    let shell = this.shells.get(id);
    if (!shell) {
      if (this.shells.size >= MAX_SHELLS) { debug('visual.xingtian.cap', { layer: 'shell' }); return; }
      shell = { id, at: at.clone(), age: 0, remaining, seen: true, lost: 0, reduced, embers: 0 };
      this.shells.set(id, shell);
      debug('visual.xingtian.shell-start', { remaining: +remaining.toFixed(2), reduced });
    }
    shell.at.copyFrom(at); shell.remaining = remaining; shell.seen = true; shell.reduced = reduced;
  }

  tick(dt: number, up: Vector3): void {
    for (const shell of [...this.shells.values()]) {
      shell.age += dt;
      if (shell.seen) shell.lost = 0; else shell.lost += dt;
      shell.seen = false;
      if (shell.exit === undefined) {
        const planned = shellExitAge(shell.remaining);
        if (planned !== undefined) shell.exit = planned;
        else if (shell.lost > SHELL_MARKER_GRACE) shell.exit = 0;
        if (shell.exit !== undefined) this.ash(shell);
      } else shell.exit += dt;
      if (shell.exit !== undefined && shell.exit >= SHELL_EXIT_SECONDS) { this.free(shell, 'end'); continue; }
      this.draw(shell, up);
      if (shell.exit === undefined && !shell.reduced) this.embers(shell, dt);
    }
  }

  clear(): void { for (const shell of [...this.shells.values()]) this.free(shell, 'clear'); }

  private draw(shell: Shell, up: Vector3): void {
    const pose = shellFrame(shell.age, shell.exit, shell.reduced);
    shell.mesh ??= this.art.acquire('shell');
    const mesh = shell.mesh;
    if (!mesh) return;
    mesh.position.copyFrom(billboardCenter(new Vector3(shell.at.x, 0, shell.at.z), SHELL_HEIGHT, SHELL_ANCHOR_Y, up));
    mesh.scaling.set(SHELL_WIDTH, SHELL_HEIGHT, 1);
    mesh.visibility = pose.alpha;
    this.art.frame(mesh, pose.frame, 4, 4);
  }

  /** A few embers lifting off the shards while it holds. */
  private embers(shell: Shell, dt: number): void {
    shell.embers += 9 * dt;
    const count = Math.floor(shell.embers);
    shell.embers -= count;
    const spray = this.bank.spray('warfire');
    for (let i = 0; i < count; i++) {
      const side = Math.random() < .5 ? -1 : 1;
      spray.trail(new Vector3(shell.at.x + side * (1.6 + Math.random() * .9), .6 + Math.random() * 2.4, shell.at.z), new Vector3(side * .6, 1.6, 0), 1);
    }
  }

  /** The shards fall apart: ash drops from both flanks. */
  private ash(shell: Shell): void {
    if (shell.reduced) return;
    this.bank.spray('warfire').ring(new Vector3(shell.at.x, 0, shell.at.z), 2.2, 18, 3.2, 1.2, .8);
  }

  private free(shell: Shell, reason: string): void {
    this.art.release(shell.mesh);
    this.shells.delete(shell.id);
    debug('visual.xingtian.shell-end', { reason });
  }
}
