import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Scene } from '@babylonjs/core/scene.js';
import { VisualMaterials } from './visual-materials.js';

type Arrow = { root: TransformNode; from: Vector3; to: Vector3; age: number; duration: number; arrive: () => void };

/** Small pooled bone arrows with a visible ember tip. */
export class VisualMonsterProjectiles {
  private active: Arrow[] = [];
  private pool: TransformNode[] = [];
  constructor(private scene: Scene, private palette: VisualMaterials) {}

  launch(from: Vector3, to: Vector3, arrive: () => void): void {
    if (this.active.length >= 48) this.release(this.active.shift()!);
    const root = this.pool.pop() ?? this.makeArrow();
    const start = from.add(new Vector3(0, 1.5, 0));
    const end = to.add(new Vector3(0, 1.3, 0));
    const direction = end.subtract(start);
    const distance = direction.length();
    root.rotationQuaternion ??= new Quaternion();
    if (distance > .001) Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.scale(1 / distance), root.rotationQuaternion);
    root.position.copyFrom(start);
    root.setEnabled(true);
    this.active.push({ root, from: start, to: end, age: 0,
      duration: Math.max(.18, Math.min(.38, distance / 22)), arrive });
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const arrow = this.active[i];
      arrow.age += dt;
      const progress = Math.min(1, arrow.age / arrow.duration);
      Vector3.LerpToRef(arrow.from, arrow.to, progress, arrow.root.position);
      arrow.root.position.y += Math.sin(progress * Math.PI) * .3;
      if (progress >= 1) {
        this.active.splice(i, 1);
        this.release(arrow);
        arrow.arrive();
      }
    }
  }

  clear(): void {
    for (const arrow of this.active) this.release(arrow);
    this.active.length = 0;
  }

  private release(arrow: Arrow): void {
    arrow.root.setEnabled(false);
    this.pool.push(arrow.root);
  }

  private makeArrow(): TransformNode {
    const root = new TransformNode('monster-bone-arrow', this.scene);
    const bone = this.palette.get('monster-arrow-bone', '#e8d5b4', .15);
    const ember = this.palette.get('monster-arrow-ember', '#ff812e', .75);
    const shaft = MeshBuilder.CreateCylinder('arrow-shaft', { height: .85, diameter: .075, tessellation: 7 }, this.scene);
    shaft.parent = root; shaft.material = bone; shaft.isPickable = false;
    const tip = MeshBuilder.CreateCylinder('arrow-tip', {
      height: .28, diameterTop: 0, diameterBottom: .19, tessellation: 6,
    }, this.scene);
    tip.parent = root; tip.position.y = .56; tip.material = ember; tip.isPickable = false;
    for (const side of [-1, 1]) {
      const feather = MeshBuilder.CreateBox('arrow-feather', { width: .22, height: .06, depth: .045 }, this.scene);
      feather.parent = root; feather.position.set(side * .1, -.38, 0);
      feather.rotation.z = side * .35; feather.material = ember; feather.isPickable = false;
    }
    return root;
  }
}
