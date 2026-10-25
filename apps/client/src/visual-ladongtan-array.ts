import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { ATLASES } from './visual-kit-atlas-manifest.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { ARRAY_RING_URL, ARRAY_SPIN, arrayAlpha, arrayExpired, arrayRadius, EMBER_GATE, FLAME_STRETCH, flameAlpha, flameFrame,
  LADONGTAN_ATLAS, MATCH_DISTANCE, STRIKE_RADIUS } from './visual-ladongtan-timeline.js';

/** One array per live strike; cooldown 9 s vs 3 s of fire leaves at most a few, two Lã Động Tân on a four-player board. */
const MAX_ARRAYS = 6;
/** Reduced motion: the flame sprite holds this still frame and the decal neither turns nor sheds embers. */
const STILL_FLAME = 2;
type Ring = { mesh: Mesh; material: StandardMaterial };
type SwordArray = {
  key?: string; at: Vector3; ring: Ring; flame?: Sprite; age: number; sinceMark: number; confirmed: boolean;
  reduced: boolean; lastEmber: number;
};

/**
 * The burning sword array on the ground: the top-down 8-sword decal (the shock wave first, then the array itself,
 * under every actor) and the looping flame-ring flipbook. It lives exactly as long as the server ground effect: the
 * snapshot marks it every frame (`mark`); the first missed frame starts the wither. An impact with no snapshot yet
 * waits briefly for it, so a ground effect the server never created leaves only the shock wave.
 */
export class LadongtanArray {
  private texture: Texture;
  private free: Ring[] = [];
  private created = 0;
  private arrays: SwordArray[] = [];
  private time = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private embers: KitSpray) {
    this.texture = new Texture(ARRAY_RING_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'ladongtan-array-ring' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'ladongtan-array-ring', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** `ability skill-h00D`: the shock wave leaves the impact point and becomes the array once the snapshot confirms it. */
  strike(at: Vector3, reduced: boolean): void {
    this.begin(at, reduced, 0, false);
  }

  /** Snapshot ground effect `id` centred at `at`, every frame it holds. */
  mark(id: string, at: Vector3, reduced: boolean): void {
    let item: SwordArray | undefined = this.arrays.find(a => a.key === id)
      ?? this.arrays.filter(a => !a.confirmed && distanceXZ(a.at, at) <= MATCH_DISTANCE)
        .sort((a, b) => distanceXZ(a.at, at) - distanceXZ(b.at, at))[0];
    // Late join / replay without an ability event: the array just exists, already grown.
    item ??= this.begin(at, reduced, 1, true);
    if (!item) return;
    item.key = id;
    item.confirmed = true;
    item.sinceMark = 0;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (let i = this.arrays.length - 1; i >= 0; i--) {
      const item = this.arrays[i];
      item.age += dt; item.sinceMark += dt;
      if (arrayExpired(item.sinceMark, item.confirmed)) { this.remove(item); this.arrays.splice(i, 1); continue; }
      const size = item.reduced ? STRIKE_RADIUS * 2 : arrayRadius(item.age) * 2;
      item.ring.mesh.scaling.set(size, 1, size);
      item.ring.material.alpha = arrayAlpha(item.age, item.sinceMark, item.confirmed);
      if (!item.reduced) item.ring.mesh.rotation.y -= ARRAY_SPIN * dt;
      if (item.flame) {
        item.flame.cellIndex = item.reduced ? STILL_FLAME : flameFrame(item.age);
        item.flame.color.a = flameAlpha(item.age, item.sinceMark, item.confirmed);
      }
      if (!item.reduced && item.confirmed && time - item.lastEmber >= EMBER_GATE) {
        item.lastEmber = time;
        this.embers.ring(item.at, STRIKE_RADIUS * .85, 2, .1, .4, 2.6);
      }
    }
  }

  clear(): void {
    for (const item of this.arrays) this.remove(item);
    this.arrays.length = 0;
  }

  private begin(at: Vector3, reduced: boolean, age: number, confirmed: boolean): SwordArray | undefined {
    if (this.arrays.length >= MAX_ARRAYS) { debug('visual.kit.pool.cap', { pool: 'ladongtan-array' }); return undefined; }
    const ring = this.free.pop() ?? this.create();
    if (!ring) return undefined;
    ring.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1; // floor decal: every actor draws over it
    ring.mesh.position.set(at.x, .03, at.z);
    ring.mesh.rotation.y = Math.random() * Math.PI * 2;
    ring.mesh.setEnabled(true);
    const flame = this.flipbooks.spawn(LADONGTAN_ATLAS.flame, at, 1);
    if (flame) this.placeFlame(flame, at);
    const item: SwordArray = { at: at.clone(), ring, flame, age, sinceMark: 0, confirmed, reduced, lastEmber: this.time };
    this.arrays.push(item);
    debug('visual.ladongtan.array', { reduced, confirmed, flame: Boolean(flame) });
    return item;
  }

  /** The painted ring is flatter than the camera shows a ground circle: stretch it taller around the same ground anchor. */
  private placeFlame(sprite: Sprite, at: Vector3): void {
    const atlas = ATLASES.get(LADONGTAN_ATLAS.flame);
    if (!atlas) return;
    sprite.width = atlas.ortho;
    sprite.height = atlas.ortho * FLAME_STRETCH;
    sprite.position.set(at.x, at.y + atlas.targetZ * FLAME_STRETCH, at.z);
    sprite.color.a = 0;
  }

  private remove(item: SwordArray): void {
    item.ring.mesh.setEnabled(false);
    this.free.push(item.ring);
    this.flipbooks.release(LADONGTAN_ATLAS.flame, item.flame);
  }

  private create(): Ring | undefined {
    if (this.created >= MAX_ARRAYS) return undefined;
    const name = `ladongtan-array-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // like kitMaterial: the front of the ring must not slice actors' legs
    mesh.material = material;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    return { mesh, material };
  }
}

function distanceXZ(a: Vector3, b: Vector3): number { return Math.hypot(a.x - b.x, a.z - b.z); }
