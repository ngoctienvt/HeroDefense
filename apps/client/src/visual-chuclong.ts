import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

type Echo = { root: TransformNode; age: number; life: number };

/** Dragon eyes over the battlefield; ambient change is always restored. */
export class VisualChuclong {
  private active: Echo[] = [];
  private originalAmbient?: Color3;
  private darkRemaining = 0;
  private readonly scarlet: StandardMaterial;
  private readonly midnight: StandardMaterial;
  private readonly sun: StandardMaterial;
  private readonly ice: StandardMaterial;
  private readonly solarGround: StandardMaterial;

  constructor(private readonly scene: Scene) {
    this.scarlet = this.material('chuclong-dragon-scarlet', '#9b3b34', .25);
    this.midnight = this.material('chuclong-night-eye', '#372d57', .23);
    this.sun = this.material('chuclong-sun-eye', '#ffd46b', .65);
    this.ice = this.material('chuclong-winter-ice', '#8ec5dc', .12);
    this.ice.alpha = .72;
    this.solarGround = this.material('chuclong-solar-ground', '#d97935', .16);
    this.solarGround.alpha = .19;
  }

  private material(name: string, hex: string, glow: number): StandardMaterial {
    const mat = new StandardMaterial(name, this.scene);
    mat.diffuseColor = Color3.FromHexString(hex);
    mat.emissiveColor = mat.diffuseColor.scale(glow);
    mat.backFaceCulling = false; mat.disableDepthWrite = true;
    return mat;
  }

  private eyes(at: Vector3, open: boolean, reduced: boolean): void {
    if (this.active.length >= 12) return;
    const root = new TransformNode(open ? 'chuclong-open-sun-eyes' : 'chuclong-closed-night-eyes', this.scene);
    root.position.copyFrom(at.add(new Vector3(0, reduced ? 5 : 13, 0)));
    for (const side of [-1, 1]) {
      const arc = MeshBuilder.CreateTorus('scarlet-dragon-brow', {
        diameter: reduced ? 2.6 : 5.3, thickness: reduced ? .2 : .35, tessellation: 24,
      }, this.scene);
      arc.parent = root; arc.position.x = side * (reduced ? 1.8 : 3.7);
      arc.scaling.y = .32; arc.rotation.x = Math.PI / 2;
      arc.material = this.scarlet; arc.isPickable = false;
      const eye = MeshBuilder.CreateSphere('dragon-solar-eye', { diameter: 1, segments: 16 }, this.scene);
      eye.parent = root; eye.position.x = arc.position.x;
      eye.scaling.set(reduced ? 1.05 : 2.1, open ? (reduced ? .52 : 1.05) : .08, .28);
      eye.material = open ? this.sun : this.midnight; eye.isPickable = false;
      if (open) {
        const pupil = MeshBuilder.CreateSphere('dragon-eye-pupil', { diameter: 1, segments: 10 }, this.scene);
        pupil.parent = root; pupil.position.set(eye.position.x, 0, -.28);
        pupil.scaling.set(reduced ? .18 : .4, reduced ? .47 : .9, .16);
        pupil.material = this.scarlet; pupil.isPickable = false;
      }
    }
    this.active.push({ root, age: 0, life: open ? .65 : 1.5 });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.eyes(at, false, reduced);
    debug('visual.chuclong.cast', { eventId: event.id, reduced });
  }

  breath(event: GameEvent, from: Vector3, to: Vector3, reduced: boolean): void {
    if (this.active.length >= 12) return;
    const start = from.add(new Vector3(0, 2.1, 0)), end = to.add(new Vector3(0, 1.2, 0));
    const direction = end.subtract(start), length = Math.min(10, direction.length());
    if (length < .01) return;
    const root = new TransformNode('chuclong-primordial-breath', this.scene);
    root.position.copyFrom(start.add(end).scale(.5));
    root.rotationQuaternion = new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), root.rotationQuaternion);
    const flame = MeshBuilder.CreateCylinder('solar-fire-tongue', {
      height: length, diameterTop: reduced ? .45 : .85, diameterBottom: reduced ? 1.1 : 2.3,
      tessellation: 7,
    }, this.scene);
    flame.parent = root; flame.material = this.sun; flame.isPickable = false;
    const core = MeshBuilder.CreateCylinder('scarlet-dragon-breath', {
      height: length * .82, diameterTop: .16, diameterBottom: reduced ? .55 : 1.3,
      tessellation: 7,
    }, this.scene);
    core.parent = root; core.material = this.scarlet; core.isPickable = false;
    this.active.push({ root, age: 0, life: reduced ? .18 : .34 });
    debug('visual.chuclong.breath', { eventId: event.id });
  }

  winter(event: GameEvent, at: Vector3, targets: Vector3[], reduced: boolean): void {
    if (!reduced) {
      this.originalAmbient ??= this.scene.ambientColor.clone();
      this.scene.ambientColor = Color3.FromHexString('#182945');
      this.darkRemaining = Math.max(this.darkRemaining, 1.5);
    }
    this.eyes(at, false, reduced);
    if (this.active.length < 12 && targets.length) {
      const root = new TransformNode('chuclong-winter-ice-shards', this.scene);
      for (const point of targets.slice(0, reduced ? 5 : 16)) {
        for (const side of [-1, 1]) {
          const spike = MeshBuilder.CreateCylinder('primordial-ice-spike', {
            height: reduced ? 1.1 : 2.2, diameterTop: 0, diameterBottom: reduced ? .35 : .7,
            tessellation: 4,
          }, this.scene);
          spike.parent = root;
          spike.position.set(point.x + side * .42, reduced ? .55 : 1.1, point.z);
          spike.rotation.z = side * .25;
          spike.material = this.ice; spike.isPickable = false;
        }
      }
      this.active.push({ root, age: 0, life: reduced ? .45 : 1.25 });
    }
    debug('visual.chuclong.winter', { eventId: event.id, reduced });
  }

  summer(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.restoreAmbient();
    this.eyes(at, true, reduced);
    if (this.active.length < 12) {
      const root = new TransformNode('chuclong-solar-eruption', this.scene);
      root.position.copyFrom(at);
      const disc = MeshBuilder.CreateCylinder('solar-ground-disc', {
        height: .08, diameter: reduced ? 15 : 24, tessellation: 36,
      }, this.scene);
      disc.parent = root; disc.position.y = .06;
      disc.material = this.solarGround; disc.isPickable = false;
      const sun = MeshBuilder.CreateSphere('solar-burst-body', {
        diameter: reduced ? 2.5 : 4, segments: 20,
      }, this.scene);
      sun.parent = root; sun.position.y = reduced ? 6 : 11;
      sun.scaling.y = .22; sun.material = this.sun; sun.isPickable = false;
      this.active.push({ root, age: 0, life: reduced ? .28 : .68 });
    }
    debug('visual.chuclong.summer', { eventId: event.id, reduced });
  }

  private restoreAmbient(): void {
    if (this.originalAmbient) this.scene.ambientColor = this.originalAmbient;
    this.originalAmbient = undefined;
    this.darkRemaining = 0;
  }

  tick(dt: number): void {
    if (this.darkRemaining > 0 && (this.darkRemaining -= dt) <= 0) this.restoreAmbient();
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      if (fx.age >= fx.life) {
        fx.root.dispose(false, false); this.active.splice(i, 1);
      } else fx.root.scaling.setAll(1 + fx.age / fx.life * .08);
    }
  }

  clear(): void {
    this.restoreAmbient();
    for (const fx of this.active) fx.root.dispose(false, false);
    this.active.length = 0;
  }
}
