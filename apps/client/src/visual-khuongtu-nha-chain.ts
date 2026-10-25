import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { CHAIN_FROM_HEIGHT, CHAIN_LIFE, CHAIN_TO_HEIGHT, chainAlpha, chainDelay, chainReveal, chainWidth } from './visual-khuongtu-nha-timeline.js';

type Link = { from: Vector3; to: Vector3; age: number; mesh?: Mesh };
const MAX_LINKS = 24;

/**
 * Basic attack `trait-h019`: the thunder jumps from the hero to the first target and on along the server's chain order,
 * one painted strip per link (side-on art built with `placeStrip`, head on +X, never mirrored). A small jade flare marks
 * each target as the head arrives. `targets` are the hit positions in the server's chain order.
 */
export class KhuongtuChain {
  private links: Link[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  launch(origin: Vector3, targets: readonly Vector3[], reduced: boolean): number {
    let previous = new Vector3(origin.x, CHAIN_FROM_HEIGHT, origin.z), count = 0;
    targets.forEach((target, i) => {
      const to = new Vector3(target.x, CHAIN_TO_HEIGHT, target.z);
      const delay = reduced ? 0 : chainDelay(i);
      if (this.links.length >= MAX_LINKS) { debug('visual.khuongtu.cap', { layer: 'chain' }); return; }
      if (Vector3.Distance(previous, to) > .3) {
        // Held until its turn: the link starts at -delay and only draws once its age is positive.
        this.links.push({ from: previous.clone(), to, age: -delay });
        count++;
      }
      this.bank.after(delay + (reduced ? 0 : .04), () => this.flare(target, reduced));
      previous = to;
    });
    return count;
  }

  tick(dt: number): void {
    if (!this.links.length) return;
    const look = cameraLook(this.scene);
    for (let i = this.links.length - 1; i >= 0; i--) {
      const link = this.links[i];
      link.age += dt;
      if (link.age >= CHAIN_LIFE) { this.free(link); continue; }
      if (link.age < 0) continue;
      link.mesh ??= this.art.acquire('bolt');
      if (!link.mesh) continue;
      const direction = link.to.subtract(link.from), length = direction.length();
      const reveal = Math.max(.05, chainReveal(link.age));
      const head = Vector3.Lerp(link.from, link.to, reveal);
      if (!placeStrip(link.mesh, head, direction, look, length * reveal, chainWidth(length))) { this.free(link); continue; }
      link.mesh.visibility = chainAlpha(link.age);
    }
  }

  clear(): void { for (const link of [...this.links]) this.free(link); }

  private flare(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, 1.1, 'jade', { life: .26, fill: .2, rim: 1, alpha: .8, reduced, order: 5 });
    if (!reduced) this.bank.spray('jade').ring(at, .25, 7, .2, 1.6, 2.6);
  }

  private free(link: Link): void {
    resetStrip(link.mesh);
    this.art.release(link.mesh);
    const index = this.links.indexOf(link);
    if (index >= 0) this.links.splice(index, 1);
  }
}
