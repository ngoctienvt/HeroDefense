import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { IMPACT_ANCHOR_Y, IMPACT_LIFT, IMPACT_SIZE, impactAlpha, impactFrame, impactLife } from './visual-xingtian-timeline.js';

type Impact = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
const MAX_IMPACTS = 24;

/**
 * Where a fire wave reaches a monster the server listed: the Codex wave-impact sheet (seed → axe-cut → flame splash → curl →
 * ash, billboard at the monster in the foreground pass) plus a few scarlet sparks. Purely a flare: it adds no damage area.
 */
export class XingtianImpacts {
  private impacts: Impact[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  spawn(at: Vector3, reduced: boolean): void {
    if (this.impacts.length >= MAX_IMPACTS) this.free(this.impacts[0]);
    this.impacts.push({ at: at.clone(), age: 0, reduced });
    if (!reduced) this.bank.spray('warfire').ring(new Vector3(at.x, 0, at.z), .3, 8, .8, 2.6, 3.6);
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const impact = this.impacts[i];
      impact.age += dt;
      if (impact.age >= impactLife(impact.reduced)) { this.free(impact); continue; }
      impact.mesh ??= this.art.acquire('impact');
      const mesh = impact.mesh;
      if (!mesh) continue;
      mesh.position.copyFrom(billboardCenter(new Vector3(impact.at.x, 0, impact.at.z), IMPACT_SIZE, IMPACT_ANCHOR_Y, up, IMPACT_LIFT));
      mesh.scaling.setAll(IMPACT_SIZE);
      mesh.visibility = impactAlpha(impact.age, impact.reduced);
      this.art.frame(mesh, impactFrame(impact.age, impact.reduced), 4, 2);
    }
  }

  clear(): void { for (const impact of [...this.impacts]) this.free(impact); }

  private free(impact: Impact): void {
    this.art.release(impact.mesh);
    const index = this.impacts.indexOf(impact);
    if (index >= 0) this.impacts.splice(index, 1);
  }
}
