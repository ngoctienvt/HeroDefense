import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Flash = { root: TransformNode; age: number; life: number };
type Grove = { root: TransformNode; touched: boolean };

/** Bronze medicine vessel, visible roots and herb flowers; lifecycle follows server snapshots. */
export class VisualShennong {
  private active: Flash[] = [];
  private groves = new Map<string, Grove>();
  private pool: TransformNode[] = [];
  private readonly bronze: StandardMaterial;
  private readonly jade: StandardMaterial;
  private readonly rootMat: StandardMaterial;
  private readonly petal: StandardMaterial;
  private readonly mist: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.bronze = this.material('shennong-bronze', '#746b41', .15);
    this.jade = this.material('shennong-jade', '#56bf9b', .32);
    this.rootMat = this.material('shennong-roots', '#527151', .12);
    this.petal = this.material('shennong-peony', '#dd9ca7', .18);
    this.mist = this.material('shennong-herbal-mist', '#79d0a1', .1);
    this.mist.alpha = .3;
    this.mist.disableDepthWrite = true;
  }

  private material(name: string, hex: string, glow: number): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = Color3.FromHexString(hex);
    mat.emissiveColor = mat.diffuseColor.scale(glow);
    mat.backFaceCulling = false;
    return mat;
  }

  private herbScene(): TransformNode {
    const root = new TransformNode('shennong-medicine-grove', this.scene);
    const vessel = MeshBuilder.CreateCylinder('ancient-bronze-cauldron', {
      height: 2.2, diameterTop: 3.2, diameterBottom: 2.3, tessellation: 12,
    }, this.scene);
    vessel.parent = root; vessel.position.y = 1.9; vessel.material = this.bronze;
    const rim = MeshBuilder.CreateTorus('cauldron-jade-rim', {
      diameter: 3.2, thickness: .22, tessellation: 18,
    }, this.scene);
    rim.parent = root; rim.position.y = 3; rim.material = this.jade;
    for (let i = 0; i < 4; i++) {
      const cloud = MeshBuilder.CreateSphere('herbal-vapor', { diameter: 1, segments: 8 }, this.scene);
      cloud.parent = root;
      cloud.position.set((i % 2 ? 1 : -1) * .65, 3.25 + (i >> 1) * .45, i % 2 ? .3 : -.3);
      cloud.scaling.set(1.2 + i * .2, .42, .8 + i * .1);
      cloud.material = this.mist; cloud.isPickable = false;
    }
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      const leg = MeshBuilder.CreateCylinder('bronze-ding-leg', { height: .85, diameter: .3 }, this.scene);
      leg.parent = root; leg.position.set(Math.cos(a), .42, Math.sin(a)); leg.material = this.bronze;
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * Math.PI * 2 / 12;
      const length = 5.8 + i % 3 * .7;
      const vine = MeshBuilder.CreateCylinder('emerging-tree-root', {
        height: length, diameterTop: .08, diameterBottom: .3, tessellation: 6,
      }, this.scene);
      vine.parent = root; vine.position.set(Math.cos(angle) * length * .43, .12,
        Math.sin(angle) * length * .43);
      vine.rotation.z = Math.PI / 2;
      vine.rotation.y = -angle;
      vine.material = this.rootMat;
      if (i % 3 === 0) this.flower(root, Math.cos(angle) * length * .8, Math.sin(angle) * length * .8);
    }
    root.getChildMeshes().forEach(mesh => { mesh.isPickable = false; });
    return root;
  }

  private flower(root: TransformNode, x: number, z: number): void {
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const petal = MeshBuilder.CreateSphere('medicine-peony-petal', { diameter: 1, segments: 6 }, this.scene);
      petal.parent = root; petal.position.set(x + Math.cos(a) * .48, .45, z + Math.sin(a) * .48);
      petal.scaling.set(.66, .2, .38); petal.rotation.y = -a;
      petal.material = this.petal; petal.isPickable = false;
    }
  }

  cast(event: GameEvent, at: Vector3): void {
    this.flash(at, .25, .23);
    debug('visual.shennong.cast', { eventId: event.id });
  }

  attack(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    const start = from.add(new Vector3(0, 2, 0));
    const end = to.add(new Vector3(0, 1, 0));
    const delta = end.subtract(start), length = delta.length();
    if (length < .01 || this.active.length >= 20) return;
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

  impact(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.flash(at, reduced ? .24 : .42, reduced ? .32 : .6);
    debug('visual.shennong.impact', { eventId: event.id, reduced });
  }

  private flash(at: Vector3, scale: number, life: number): void {
    if (this.active.length >= 20) return;
    const root = this.pool.pop() ?? this.herbScene();
    root.position.copyFrom(at); root.scaling.setAll(scale); root.setEnabled(true);
    this.active.push({ root, age: 0, life });
  }

  markGrove(id: string, at: Vector3): void {
    let grove = this.groves.get(id);
    if (!grove) {
      if (this.groves.size >= 8) return;
      grove = { root: this.pool.pop() ?? this.herbScene(), touched: false };
      this.groves.set(id, grove); grove.root.setEnabled(true);
    }
    grove.root.position.copyFrom(at); grove.root.scaling.setAll(1); grove.touched = true;
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i]; effect.age += dt;
      if (effect.age < effect.life) continue;
      effect.root.setEnabled(false);
      if (effect.root.name === 'shennong-medicine-grove') this.pool.push(effect.root);
      else effect.root.dispose(false, false);
      this.active.splice(i, 1);
    }
    for (const [id, grove] of this.groves) {
      if (grove.touched) grove.touched = false;
      else { grove.root.setEnabled(false); this.pool.push(grove.root); this.groves.delete(id); }
    }
  }

  clear(): void {
    for (const effect of this.active) {
      effect.root.setEnabled(false);
      if (effect.root.name === 'shennong-medicine-grove') this.pool.push(effect.root);
      else effect.root.dispose(false, false);
    }
    this.active.length = 0;
    for (const grove of this.groves.values()) { grove.root.setEnabled(false); this.pool.push(grove.root); }
    this.groves.clear();
  }
}
