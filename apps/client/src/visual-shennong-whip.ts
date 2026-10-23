import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import type { KitSpray } from './visual-kit-spray.js';

type Flash = { root: TransformNode; age: number; life: number };
const MAX_WHIPS = 20;

/**
 * Normal attack `trait-h01E` (the red herb whip) and the small heal motes of `herb-heal-h01E`. Unchanged look from
 * before the ultimate rebuild: the ultimate is the scope of the new art, the basic attack keeps its simple painter.
 */
export class ShennongWhip {
  private active: Flash[] = [];
  private petal: StandardMaterial;

  constructor(private scene: Scene, private spray: KitSpray) {
    this.petal = new StandardMaterial('shennong-peony', scene);
    this.petal.diffuseColor = Color3.FromHexString('#dd9ca7');
    this.petal.emissiveColor = this.petal.diffuseColor.scale(.18);
    this.petal.backFaceCulling = false;
  }

  attack(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    const start = from.add(new Vector3(0, 2, 0));
    const end = to.add(new Vector3(0, 1, 0));
    const delta = end.subtract(start), length = delta.length();
    if (length < .01 || this.active.length >= MAX_WHIPS) return;
    const root = new TransformNode('shennong-red-whip', this.scene);
    root.position.copyFrom(start.add(end).scale(.5));
    root.rotationQuaternion = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), delta.scale(1 / length), root.rotationQuaternion);
    const lash = MeshBuilder.CreateCylinder('red-herb-whip', {
      height: length, diameterTop: .1, diameterBottom: .22, tessellation: 7,
    }, this.scene);
    lash.parent = root; lash.material = this.petal; lash.isPickable = false;
    this.active.push({ root, age: 0, life: reduced ? .18 : .32 });
    debug('visual.shennong.attack', { eventId: event.id });
  }

  /** Motes lifting off each ally the normal attack healed (server `targets`; at most 20). */
  heal(targets: readonly Vector3[], reduced: boolean): void {
    if (reduced) return;
    for (const target of targets.slice(0, 20)) this.spray.trail(new Vector3(target.x, 1, target.z), new Vector3(0, 2.4, 0), 3);
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age < effect.life) continue;
      effect.root.dispose(false, false); this.active.splice(i, 1);
    }
  }

  clear(): void {
    for (const effect of this.active) effect.root.dispose(false, false);
    this.active.length = 0;
  }
}
