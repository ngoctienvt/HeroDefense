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
import { GUST_EXTEND, GUST_HEIGHT, GUST_LIFE, gustAlpha, gustPlaneWidth, gustReach, hitDelay, HIT_SECONDS, hitFrame,
  hitScale, SAND_GUST_URL, THIETPHIEN_ATLAS, type SkillZone } from './visual-thietphien-timeline.js';

const MAX_GUSTS = 4;
const MAX_HITS = 24;
/** Leaves the fan, not her centre. */
const HAND_OFFSET = .6;
/** The gust is drawn this much further than the zone centre so its head crosses the enemies, not stops at them. */
const OVERSHOOT = 1.2;

type Slot = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Gust = { slot: Slot; age: number; from: Vector3; dir: { x: number; z: number }; length: number };
type Puff = { sprite: Sprite; age: number; delay: number };

/**
 * The sand gust (painted strip, head first, waist height under every actor) from her fan through the area,
 * and the blow-back puff on each enemy the server reports, front of the gust first, flung along the throw.
 */
export class ThietphienGust {
  private base: Texture;
  private free: Slot[] = [];
  private created = 0;
  private gusts: Gust[] = [];
  private puffs: Puff[] = [];
  private capLogged = false;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private grit: KitSpray) {
    this.base = new Texture(SAND_GUST_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'thietphien-sand-gust' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'thietphien-sand-gust', message: String(error ?? 'load failed') }));
    this.base.hasAlpha = true;
    this.base.wrapU = this.base.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** One gust per cast: `targets` are the enemies the ability event lists (the server's actual hits). */
  throw(origin: Vector3, zone: SkillZone, targets: readonly Vector3[], reduced: boolean): void {
    if (reduced) return; // still storm + area outline only; no sweeping strips or particles
    const { dir } = zone;
    const offset = HAND_OFFSET;
    const reach = Math.hypot(zone.center.x - origin.x, zone.center.z - origin.z) + OVERSHOOT;
    const slot = this.acquire();
    if (slot) {
      const from = new Vector3(origin.x + dir.x * offset, GUST_HEIGHT, origin.z + dir.z * offset);
      slot.mesh.rotation.y = -Math.atan2(dir.z, dir.x);
      slot.mesh.setEnabled(true);
      this.gusts.push({ slot, age: 0, from, dir, length: Math.max(1.5, reach - offset) });
    }
    const scale = hitScale(targets.length);
    const camera = this.scene.activeCamera;
    const right = camera?.getDirection(Vector3.Right());
    for (const target of targets) {
      if (this.puffs.length >= MAX_HITS) break;
      const sprite = this.flipbooks.spawn(THIETPHIEN_ATLAS.hit, target, scale);
      if (!sprite) break;
      sprite.cellIndex = 0;
      sprite.isVisible = false; // shown once the gust front arrives
      // The painted puff streaks toward screen-right; mirror it when the throw heads screen-left.
      sprite.invertU = right ? dir.x * right.x + dir.z * right.z < 0 : false;
      const along = (target.x - origin.x) * dir.x + (target.z - origin.z) * dir.z;
      this.puffs.push({ sprite, age: 0, delay: hitDelay(along) });
      this.grit.trail(new Vector3(target.x, .8, target.z), new Vector3(dir.x * 3, 1.6, dir.z * 3), 2);
    }
  }

  tick(dt: number): void {
    for (let i = this.gusts.length - 1; i >= 0; i--) {
      const gust = this.gusts[i];
      gust.age += dt;
      if (gust.age >= GUST_LIFE) { this.release(gust.slot); this.gusts.splice(i, 1); continue; }
      this.layout(gust);
    }
    for (let i = this.puffs.length - 1; i >= 0; i--) {
      const puff = this.puffs[i];
      puff.age += dt;
      const age = puff.age - puff.delay;
      if (age >= HIT_SECONDS) { this.flipbooks.release(THIETPHIEN_ATLAS.hit, puff.sprite); this.puffs.splice(i, 1); continue; }
      puff.sprite.isVisible = age >= 0;
      if (age >= 0) puff.sprite.cellIndex = hitFrame(age);
    }
  }

  clear(): void {
    for (const gust of this.gusts) this.release(gust.slot);
    this.gusts.length = 0;
    for (const puff of this.puffs) this.flipbooks.release(THIETPHIEN_ATLAS.hit, puff.sprite);
    this.puffs.length = 0;
    this.capLogged = false;
  }

  private layout(gust: Gust): void {
    const { mesh, material, texture } = gust.slot;
    const reach = Math.max(.02, gustReach(gust.age));
    const shown = gust.length * reach;
    mesh.position.set(gust.from.x + gust.dir.x * shown / 2, GUST_HEIGHT, gust.from.z + gust.dir.z * shown / 2);
    mesh.scaling.set(shown, 1, gustPlaneWidth(gust.length));
    // Right end of the painting (the dense head) always sits at the growing tip.
    texture.uScale = reach;
    texture.uOffset = 1 - reach;
    material.alpha = gustAlpha(gust.age);
    if (gust.age <= GUST_EXTEND + .001) mesh.setEnabled(true);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_GUSTS) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'thietphien-gust' }); }
      return undefined;
    }
    const name = `thietphien-gust-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const texture = this.base.clone();
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.disableDepthWrite = true;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
    mesh.setEnabled(false);
    return { mesh, material, texture };
  }

  private release(slot: Slot): void {
    slot.mesh.setEnabled(false);
    this.free.push(slot);
  }
}
