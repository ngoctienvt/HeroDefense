import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Crystal = { mesh: Mesh; age: number; life: number; from?: Vector3; to?: Vector3 };
const COLORS = ['#e66f78', '#ebbe72', '#94dfb2', '#79c9e8', '#ba9be9'];
const MAX_CRYSTALS = 48;

/**
 * Nữ Oa's normal attack (`trait-h01C`: one five-colour stone thrown at the target) and the shield accent of that hit
 * (`stone-blessing-h01C`: facets circling each ally that got the 300 shield). These are the original small stones and are
 * not part of the ultimate rebuild; they share nothing with the painted rift/rain layers.
 */
export class NuwaStones {
  private active: Crystal[] = [];
  private pool: Mesh[] = [];
  private readonly materials: StandardMaterial[];

  constructor(private scene: Scene) {
    this.materials = COLORS.map((hex, index) => {
      const material = new StandardMaterial(`nuwa-crystal-${index}`, scene);
      material.diffuseColor = Color3.FromHexString(hex);
      material.emissiveColor = material.diffuseColor.scale(.28);
      material.alpha = .78; material.backFaceCulling = false; material.disableDepthWrite = true;
      return material;
    });
  }

  private crystal(at: Vector3, color: number, size: number, life: number, from?: Vector3): void {
    if (this.active.length >= MAX_CRYSTALS) return;
    const mesh = this.pool.pop() ?? MeshBuilder.CreatePolyhedron('nuwa-five-color-stone', { type: 1, size: 1 }, this.scene);
    mesh.material = this.materials[color % COLORS.length];
    mesh.position.copyFrom(from ?? at); mesh.scaling.set(size * .65, size, size * .65);
    mesh.visibility = 1; mesh.isPickable = false; mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, life, from: from?.clone(), to: from ? at.clone() : undefined });
  }

  attack(event: GameEvent, from: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    for (const [index, at] of targets.slice(0, reduced ? 5 : 15).entries())
      this.crystal(at.clone().addInPlace(new Vector3(0, 1.2, 0)), index, reduced ? .35 : .6,
        reduced ? .16 : .3, from.clone().addInPlace(new Vector3(0, 2.1, 0)));
    debug('visual.nuwa.attack', { eventId: event.id, targets: targets.length });
  }

  shieldFacets(event: GameEvent, targets: readonly Vector3[], reduced: boolean): void {
    for (const [index, at] of targets.slice(0, reduced ? 12 : 30).entries()) {
      for (let facet = 0; facet < (reduced ? 1 : 5); facet++) {
        const angle = facet * Math.PI * 2 / 5;
        this.crystal(new Vector3(at.x + Math.cos(angle) * .9, 2.3, at.z + Math.sin(angle) * .9),
          index + facet, reduced ? .35 : .48, reduced ? .25 : .65);
      }
    }
    debug('visual.nuwa.stone-blessing', { eventId: event.id, allies: targets.length, reduced });
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age >= effect.life) {
        effect.mesh.setEnabled(false); this.pool.push(effect.mesh);
        this.active.splice(i, 1); continue;
      }
      const phase = effect.age / effect.life;
      if (effect.from && effect.to) effect.mesh.position.copyFrom(Vector3.Lerp(effect.from, effect.to, phase));
      effect.mesh.rotation.y += dt * 2;
      effect.mesh.visibility = 1 - phase * .8;
    }
  }

  clear(): void {
    for (const effect of this.active) { effect.mesh.setEnabled(false); this.pool.push(effect.mesh); }
    this.active.length = 0;
  }
}
