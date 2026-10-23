import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BAOQUATU_ATLAS, MIST_RADIUS, MIST_SPIN, MIST_URL, mistAlpha, mistPlaneSide, mistScale, PLANT_MARK_GAP,
  PLANT_WITHER_SECONDS, plantFrame, plantWitherFrame, SPORE_GATE, STILL_PLANT_FRAME } from './visual-baoquatu-timeline.js';

/** Plants are one per cast (10.5 s cooldown, 6 s life); four players never need more. */
const MAX_PLANTS = 8;

type Plant = {
  mesh: Mesh; material: StandardMaterial; sprite?: Sprite; at: Vector3;
  age: number; sinceMark: number; witherAge: number; sinceSpore: number; reduced: boolean;
};

/**
 * Hoa Ăn Thịt while the snapshot still holds its `summon_plant` unit: the flytrap flipbook grows, chomps in a
 * loop and withers once the marks stop (6 s timeout or killed), over a painted spore-mist decal of the 3.0
 * sunder radius that stays under every actor. Marks arrive every frame; the first gap starts the wither.
 */
export class BaoquatuPlants {
  private plants = new Map<string, Plant>();
  private free: Pick<Plant, 'mesh' | 'material'>[] = [];
  private created = 0;
  private texture: Texture;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.texture = new Texture(MIST_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'baoquatu-mist' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'baoquatu-mist', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** Snapshot marker `plant`, every frame the summoned plant exists. */
  mark(id: string, at: Vector3, reduced: boolean): void {
    let plant = this.plants.get(id);
    if (!plant) {
      const slot = this.acquire();
      if (!slot) return;
      plant = { ...slot, at: at.clone(), age: 0, sinceMark: 0, witherAge: 0, sinceSpore: SPORE_GATE, reduced };
      plant.sprite = this.flipbooks.spawn(BAOQUATU_ATLAS.plant, at, 1);
      plant.mesh.setEnabled(true);
      plant.mesh.rotation.y = Math.random() * Math.PI * 2;
      this.plants.set(id, plant);
      debug('visual.baoquatu.plant.start', { reduced, sprite: Boolean(plant.sprite) });
    }
    plant.at.copyFrom(at);
    plant.sinceMark = 0;
    plant.witherAge = 0;
  }

  tick(dt: number): void {
    for (const [id, plant] of this.plants) {
      plant.age += dt;
      plant.sinceMark += dt;
      const withering = plant.sinceMark > PLANT_MARK_GAP;
      if (withering) plant.witherAge += dt;
      if (withering && plant.witherAge >= PLANT_WITHER_SECONDS) {
        this.release(plant);
        this.plants.delete(id);
        debug('visual.baoquatu.plant.end');
        continue;
      }
      if (plant.sprite) {
        plant.sprite.cellIndex = withering ? plantWitherFrame(plant.witherAge)
          : plant.reduced ? STILL_PLANT_FRAME : plantFrame(plant.age);
        this.flipbooks.place(BAOQUATU_ATLAS.plant, plant.sprite, plant.at, 1);
      }
      const side = mistPlaneSide(MIST_RADIUS) * mistScale(plant.age);
      plant.mesh.position.set(plant.at.x, .04, plant.at.z);
      plant.mesh.scaling.set(side, 1, side);
      if (!plant.reduced) plant.mesh.rotation.y -= MIST_SPIN * dt;
      plant.material.alpha = mistAlpha(plant.age, withering ? plant.witherAge : 0);
      plant.sinceSpore += dt;
      if (!plant.reduced && !withering && plant.sinceSpore >= SPORE_GATE) {
        plant.sinceSpore = 0;
        const angle = Math.random() * Math.PI * 2, radius = MIST_RADIUS * Math.sqrt(Math.random());
        this.spray.trail(new Vector3(plant.at.x + Math.cos(angle) * radius, .3, plant.at.z + Math.sin(angle) * radius),
          new Vector3(0, 1.1, 0), 1);
      }
    }
  }

  clear(): void {
    for (const plant of this.plants.values()) this.release(plant);
    this.plants.clear();
  }

  private acquire(): Pick<Plant, 'mesh' | 'material'> | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_PLANTS) { debug('visual.kit.pool.cap', { pool: 'baoquatu-mist' }); return undefined; }
    const name = `baoquatu-mist-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // the front of the mist must not slice legs standing in it
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 1; // floor decal: every actor draws over it
    mesh.setEnabled(false);
    return { mesh, material };
  }

  private release(plant: Plant): void {
    plant.mesh.setEnabled(false);
    this.flipbooks.release(BAOQUATU_ATLAS.plant, plant.sprite);
    this.free.push({ mesh: plant.mesh, material: plant.material });
  }
}
