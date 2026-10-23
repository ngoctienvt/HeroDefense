import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { HAUNGHE as H } from '../../../content/hau-nghe-design.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { BLAST_LIFE, DETONATION_ANCHOR_Y, DETONATION_SIZE, detonationAlpha, detonationFrame, SCORCH_SIZE,
  scorchPose } from './visual-hau-nghe-timeline.js';

type Blast = { at: Vector3; age: number; reduced: boolean; det?: Mesh; scorch?: Mesh };
const MAX_BLASTS = 4;

/**
 * The single R6.5 blast at the coordinate the server confirmed: compression → solar fire ring → shard burst →
 * ash (Codex detonation sheet, billboard in the foreground pass: over monsters, under heroes), a flat scorch
 * decal that cools in 1.1 s (never a damage zone), a shock ring that marks the exact gameplay edge, and
 * sparks/embers flying out. One resolve = one blast; the nine suns are a motif and never n hits.
 */
export class HauNgheBlast {
  private blasts: Blast[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  play(at: Vector3, reduced: boolean): boolean {
    if (this.blasts.length >= MAX_BLASTS) this.free(this.blasts[0]);
    this.blasts.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, H.blastRadius, 'solar', { life: .55, fill: .04, rim: 1, alpha: .95, reduced, order: 6 });
    this.bank.ring(at, 2.6, 'gold', { life: .35, fill: .4, rim: 1, alpha: .85, hold: true, reduced, order: 7 });
    if (!reduced) {
      this.bank.spray('solar').ring(at, .9, 52, .35, 6.8, 8.5);
      this.bank.spray('lava').ring(at, H.blastRadius * .85, 34, .1, 1.6, 3.6);
    }
    return true;
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.blasts.length - 1; i >= 0; i--) {
      const blast = this.blasts[i];
      blast.age += dt;
      if (blast.age >= BLAST_LIFE) { this.free(blast); continue; }
      this.draw(blast, up);
    }
  }

  clear(): void { for (const blast of [...this.blasts]) this.free(blast); }

  private draw(blast: Blast, up: Vector3): void {
    const { at, age, reduced } = blast;
    const alpha = detonationAlpha(age, reduced);
    if (alpha > 0) {
      blast.det ??= this.art.acquire('detonation');
      if (blast.det) {
        blast.det.position.copyFrom(billboardCenter(new Vector3(at.x, 0, at.z), DETONATION_SIZE, DETONATION_ANCHOR_Y, up));
        blast.det.scaling.setAll(DETONATION_SIZE);
        blast.det.visibility = alpha;
        this.art.frame(blast.det, detonationFrame(age, reduced), 4, 4);
      }
    } else if (blast.det) { this.art.release(blast.det); blast.det = undefined; }
    const pose = scorchPose(age);
    blast.scorch ??= this.art.acquire('scorch', true);
    if (!blast.scorch) return;
    blast.scorch.position.set(at.x, .06, at.z);
    blast.scorch.scaling.setAll(SCORCH_SIZE * pose.scale);
    blast.scorch.visibility = pose.alpha;
  }

  private free(blast: Blast): void {
    this.art.release(blast.det); this.art.release(blast.scorch);
    const index = this.blasts.indexOf(blast);
    if (index >= 0) this.blasts.splice(index, 1);
  }
}
